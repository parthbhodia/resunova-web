-- Ranked-feed recency indexes (fix the "Load failed" statement timeout).
--
-- GET /api/jobs/feed's ranked path (_query_postings) selects recent active rows
-- ordered by `posted_at DESC NULLS LAST`, enriched OR not (it does NOT filter
-- requirement_concepts). Every existing posted_at index either ordered DESC
-- NULLS FIRST (012's job_postings_active_posted_idx) or was partial on
-- requirement_concepts IS NOT NULL (027 browse-recent, 017 role_family) — so the
-- ranked feed matched none of them and fell back to a full top-N sort over
-- 13k–60k rows (≈190ms scoped / ≈560ms broadened, and timing out under load).
--
-- These two partial indexes match the ranked query's ORDER BY exactly so it
-- index-scans + stops at LIMIT with no sort (verified: 190ms→68ms scoped,
-- 561ms→84ms broadened). Partial on is_active only (NOT requirement_concepts) so
-- they cover the lazy "show un-enriched too" model. CONCURRENTLY so the live
-- extraction drain isn't blocked during the build.

create index concurrently if not exists job_postings_active_posteddesc_nl_idx
  on public.job_postings (posted_at desc nulls last)
  where is_active;

create index concurrently if not exists job_postings_rolefamily_posteddesc_nl_idx
  on public.job_postings (role_family, posted_at desc nulls last)
  where is_active;
