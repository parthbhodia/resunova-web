-- Migration 017: role_family on job_postings for corpus-scale feed pre-filtering
-- At 1,000+ companies / ~75k postings, scoring the "recent 600" surfaces
-- recent-but-irrelevant jobs. The scan stores each posting's role_family
-- (classify_role_family on the JD) so the feed can narrow candidates to the
-- user's family before the deterministic scorer runs.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists role_family text;

-- Partial index: the feed only ever filters active, extracted postings.
create index if not exists job_postings_role_family_idx
  on public.job_postings (role_family, posted_at desc)
  where is_active and requirement_concepts is not null;
