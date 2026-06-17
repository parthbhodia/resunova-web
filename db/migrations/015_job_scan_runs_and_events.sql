-- Migration 015: job scan run history + user job interactions
-- job_scan_runs: one row per /api/jobs/scan execution (admin analytics: jobs
-- added per day, extraction throughput, error visibility). Service-role only.
-- job_post_events: user interactions with feed postings (apply clicks, saves,
-- hides) so the dashboard can report jobs users applied to.
-- Run in Supabase SQL Editor → New query

create table if not exists public.job_scan_runs (
  id                    uuid primary key default gen_random_uuid(),
  started_at            timestamptz not null default now(),
  duration_ms           integer,
  skip_fetch            boolean not null default false,
  companies             integer not null default 0,
  fetched               integer not null default 0,
  upserted              integer not null default 0,
  unchanged_touched     integer not null default 0,
  deactivated           integer not null default 0,
  extracted             integer not null default 0,
  extraction_failures   integer not null default 0,
  errors                jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists job_scan_runs_started_idx
  on public.job_scan_runs (started_at desc);

alter table public.job_scan_runs enable row level security;
-- no policies: service-role only

create table if not exists public.job_post_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  posting_id   uuid not null references public.job_postings (id) on delete cascade,
  event_type   text not null check (event_type in ('apply_click', 'save', 'hide')),
  created_at   timestamptz not null default now()
);

create index if not exists job_post_events_type_created_idx
  on public.job_post_events (event_type, created_at desc);
create index if not exists job_post_events_posting_idx
  on public.job_post_events (posting_id);
create index if not exists job_post_events_user_idx
  on public.job_post_events (user_id);

alter table public.job_post_events enable row level security;

drop policy if exists "users may insert own job events" on public.job_post_events;
create policy "users may insert own job events" on public.job_post_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "users may read own job events" on public.job_post_events;
create policy "users may read own job events" on public.job_post_events
  for select using (auth.uid() = user_id);
