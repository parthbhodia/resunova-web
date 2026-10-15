-- Migration 058: extraction worker identity (host / OS / GPU)
-- job_scan_runs.worker: per-sweep snapshot (hostname, platform, gpu, model…).
-- extraction_worker_heartbeats: live presence so the admin card can show
-- "Mac · Apple Silicon" vs "Windows · RTX 4090" for concurrent extractors.
-- Service-role only (no RLS policies for anon/authenticated).

alter table public.job_scan_runs
  add column if not exists worker jsonb;

create table if not exists public.extraction_worker_heartbeats (
  worker_key      text primary key,
  hostname        text,
  label           text,
  platform        text,
  arch            text,
  gpu             text,
  model           text,
  base_url        text,
  batch           integer,
  pid             integer,
  status          text not null default 'running',
  last_extracted  integer not null default 0,
  last_seen_at    timestamptz not null default now(),
  meta            jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists extraction_worker_heartbeats_seen_idx
  on public.extraction_worker_heartbeats (last_seen_at desc);

alter table public.extraction_worker_heartbeats enable row level security;
-- no policies: service-role only
