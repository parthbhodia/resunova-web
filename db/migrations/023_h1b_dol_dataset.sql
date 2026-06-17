-- Migration 023: DOL H-1B LCA dataset + fuzzy company matching
-- Layers company-level H-1B history (sponsorship + real offered-wage benchmarks)
-- from the public DOL LCA Disclosure Data on top of the JD-level visa_sponsorship
-- we already extract. Loaded by ingest_h1b_lca.py (parses the DOL .xlsx) and
-- joined to postings by match_h1b_to_postings.py (pg_trgm fuzzy name match).
-- Run in Supabase SQL Editor → New query (or applied via the pooler by the scripts).

create extension if not exists pg_trgm;

create table if not exists public.h1b_employer_summary (
  employer_norm text primary key,   -- normalized name (lowercased, legal-form stripped)
  employer_raw  text,               -- a representative raw DOL employer name
  fiscal_year   int,
  total_apps    int,
  certified     int,
  denied        int,
  wage_p25      numeric,            -- annualized offered-wage percentiles
  wage_median   numeric,
  wage_p75      numeric,
  updated_at    timestamptz default now()
);

-- Trigram index for fuzzy matching posting.company → DOL employer name.
create index if not exists h1b_employer_norm_trgm
  on public.h1b_employer_summary using gin (employer_norm gin_trgm_ops);

-- Precomputed best-match result stored on each posting so the feed/detail
-- endpoints read columns instead of fuzzy-querying per request.
alter table public.job_postings
  add column if not exists h1b_sponsor          boolean,
  add column if not exists h1b_certified_count  int,
  add column if not exists h1b_median_wage      numeric,
  add column if not exists h1b_employer_matched text,
  add column if not exists h1b_match_score      numeric;
