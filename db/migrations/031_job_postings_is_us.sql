-- Migration 031: job_postings.is_us — backend flag for the FRONTEND US filter.
--
-- Classified at ingest from the free-text `location` via the scanner's
-- resume_gui/jobs/us_location.py (US-first precedence, word-boundaried):
--   true  = US      (state name, ", ST" abbrev, United States/USA)
--   false = non-US  (foreign country / city / region)
--   NULL  = ambiguous/unknown (bare "Remote", "N Locations", "", unrecognized)
--
-- The frontend US toggle filters on this: `WHERE is_us` (strict US) or
-- `WHERE is_us IS NOT false` (US + ambiguous "Remote"). The scanner stores ALL
-- locations (no hard drop) — US selection is a query-time filter, not an intake gate.
--
-- Applied directly to prod (Supabase eiumlptnsmowvkxucprl) 2026-06-30 and backfilled
-- via scope_us_backfill.py (groups distinct locations, classifies, bulk-sets is_us).
alter table public.job_postings add column if not exists is_us boolean;

-- Partial index for the common "active US jobs, newest first" feed query.
create index if not exists job_postings_us_active_posted_idx
  on public.job_postings (posted_at desc nulls last)
  where is_active and is_us;
