-- Expanded JD-extracted facets for the jobs feed filters (the qwen re-extract).
-- Every column is additive, nullable, and IF NOT EXISTS so this is safe to re-run
-- and safe to deploy before the backfill. security_clearance + requires_us_citizenship
-- were already added directly to prod (no committed migration); re-asserted here so
-- the schema is reproducible from migrations alone.

alter table public.job_postings
  add column if not exists security_clearance      text,     -- none|confidential|secret|top_secret|ts_sci|public_trust
  add column if not exists requires_us_citizenship boolean,
  add column if not exists education_level         text,     -- none|high_school|associate|bachelor|master|doctorate
  add column if not exists travel_required         text,     -- none|occasional|frequent
  add column if not exists relocation_offered      boolean,
  add column if not exists equity_offered          boolean,
  add column if not exists languages               text[];   -- human languages required, e.g. {Spanish}

-- Partial indexes: only the discriminating rows, scoped to the active feed.
create index if not exists job_postings_clearance_idx
  on public.job_postings (security_clearance)
  where is_active and security_clearance is not null;

create index if not exists job_postings_citizenship_idx
  on public.job_postings (requires_us_citizenship)
  where is_active and requires_us_citizenship is true;

create index if not exists job_postings_education_idx
  on public.job_postings (education_level)
  where is_active and education_level is not null;

create index if not exists job_postings_languages_gin
  on public.job_postings using gin (languages)
  where is_active;
