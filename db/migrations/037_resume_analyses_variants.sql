-- Migration 037: résumé variant identity (named parallel profiles)
-- Applied-direct to prod (project eiumlptnsmowvkxucprl); this file is the
-- schema-of-record. Run in Supabase SQL Editor for a from-scratch build.
--
-- Variants are a CONTENT axis (parallel, independently-editable profiles —
-- "Default", "Judi Health") layered above the existing version LINEAGE (a time
-- axis: parent_id/version/root_id from migration 034). Full design in
-- docs/RESUME_VARIANTS_PLAN.md.
--
-- `variant_group` / `variant_name` are written once at INSERT and never
-- mutated afterward — resume_analyses has no UPDATE RLS policy (INSERT/
-- SELECT/DELETE only; see migration 034's comment), so anything that needs to
-- change later (which variant is "default", a renamed display label) MUST
-- live somewhere mutable instead. That's user_profiles, not this table — see
-- below. NULL on both columns = legacy/no-variant row; the read layer
-- coalesces all NULL rows for a user into one implicit default variant, so no
-- backfill is required.

alter table public.resume_analyses
  add column if not exists variant_group uuid,
  add column if not exists variant_name  text;

create index if not exists resume_analyses_variant_idx
  on public.resume_analyses (user_id, variant_group, variant_name, created_at desc);

-- The mutable "which variant is currently default" pointer + per-user variant
-- rename overrides. Both live on user_profiles (full CRUD RLS, including
-- UPDATE — the same table/pattern migration 036's tailoring_mode already
-- uses) instead of on resume_analyses, precisely because they need to change
-- after the row that first used a variant name was written.
--   default_variant_name  — NULL = the implicit "Default" variant (today's
--                            only behavior). Jobs/Boost rank against whichever
--                            variant this names.
--   variant_display_names — jsonb map { original_variant_name: display_name },
--                            applied at read time so "rename" never requires
--                            rewriting historical resume_analyses rows.
alter table public.user_profiles
  add column if not exists default_variant_name text,
  add column if not exists variant_display_names jsonb not null default '{}'::jsonb;
