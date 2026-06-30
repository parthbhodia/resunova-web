-- Featured "Top companies hiring" rail — fast grouped live counts.
--
-- The rail (GET /api/jobs/featured-companies) intersects a curated allowlist
-- (resunova-api/resume_gui/jobs/featured_companies.json) with LIVE active-posting
-- counts. Doing that as one count-query per company is ~90 round-trips per
-- cache-miss; this RPC collapses it to a single grouped query.
--
-- Case-fold dedupe is handled HERE: grouping on lower(company) merges the
-- "Accenture" (517) + "accenture" (248) casing-duplicate rows into one bucket
-- (765). The caller passes ALREADY-LOWERCASED names in p_names.
--
-- Additive + idempotent (CREATE OR REPLACE). Safe to re-run.

create or replace function featured_company_counts(p_names text[])
returns table(company_key text, active_count bigint)
language sql
stable
as $$
  select lower(jp.company) as company_key, count(*)::bigint as active_count
  from job_postings jp
  where jp.is_active
    and lower(jp.company) = any(p_names)
  group by lower(jp.company)
$$;

comment on function featured_company_counts(text[]) is
  'Live active-posting counts for the featured-companies rail, grouped on lower(company) so casing-duplicate rows merge. Caller passes lowercased names.';
