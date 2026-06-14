-- Migration 019: partial index for the extraction-pending query
-- At corpus scale (~200k postings) the extraction sweep's
-- "WHERE is_active AND requirement_concepts IS NULL ORDER BY posted_at DESC"
-- query had no supporting index (017's role_family index is partial on
-- requirement_concepts IS NOT NULL — the opposite set), so it scanned past
-- tens of thousands of already-extracted rows and hit the statement timeout,
-- silently returning 0 pending and stalling the feed. This partial index
-- covers exactly the pending set the scan claims from.
-- Run in Supabase SQL Editor → New query

create index if not exists job_postings_pending_extract_idx
  on public.job_postings (posted_at desc nulls last)
  where is_active and requirement_concepts is null;
