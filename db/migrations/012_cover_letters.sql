-- Migration 012: cloud-saved Cover Letter Builder drafts
-- Run in Supabase SQL Editor → New query
-- Mirrors 011_template_builder_resumes.sql conventions exactly.

create table if not exists public.cover_letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text not null default 'Untitled Cover Letter',
  data        jsonb not null default '{}'::jsonb,   -- CLData: recipient, author, content, customization
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fast lookup: user's letters newest-first
create index if not exists cover_letters_user_updated_idx
  on public.cover_letters (user_id, updated_at desc);

-- At most one "default" letter per user (same partial-unique pattern as resumes)
create unique index if not exists cover_letters_one_default_per_user_uidx
  on public.cover_letters (user_id)
  where is_default = true;

alter table public.cover_letters enable row level security;

drop policy if exists "users read own cover letters" on public.cover_letters;
create policy "users read own cover letters" on public.cover_letters
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own cover letters" on public.cover_letters;
create policy "users insert own cover letters" on public.cover_letters
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own cover letters" on public.cover_letters;
create policy "users update own cover letters" on public.cover_letters
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own cover letters" on public.cover_letters;
create policy "users delete own cover letters" on public.cover_letters
  for delete using (auth.uid() = user_id);
