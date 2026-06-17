-- Migration 018: user job-application tracker (full lifecycle)
-- Personal application CRM: a user tracks jobs through Saved → Applied →
-- Interviewing → Offer/Rejected, with notes. posting_id is optional + the
-- company/title/url are denormalized so (a) tracked rows survive posting
-- churn (ON DELETE SET NULL) and (b) users can track off-platform jobs they
-- found elsewhere. Advisors read cohort activity via the service-role backend
-- (RLS below only governs the owning user; service role bypasses it).
-- Run in Supabase SQL Editor → New query

create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  posting_id   uuid references public.job_postings (id) on delete set null,
  company      text not null default '',
  title        text not null default '',
  url          text,
  location     text,
  source       text not null default 'feed' check (source in ('feed', 'manual')),
  status       text not null default 'applied'
               check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  notes        text,
  applied_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One tracker row per (user, posting); manual rows (null posting_id) are exempt.
create unique index if not exists job_applications_user_posting_idx
  on public.job_applications (user_id, posting_id)
  where posting_id is not null;

create index if not exists job_applications_user_status_idx
  on public.job_applications (user_id, status, updated_at desc);

alter table public.job_applications enable row level security;

drop policy if exists "users manage own applications" on public.job_applications;
create policy "users manage own applications" on public.job_applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
