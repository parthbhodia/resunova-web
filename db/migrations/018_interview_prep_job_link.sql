-- Migration 018: Link interview prep sessions to a Jobs-feed posting
-- Run in Supabase SQL Editor → New query
--
-- Lets "Prepare for your interview" on a job card/detail key its prep kit to the
-- exact posting (stable reuse + a "Prep ready" badge) instead of fuzzy
-- company/role/JD-text matching. Nullable, so the standalone prep flow is
-- unaffected. No FK to job_postings on purpose — postings churn/expire, and the
-- prep kit should outlive them (the id is kept as a plain label).

alter table public.interview_prep_sessions
  add column if not exists job_posting_id text;

create index if not exists interview_prep_sessions_user_job_idx
  on public.interview_prep_sessions (user_id, job_posting_id);
