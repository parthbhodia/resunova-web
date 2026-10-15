-- 036 was never applied on production, so /profile got a 404 from PostgREST.
-- Same table as 036, with grants so the signed-in role can see it.

create table if not exists public.user_extracted_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_extracted_profiles_updated_idx
  on public.user_extracted_profiles (updated_at desc);

alter table public.user_extracted_profiles enable row level security;

drop policy if exists "users read own extracted profile" on public.user_extracted_profiles;
create policy "users read own extracted profile"
  on public.user_extracted_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own extracted profile" on public.user_extracted_profiles;
create policy "users insert own extracted profile"
  on public.user_extracted_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own extracted profile" on public.user_extracted_profiles;
create policy "users update own extracted profile"
  on public.user_extracted_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own extracted profile" on public.user_extracted_profiles;
create policy "users delete own extracted profile"
  on public.user_extracted_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_extracted_profiles to authenticated, service_role;
