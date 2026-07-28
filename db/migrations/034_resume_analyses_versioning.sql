-- Migration 034: version lineage for resume_analyses (append-only, git-like)
-- Applied-direct to prod (project eiumlptnsmowvkxucprl) on 2026-07-10; this file
-- is the schema-of-record. Run in Supabase SQL Editor for a from-scratch build.
--
-- Saving preview edits inserts an immutable CHILD version instead of mutating the
-- row (resume_analyses has no UPDATE RLS policy, so in-place edits are impossible
-- anyway — only INSERT/SELECT/DELETE own rows). parent_id chains a version to the
-- one it was edited from; root_id groups every version of one résumé; version is
-- the ordinal (v1, v2, ...).

alter table public.resume_analyses
  add column if not exists parent_id uuid references public.resume_analyses(id) on delete set null,
  add column if not exists version   int  not null default 1,
  add column if not exists root_id   uuid;

-- Existing rows: each is its own root, v1.
update public.resume_analyses set root_id = id where root_id is null;

-- Guarantee root_id is always populated: a fresh top-level analysis roots itself.
create or replace function public.resume_analyses_set_root()
  returns trigger language plpgsql as $$
begin
  if new.root_id is null then new.root_id := new.id; end if;
  return new;
end $$;

drop trigger if exists resume_analyses_set_root_biu on public.resume_analyses;
create trigger resume_analyses_set_root_biu
  before insert on public.resume_analyses
  for each row execute function public.resume_analyses_set_root();

-- Lineage lookups: all versions of one résumé for a user, in order.
create index if not exists resume_analyses_root_idx
  on public.resume_analyses (user_id, root_id, version);
