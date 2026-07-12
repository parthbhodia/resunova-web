-- Migration 035: score provenance on resume_analyses versions
-- Applied-direct to prod (project eiumlptnsmowvkxucprl) on 2026-07-10; this file
-- is the schema-of-record. Run in Supabase SQL Editor for a from-scratch build.
--
-- Marks WHERE a version's score came from, so the version-lineage history can be
-- honest about which numbers are LLM-verified vs deterministic estimates:
--   null       = original analysis / fresh scan (LLM)
--   'llm'      = verified re-score ("Update score", a full LLM pass) — set by the
--                backend api_analyze_rescore when it chains a child version
--   'estimate' = deterministic save-edits estimate — set by web createAnalysisVersion

alter table public.resume_analyses
  add column if not exists score_source text;
