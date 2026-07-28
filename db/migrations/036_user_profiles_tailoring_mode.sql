-- Tailoring intensity for LLM rewrites (Tailor gap-fix + Jobs Boost).
--
-- 'honest'      — rewrites need an honest, transferable bridge to the JD gap
--                 (the default, and today's only behavior).
-- 'aggressive'  — rewrites mirror JD terminology closely and prefer coverage;
--                 the anti-fabrication floor in the API is identical either way.
-- NULL          — the user has never chosen: the web app shows a one-time
--                 explainer modal on first Tailor/Boost use, then persists here.
--
-- Read/written client-side via Supabase (RLS: own row) and sent per-request as
-- `tailoring_mode` to /api/suggest-gap-fix and /api/jobs/boost. Idempotent.

alter table user_profiles
  add column if not exists tailoring_mode text
  check (tailoring_mode is null or tailoring_mode in ('honest', 'aggressive'));
