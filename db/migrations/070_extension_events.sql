-- Migration 070: usage counts from the Chrome extension
--
-- Written ONLY for people who pressed "Accept" on the extension's welcome page.
-- The API (POST /api/extension/events) keeps a fixed list of event names and, for
-- each, a fixed list of properties that are enums, bounded integers or booleans.
-- There is no free-text property, so this table cannot hold an address, a host
-- name, a page title, a form label or value, a question, a company or any profile
-- content, whatever a client sends. See services/extension_events.py.
--
-- Rows are tied to the account so usage can be told apart per person (one user
-- filling twice is not two users) and are deleted with the account.
--
-- Retention: none enforced yet. Suggested ceiling 400 days; add a pg_cron purge
-- on occurred_at when volume warrants it.
--
-- Service-role only: the extension talks to the API, never to this table.
--
-- Run in Supabase SQL Editor -> New query. Safe to re-run.

create table if not exists public.extension_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  props        jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object'),
  ext_version  text not null default '' check (char_length(ext_version) <= 24),
  occurred_at  timestamptz not null,
  received_at  timestamptz not null default now()
);

-- "How many people used X this week" and "what did one account do" are the two reads.
create index if not exists extension_events_name_time_idx
  on public.extension_events (name, occurred_at desc);
create index if not exists extension_events_user_time_idx
  on public.extension_events (user_id, occurred_at desc);

alter table public.extension_events enable row level security;

revoke all on public.extension_events from anon, authenticated;
grant select, insert, update, delete on public.extension_events to service_role;
grant usage, select on sequence public.extension_events_id_seq to service_role;

comment on table public.extension_events is
  'Consented usage counts from the extension. Enum/int/bool properties only; no urls, hosts, labels, values or profile content.';
