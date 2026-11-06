-- Migration 069: cache of the requirements extracted from a job posting's text
--
-- The Chrome extension's job-page panel shows "N of M requirements found". The
-- only paid step is turning the posting's prose into a requirement list (one
-- model call). This table remembers the result so a posting is extracted once,
-- however many people look at it and however often they ask.
--
-- What it holds, and what it deliberately does not:
--   * jd_hash   sha256 of the posting text (case and spacing folded), truncated.
--   * concepts  the extracted requirements: name, aliases, type, importance.
--   * NO user, NO url, NO company, NO copy of the page text. A requirement list
--     is a function of the text alone, so sharing it between people reveals
--     nothing the text did not already say, and the table cannot answer "who
--     looked at which job".
--
-- Service-role only, like the other extension tables: the browser never reads it.
--
-- Run in Supabase SQL Editor -> New query. Safe to re-run.

create table if not exists public.extension_jd_cache (
  jd_hash      text primary key check (char_length(jd_hash) between 16 and 64),
  concepts     jsonb not null check (jsonb_typeof(concepts) = 'array'),
  extractor    text not null default '',
  word_count   integer not null default 0 check (word_count >= 0),
  created_at   timestamptz not null default now()
);

alter table public.extension_jd_cache enable row level security;

revoke all on public.extension_jd_cache from anon, authenticated;
grant select, insert, update, delete on public.extension_jd_cache to service_role;

comment on table public.extension_jd_cache is
  'Requirement lists extracted from posting text, keyed by a hash of the text. Holds no user, url or page copy.';
