-- Migration 037: resume_versions — the unified, EDITABLE résumé object (Phase 1
-- of the résumé-versions plan, docs/RESUME_VERSIONS_PLAN.md).
--
-- Run in Supabase SQL Editor if `resume_versions` does not exist yet.
--
-- WHY A NEW TABLE (not extend resume_analyses): resume_analyses is an immutable,
-- append-only SCAN LOG — it has no UPDATE RLS by design and every row assumes a
-- score exists. A "version" must be editable and must exist BEFORE any scan. So
-- resume_versions owns editing; resume_analyses stays the honest, append-only
-- record it already is. A scan links back to the version it scored via the new
-- resume_analyses.version_id column added at the bottom of this file.
--
-- Lineage columns mirror resume_analyses (migration 034): parent_id chains a
-- version to the one it was edited from, root_id groups every version of one
-- résumé, version is the ordinal (v1, v2, …). RLS mirrors 036 but INCLUDES
-- UPDATE (this is the editable table). Owner-only on all four verbs.

create table if not exists public.resume_versions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null default 'Untitled résumé',

  -- git-like lineage (same shape as resume_analyses 034)
  root_id       uuid,                                       -- groups all versions of one résumé
  parent_id     uuid references public.resume_versions(id) on delete set null,
  version       int  not null default 1,                    -- ordinal within a root (v1, v2, …)

  -- the résumé itself (what the WYSIWYG editor reads/writes)
  structured     jsonb not null default '{}'::jsonb,        -- StructuredResume / ResumeDocModel
  extracted_text text,                                      -- synthesized flat text for scoring

  -- provenance + per-version JD context (Phase 2 tailoring writes jd_*)
  origin         text not null default 'upload',            -- upload|duplicate|profile|tailor|manual
  source_pdf_url text,
  jd_text        text,
  jd_company     text,
  jd_title       text,

  -- cached for the list view; real/authoritative scores live in resume_analyses
  last_score        int,
  last_score_source text,                                   -- llm|estimate|null
  is_default        boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- root_id self-populates on insert (copied verbatim from resume_analyses 034),
-- so a fresh top-level version roots itself.
create or replace function public.resume_versions_set_root()
  returns trigger language plpgsql as $$
begin
  if new.root_id is null then new.root_id := new.id; end if;
  return new;
end $$;

drop trigger if exists resume_versions_set_root_biu on public.resume_versions;
create trigger resume_versions_set_root_biu
  before insert on public.resume_versions
  for each row execute function public.resume_versions_set_root();

-- keep updated_at fresh on edits
create or replace function public.resume_versions_touch_updated()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists resume_versions_touch_updated_bu on public.resume_versions;
create trigger resume_versions_touch_updated_bu
  before update on public.resume_versions
  for each row execute function public.resume_versions_touch_updated();

-- lineage lookups (all versions of one résumé, in order) + library list order
create index if not exists resume_versions_root_idx
  on public.resume_versions (user_id, root_id, version);
create index if not exists resume_versions_user_updated_idx
  on public.resume_versions (user_id, updated_at desc);

alter table public.resume_versions enable row level security;

drop policy if exists "users read own resume versions" on public.resume_versions;
create policy "users read own resume versions" on public.resume_versions
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own resume versions" on public.resume_versions;
create policy "users insert own resume versions" on public.resume_versions
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own resume versions" on public.resume_versions;
create policy "users update own resume versions" on public.resume_versions
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own resume versions" on public.resume_versions;
create policy "users delete own resume versions" on public.resume_versions
  for delete using (auth.uid() = user_id);

-- Link each scan back to the version it scored (0..N analyses per version).
-- Nullable + ON DELETE SET NULL so existing analyses (pre-versions) stay valid
-- and deleting a version never destroys its immutable scan history.
alter table public.resume_analyses
  add column if not exists version_id uuid
  references public.resume_versions(id) on delete set null;

create index if not exists resume_analyses_version_idx
  on public.resume_analyses (version_id);
