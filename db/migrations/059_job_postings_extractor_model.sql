-- Migration 059: record WHICH model extracted each posting's requirement_concepts
--
-- The feed's weighted match score renormalizes over non-empty importance
-- buckets, and those bucket distributions differ per extractor. Measured on one
-- JD/resume pair: the same inputs scored 29 under one extractor and 67 under
-- another. So a corpus half-written by two models does not rank slightly wrong
-- — it ranks its two halves against each other on incompatible scales.
--
-- Before this column, nothing recorded which model produced a row, so the only
-- safe remedy after a cutover was re-extracting the ENTIRE corpus. With it, the
-- re-extract set is a query:
--
--   select count(*) from job_postings
--    where requirement_concepts is not null
--      and (extractor_model  is distinct from '<new-model>'
--        or extractor_prompt is distinct from '<new-prompt>');
--
-- NULL is deliberately left unbackfilled and means "extracted before provenance
-- was recorded", i.e. unknown. IS DISTINCT FROM includes NULL, so unknowns land
-- in the re-extract set by construction — which is the correct default, since an
-- unverified row should be redone rather than assumed good.
--
-- Values are the EXTRACT_LLM_MODEL in force at write time (e.g. 'llama3.1:8b'),
-- or the sentinel 'fallback-chain' when no dedicated model was configured and
-- the qwen -> Grok -> Gemini chain was reachable. The sentinel exists because
-- naming a guessed leg would silently exclude rows that need redoing.
--
-- ⚠️ HOW TO APPLY — THE SQL EDITOR CANNOT RUN ALL OF THIS IN ONE PASTE.
--
-- STEP 1 (Supabase SQL Editor → New query): everything above the STEP 2 fence.
-- STEP 2 (optional, and NOT in the SQL Editor): the index at the bottom.
--
-- Why they must be separate: the editor wraps the whole buffer in a
-- transaction, and `create index concurrently` is refused inside one
-- (SQLSTATE 25001: cannot run inside a transaction block). Splitting the paste
-- into two statements does not help — both are still in the same transaction.
--
-- ⚠️ AND `lock_timeout` IS NOT OPTIONAL WHILE EXTRACTION WORKERS ARE RUNNING.
-- `add column` needs ACCESS EXCLUSIVE. The change itself is catalog-only and
-- takes milliseconds, but ACQUIRING the lock waits behind any in-flight
-- statement on job_postings — and while it waits, every query arriving after it
-- QUEUES BEHIND IT, reads included. That is how a millisecond DDL stalls a whole
-- table. The timeout makes it fail fast and retryable instead of piling up.

set lock_timeout = '3s';

alter table public.job_postings
  add column if not exists extractor_model  text,
  add column if not exists extractor_prompt text;

reset lock_timeout;

comment on column public.job_postings.extractor_model is
  'Model that wrote requirement_concepts (EXTRACT_LLM_MODEL at write time, or '
  '''fallback-chain'' when undetermined). NULL = extracted before provenance was '
  'recorded. Never mix extractors in one ranked corpus — bucket distributions differ.';

comment on column public.job_postings.extractor_prompt is
  'Fingerprint of the prompt+schema that shaped requirement_concepts (sha256 of '
  'the rendered template + char cap + JSON schema, 12 hex chars), or the '
  'EXTRACT_PROMPT_VERSION override. NULL = recorded before provenance existed. '
  'The prompt decides importance buckets too, so a prompt edit splits the corpus '
  'exactly as a model swap does.';

-- ===========================================================================
-- STEP 2 — OPTIONAL, and deliberately so. Do NOT paste this in the SQL Editor.
-- ===========================================================================
--
-- ⚠️ THIS INDEX IS A CONVENIENCE, NOT A REQUIREMENT. The only query these
-- columns exist to serve is an occasional ops count ("which extracted rows did
-- not come from <model>"), run once around a cutover — not a request path. A
-- sequential scan answers it fine. Skipping this costs nothing a user can feel,
-- so if STEP 1 is applied you are done.
--
-- Run it only from a client that is NOT inside a transaction — psql, or any
-- connection with autocommit on:
--
--   psql "$DATABASE_URL" -c "create index concurrently if not exists
--     job_postings_extractor_model_idx on public.job_postings
--     (extractor_model, extractor_prompt) where requirement_concepts is not null;"
--
-- ⚠️ Use CONCURRENTLY and nothing else. A plain `create index` takes a SHARE
-- lock, which BLOCKS every write to job_postings for the whole build — and the
-- extraction workers are doing nothing but writing to it. CONCURRENTLY trades
-- speed for that: it can leave an INVALID index if it fails, so check with
-- `\d job_postings` and drop-and-retry if you see one.
