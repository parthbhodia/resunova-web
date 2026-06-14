-- Migration 016: allow 'workday' as a job_postings source
-- Workday powers most large-enterprise career sites
-- ({tenant}.wd{N}.myworkdayjobs.com). The provider applies a new-grad lens
-- (server-side searchText) so the feed surfaces early-career roles for the
-- student/new-grad audience rather than the full 2,000-job enterprise board.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  drop constraint if exists job_postings_source_check;

alter table public.job_postings
  add constraint job_postings_source_check
  check (source in ('greenhouse', 'ashby', 'lever', 'jibe', 'workday'));
