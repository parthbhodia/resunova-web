-- Migration 024: extra JD facets for the jobs-feed filter bar.
-- employment_type / industry / min_years_experience are pulled by the same
-- single JD-extraction LLM call (jd_extractor._parse_facts) — null when the JD
-- doesn't state them, so a re-extraction sweep backfills them without a second
-- call. Powers the Job type / Industry / Years-of-experience facets.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists employment_type      text,   -- full_time|part_time|contract|internship|temporary
  add column if not exists industry             text,   -- short label, e.g. "Fintech", "Healthcare", "AI"
  add column if not exists min_years_experience int;     -- minimum years required (null = unstated)

-- Feed filters scan these; partial indexes keep the common "stated" lookups cheap.
create index if not exists job_postings_employment_type_idx
  on public.job_postings (employment_type) where employment_type is not null;
create index if not exists job_postings_min_years_idx
  on public.job_postings (min_years_experience) where min_years_experience is not null;
