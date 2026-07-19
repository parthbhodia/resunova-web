-- Migration 036: user_extracted_profiles (career-profile dashboard data)
-- Run in Supabase SQL Editor if `user_extracted_profiles` does not exist yet.
--
-- Backs the `/profile` career-profile dashboard (résumé upload + AI extraction
-- + edit -> name/headline/summary/skills/experience/education/projects). This
-- is a DELIBERATELY SEPARATE table from `user_profiles` (003_user_profiles.sql),
-- which stores Tailor defaults + EEO fields (`ProfileFormState`) under the
-- `?view=profile` route. Both are keyed on `user_id`; sharing one table/column
-- would mean saving one silently overwrites the other on upsert.

create table if not exists user_extracted_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_extracted_profiles_updated_idx on user_extracted_profiles (updated_at desc);

alter table user_extracted_profiles enable row level security;

create policy "users read own extracted profile" on user_extracted_profiles
  for select using (auth.uid() = user_id);

create policy "users insert own extracted profile" on user_extracted_profiles
  for insert with check (auth.uid() = user_id);

create policy "users update own extracted profile" on user_extracted_profiles
  for update using (auth.uid() = user_id);

create policy "users delete own extracted profile" on user_extracted_profiles
  for delete using (auth.uid() = user_id);
