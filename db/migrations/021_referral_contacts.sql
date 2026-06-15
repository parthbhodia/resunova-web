-- Migration 021: referral-outreach tracker ("Find an insider").
-- A user records the people they're reaching out to for a referral at a
-- company and tracks each contact through To contact → Contacted → Responded
-- → Referred / Declined. posting_id is optional + company is denormalized so
-- (a) rows survive posting churn (ON DELETE SET NULL) and (b) users can track
-- contacts for off-platform jobs. RLS is owner-only, mirroring job_applications.
--
-- HONESTY NOTE: v1 has no automatic insider discovery — there is no
-- authenticated connections graph (LinkedIn is scrape-only). Rows are
-- user-created. Auto-suggesting insiders (alumni/cohort match, recruiter
-- lookup) is phase 2 and would write into this same table with source != 'manual'.
-- Run in Supabase SQL Editor → New query

create table if not exists public.referral_contacts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  posting_id     uuid references public.job_postings (id) on delete set null,
  company        text not null default '',
  contact_name   text not null default '',
  contact_title  text,
  contact_url    text,                       -- LinkedIn / profile link
  relationship   text not null default 'other'
                 check (relationship in ('alumni', 'colleague', 'recruiter', 'mutual', 'other')),
  source         text not null default 'manual'
                 check (source in ('manual', 'suggested')),
  status         text not null default 'to_contact'
                 check (status in ('to_contact', 'contacted', 'responded', 'referred', 'declined')),
  notes          text,
  contacted_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists referral_contacts_user_status_idx
  on public.referral_contacts (user_id, status, updated_at desc);

-- Fast lookup of a user's contacts for one posting (the Job detail panel).
create index if not exists referral_contacts_user_posting_idx
  on public.referral_contacts (user_id, posting_id)
  where posting_id is not null;

alter table public.referral_contacts enable row level security;

drop policy if exists "users manage own referral contacts" on public.referral_contacts;
create policy "users manage own referral contacts" on public.referral_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
