-- Migration 050: record WHICH model extracted each posting's requirement_concepts
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
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists extractor_model  text,
  add column if not exists extractor_prompt text;

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

-- Partial index on the extracted rows only: the one query this column exists to
-- serve is "which extracted rows did NOT come from <model>", and the ~unextracted
-- backlog is irrelevant to it.
create index concurrently if not exists job_postings_extractor_model_idx
  on public.job_postings (extractor_model, extractor_prompt)
  where requirement_concepts is not null;
