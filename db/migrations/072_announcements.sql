-- Migration 072: announcements an admin writes in the dashboard, shown to every
-- signed-in user in the notification bell and as the one-time toast.
--
-- Until now the bell read a list in the web code (lib/productNotices.ts
-- PRODUCT_NOTICES), so announcing anything was a deploy. This table moves the
-- text into the database; what each person has dismissed still lives in
-- user_profiles.dismissed_notices (migration 047), under the id
-- 'announcement:<uuid>'.
--
-- WHO CAN DO WHAT, and why it is shaped this way:
--   * READ  — any signed-in user, but only rows that are live right now
--             (started, not ended). A scheduled or ended row is invisible to
--             them, so the schedule is enforced here and not in the client.
--   * WRITE — nobody through the Supabase client. There is deliberately NO
--             insert/update/delete policy and no table privilege for
--             `authenticated`: the admin dashboard writes through
--             resunova-api (/api/admin/announcements), which checks the
--             caller is a global admin and then uses the service role. A
--             client-writable announcements table is a way for any signed-in
--             user to put text in front of every other user.
--   * anon  — nothing. The bell only exists for a signed-in session.
--
-- ⚠️ href IS AN IN-APP PATH ONLY. The web app hands it to router.push(), which
-- will navigate to an absolute URL, so an announcement whose link is
-- 'https://somewhere-else' would send every reader off the site. The checks
-- below, resunova-api's validator and the web client each reject it
-- independently; if you change the rule, change all three and their tests.
--
-- "Ending" an announcement sets ends_at; nothing is deleted, so there is a
-- record of what was shown and when. ends_at >= starts_at (not >) because a
-- scheduled announcement that is cancelled before it starts is ended at its
-- own start time, which makes it never live.
--
-- APPLY: Supabase SQL Editor → New query. Transaction-safe; safe to re-run.

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  href        text not null,
  cta         text not null default 'Open',
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),

  constraint announcements_title_len check (char_length(btrim(title)) between 1 and 80),
  constraint announcements_body_len  check (char_length(btrim(body))  between 1 and 400),
  constraint announcements_cta_len   check (char_length(btrim(cta))   between 1 and 24),
  constraint announcements_window    check (ends_at is null or ends_at >= starts_at),

  -- In-app path only: starts with one slash, no protocol-relative '//', no
  -- backslash (some browsers treat '/\' like '//'), no whitespace or control
  -- characters, and a sane length.
  constraint announcements_href_in_app check (
    href like '/%'
    and href not like '//%'
    and position(E'\\' in href) = 0
    and href !~ '[[:space:]]'
    and href !~ '[[:cntrl:]]'
    and char_length(href) <= 200
  )
);

comment on table public.announcements is
  'Admin-written in-app announcements shown in the notification bell. Clients may read live rows only; writes go through resunova-api (service role). Schema-of-record: resunova-web db/migrations/072_announcements.sql';

alter table public.announcements enable row level security;

-- Supabase grants table privileges to anon/authenticated by default, so remove
-- them explicitly and hand back only what the bell needs.
revoke all on public.announcements from public, anon, authenticated;
grant select on public.announcements to authenticated;

drop policy if exists announcements_read_live on public.announcements;
create policy announcements_read_live on public.announcements
  for select to authenticated
  using (starts_at <= now() and (ends_at is null or now() < ends_at));
