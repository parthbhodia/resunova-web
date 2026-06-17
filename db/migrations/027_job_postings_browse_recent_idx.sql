-- Migration 027: partial index for the newest-enriched feed fallback queries
--
-- Two code paths run the same shape against ~165k rows:
--   1. the signed-in no-résumé "browse by role" fallback (sparse/general family)
--   2. the résumé-ranked feed's broaden-to-recent fallback (_query_postings(None))
-- both:
--   WHERE is_active AND requirement_concepts IS NOT NULL
--   ORDER BY posted_at DESC NULLS LAST
--   LIMIT N
--
-- The 012 index is (is_active, posted_at desc): a DESC btree defaults to NULLS
-- FIRST, which does NOT match the query's NULLS LAST ordering, so Postgres sorts
-- the whole active set and trips the statement timeout at corpus scale (the same
-- failure class migration 019 fixed for the extraction-pending query). This
-- partial index matches the fallback query exactly, so it's an index scan with
-- no sort. The role-scoped (non-fallback) query is already covered by 017's
-- (role_family, posted_at desc) WHERE is_active AND requirement_concepts IS NOT NULL.
--
-- Run in Supabase SQL Editor → New query (jobs DB). Uses CONCURRENTLY so the
-- build doesn't take an exclusive lock against the live extraction worker's
-- writes — CONCURRENTLY must run OUTSIDE a transaction (the SQL Editor is fine;
-- if applying via a script, do not wrap it in BEGIN/COMMIT).

create index concurrently if not exists job_postings_browse_recent_idx
  on public.job_postings (posted_at desc nulls last)
  where is_active and requirement_concepts is not null;
