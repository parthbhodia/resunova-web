-- Migration 026: jd_hash — decouple re-extraction from metadata changes.
-- content_hash covers title/location/salary/posted_at/jd_text, so a metadata-only
-- change (salary bump, posted_at refresh) rewrote the row AND reset
-- requirement_concepts → a wasteful full re-extraction even though requirements
-- didn't change. That waste is what pushed the daily re-extraction load past the
-- local GPU's ~10k/day capacity. jd_hash hashes ONLY the JD text; the scan now
-- resets requirement_concepts solely when jd_hash changes, so metadata updates
-- still persist (via content_hash) but don't trigger re-extraction. Self-heals:
-- a NULL stored jd_hash (row predates this column) is never treated as "changed".
-- Run in Supabase SQL Editor → New query

alter table public.job_postings add column if not exists jd_hash text;
