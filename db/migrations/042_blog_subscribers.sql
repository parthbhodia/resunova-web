-- Migration 042: blog email subscribers.
--
-- Same shape as 037_blog_engagement.sql: RLS enabled with NO client-facing
-- policies, and one SECURITY DEFINER function as the only door in. That matters
-- more here than it did for view counts — this table is a list of email
-- addresses, so a direct-select grant to `anon` would be a mailing-list leak.
-- There is deliberately no read function: nothing in the web app ever needs to
-- enumerate subscribers, so the client cannot.
--
-- ⚠️ SINGLE OPT-IN, AND NOTHING MAILS THIS LIST YET. `subscribe_to_blog` is
-- callable by `anon`, which means anyone can enter anyone else's address. That
-- is acceptable only while no mail is sent: there is no email-bombing vector if
-- subscribing produces no email. BEFORE the first send, add a confirmation step
-- (write `confirmed_at` from a tokened link and mail only confirmed rows) —
-- otherwise this becomes a way to sign a stranger up for mail they never asked
-- for. `unsubscribed_at` ships now rather than later because an opt-out is
-- legally required the moment sending starts, and adding a column to a live
-- table with real rows is a worse migration than adding it empty.
--
-- Run in Supabase SQL Editor -> New query (this repo's migrations are applied
-- manually against the live "Resume Builder" project, eiumlptnsmowvkxucprl;
-- see db/migrations/037_blog_engagement.sql for the same convention).

create table if not exists public.blog_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  -- Which surface the address came from: a post slug, or 'index' for the blog
  -- index. Attribution is the whole reason to collect it — "which post earns
  -- subscribers" is the only question that changes what we publish next.
  source          text,
  -- Set when a signed-in reader subscribes. Nullable because the entire point
  -- is capturing readers who are NOT signed in yet.
  user_id         uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  confirmed_at    timestamptz,
  unsubscribed_at timestamptz
);

create index if not exists blog_subscribers_source_idx on public.blog_subscribers (source);

alter table public.blog_subscribers enable row level security;

-- Public: subscribe an address. Idempotent — a repeat subscribe succeeds and
-- changes nothing.
--
-- Returns void rather than "were you already on the list?" on purpose: a
-- boolean that distinguishes new from existing turns this endpoint into an
-- email-enumeration oracle (call it with a guessed address, learn whether that
-- person is a subscriber). The UI says "you're on the list" either way.
create or replace function public.subscribe_to_blog(p_email text, p_source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  -- Deliberately permissive, and deliberately not RFC 5322: the goal is to
  -- reject obvious junk ('', 'asdf', a pasted sentence) before it reaches the
  -- table, not to adjudicate exotic-but-legal addresses. An over-strict pattern
  -- silently drops real subscribers, which is the more expensive mistake.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  if length(v_email) > 320 then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  insert into public.blog_subscribers (email, source, user_id)
  values (v_email, nullif(btrim(coalesce(p_source, '')), ''), auth.uid())
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.subscribe_to_blog(text, text) from public;
grant execute on function public.subscribe_to_blog(text, text) to anon, authenticated;
