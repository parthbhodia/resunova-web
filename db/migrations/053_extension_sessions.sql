-- Migration 053: Chrome extension auth (one-time codes + revocable sessions)
--
-- The extension used to receive the raw Supabase access + refresh tokens
-- through a `resunova-extension-auth` CustomEvent on /extension/connect. Any
-- script on that page can listen for a window CustomEvent, so the browser
-- session was readable by page JS — not something a Web Store listing can
-- defend. This replaces it with a two-step exchange:
--
--   1. signed-in web page  -> POST /api/extension/connect-code  (Supabase JWT)
--      -> a 2-minute, single-use code (only its sha256 is stored)
--   2. extension           -> POST /api/extension/exchange      (the code)
--      -> a 30-day session token (only its sha256 is stored), revocable
--
-- No new profile data lives here. The extension reads the existing
-- `user_profiles` (Tailor defaults + EEO) and `user_extracted_profiles`
-- (resume-derived career profile), both already keyed on user_id.
--
-- Run in Supabase SQL Editor -> New query. Safe to re-run.

-- ── one-time connect codes ───────────────────────────────────────────────────
create table if not exists public.extension_auth_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  user_email  text not null default '',
  code_hash   text not null unique,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Exchange looks a code up by hash on the unconsumed, unexpired set only.
create index if not exists extension_auth_codes_lookup_idx
  on public.extension_auth_codes (code_hash)
  where consumed_at is null;

-- Supports the handler's opportunistic cleanup of dead rows.
create index if not exists extension_auth_codes_expiry_idx
  on public.extension_auth_codes (expires_at);

-- ── revocable extension sessions ────────────────────────────────────────────
create table if not exists public.extension_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  user_email    text not null default '',
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Every authenticated read is token_hash + revoked_at + expires_at.
create index if not exists extension_sessions_lookup_idx
  on public.extension_sessions (token_hash)
  where revoked_at is null;

create index if not exists extension_sessions_user_idx
  on public.extension_sessions (user_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Both tables are service-role only. The browser NEVER touches them: it holds
-- a Supabase session (not a table grant), and the extension holds a session
-- token that only this backend can resolve. Enabling RLS without any
-- `authenticated` policy makes that structural rather than a convention —
-- even a leaked anon key cannot enumerate another user's codes or sessions.
alter table public.extension_auth_codes enable row level security;
alter table public.extension_sessions enable row level security;

revoke all on public.extension_auth_codes from anon, authenticated;
revoke all on public.extension_sessions from anon, authenticated;
grant select, insert, update, delete on public.extension_auth_codes to service_role;
grant select, insert, update, delete on public.extension_sessions to service_role;
