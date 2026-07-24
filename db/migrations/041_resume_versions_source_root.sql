-- 041: resume_versions.source_root_id — deterministic reverse lookup from an
-- analyses lineage (resume_analyses.root_id) to the ONE editable version the
-- report's edit-at-score flow maintains for it (M2, eng-review finding 2B).
-- The /api/analyze-link-version stamp on resume_analyses.version_id remains the
-- scan-history bridge; this column is the version-side anchor that survives
-- link failures and makes save idempotent (no duplicate roots).

alter table public.resume_versions
  add column if not exists source_root_id uuid;

-- Re-entry lookup runs on every signed-in report load (finding 8A).
create index if not exists resume_versions_user_source_root_idx
  on public.resume_versions (user_id, source_root_id);
