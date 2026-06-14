-- Migration 013: content_hash on job_postings for skip-unchanged scans
-- The daily scan hashes title/location/salary/posted_at/jd_text per posting and
-- skips the full-row upsert when the stored hash matches (avoids rewriting the
-- TOASTed jd_text on every scan); unchanged rows get a bulk last_seen_at touch.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists content_hash text;
