-- In-app notices: dismissible feature announcements, and the timestamp a
-- referrer last opened their referral inbox. The web app also keeps a
-- localStorage copy so a missing column does not block the UI.
--
-- Referral toasts use Supabase Realtime when this table is in the publication,
-- and a 60s poll either way. Apply in the Supabase SQL editor.

alter table public.user_profiles
  add column if not exists dismissed_notices jsonb not null default '[]'::jsonb,
  add column if not exists last_seen_referral_at timestamptz;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'company_referral_requests'
     )
  then
    alter publication supabase_realtime add table public.company_referral_requests;
  end if;
end $$;
