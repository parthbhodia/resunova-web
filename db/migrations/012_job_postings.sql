-- Migration 012: Job postings ingested from ATS feed (Greenhouse, Ashby, Lever)
-- Stores job board postings with cached LLM-extracted requirement concepts for deterministic scoring.
-- Postings are shared public-ish data within the app; writes happen via service-role key (RLS bypass).
-- Run in Supabase SQL Editor → New query

create table if not exists public.job_postings (
  id                    uuid primary key default gen_random_uuid(),
  source                text not null check (source in ('greenhouse', 'ashby', 'lever')),
  company               text not null,
  company_slug          text not null,
  external_url          text not null,
  title                 text not null,
  location              text not null default '',
  salary_min            numeric,
  salary_max            numeric,
  salary_currency       text,
  posted_at             timestamptz,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  is_active             boolean not null default true,
  jd_text               text,
  requirement_concepts  jsonb,
  created_at            timestamptz not null default now()
);

create unique index if not exists job_postings_external_url_idx
  on public.job_postings (external_url);

create index if not exists job_postings_active_posted_idx
  on public.job_postings (is_active, posted_at desc);

create index if not exists job_postings_company_slug_idx
  on public.job_postings (company_slug);

alter table public.job_postings enable row level security;

drop policy if exists "authenticated users may read job postings" on public.job_postings;
create policy "authenticated users may read job postings" on public.job_postings
  for select using (auth.role() = 'authenticated');
