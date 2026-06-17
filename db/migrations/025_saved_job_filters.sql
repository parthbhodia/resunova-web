-- Migration 025: saved job-feed filter sets ("Your Saved Filters").
-- A user names and stores a filter configuration (work model, level, type,
-- industry, years, score, age, search, sort) as an opaque JSON blob the Jobs
-- page reads back and re-applies. RLS owner-only, mirroring referral_contacts /
-- job_applications. The `filters` shape is owned by the frontend — the backend
-- just persists/serves it.
-- Run in Supabase SQL Editor → New query

create table if not exists public.saved_job_filters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Saved filter',
  filters     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists saved_job_filters_user_idx
  on public.saved_job_filters (user_id, updated_at desc);

alter table public.saved_job_filters enable row level security;

drop policy if exists "users manage own saved filters" on public.saved_job_filters;
create policy "users manage own saved filters" on public.saved_job_filters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
