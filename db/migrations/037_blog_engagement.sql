-- Migration 037: blog post views + likes.
--
-- Two tables, both RLS-enabled with NO client-facing policies — every read and
-- write goes through a SECURITY DEFINER function below. This means:
--   * anon/authenticated roles cannot SELECT/INSERT/UPDATE/DELETE the tables
--     directly, even if RLS is misconfigured later; the function is the only
--     door in.
--   * view counting stays public (anon may call record_blog_view / read via
--     get_blog_engagement).
--   * liking is enforced server-side, not just hidden in the UI: EXECUTE on
--     toggle_blog_like is granted to `authenticated` only, so a signed-out
--     caller gets a Postgres permission error, not just a disabled button.
--
-- Run in Supabase SQL Editor -> New query (this repo's migrations are applied
-- manually against the live "Resume Builder" project, eiumlptnsmowvkxucprl;
-- see db/migrations/025_saved_job_filters.sql for the same convention).

create table if not exists public.blog_post_views (
  slug        text primary key,
  view_count  bigint not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.blog_post_views enable row level security;

create table if not exists public.blog_post_likes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (slug, user_id)
);

create index if not exists blog_post_likes_slug_idx on public.blog_post_likes (slug);

alter table public.blog_post_likes enable row level security;

-- Public: record a view. Anonymous callers included (no auth check) — the
-- write is a plain increment, nothing user-identifying is stored.
create or replace function public.record_blog_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  insert into public.blog_post_views (slug, view_count, updated_at)
  values (p_slug, 1, now())
  on conflict (slug) do update
    set view_count = public.blog_post_views.view_count + 1,
        updated_at = now()
  returning view_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.record_blog_view(text) from public;
grant execute on function public.record_blog_view(text) to anon, authenticated;

-- Public: read view_count, like_count, and (for a signed-in caller) whether
-- they've already liked this post.
create or replace function public.get_blog_engagement(p_slug text)
returns table (view_count bigint, like_count bigint, liked_by_me boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce((select v.view_count from public.blog_post_views v where v.slug = p_slug), 0),
    (select count(*) from public.blog_post_likes l where l.slug = p_slug),
    exists (
      select 1 from public.blog_post_likes l
      where l.slug = p_slug and l.user_id = auth.uid()
    );
end;
$$;

revoke all on function public.get_blog_engagement(text) from public;
grant execute on function public.get_blog_engagement(text) to anon, authenticated;

-- Authenticated only: toggle the caller's own like. Signed-out callers get a
-- Postgres permission error (no EXECUTE grant to anon), not a silent no-op.
create or replace function public.toggle_blog_like(p_slug text)
returns table (liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.blog_post_likes where slug = p_slug and user_id = v_uid) then
    delete from public.blog_post_likes where slug = p_slug and user_id = v_uid;
    v_liked := false;
  else
    insert into public.blog_post_likes (slug, user_id) values (p_slug, v_uid);
    v_liked := true;
  end if;

  return query
  select v_liked, (select count(*) from public.blog_post_likes l where l.slug = p_slug);
end;
$$;

revoke all on function public.toggle_blog_like(text) from public;
grant execute on function public.toggle_blog_like(text) to authenticated;
