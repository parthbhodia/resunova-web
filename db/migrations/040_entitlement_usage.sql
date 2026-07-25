-- Migration 040: entitlement_usage — the single counter behind every quota.
-- Run in Supabase SQL Editor → New query.
--
-- Replaces four separate counters:
--   * COUNT(resume_analyses) rows for the daily free scan quota
--   * user_profiles.interview_prep_scans_today / _reset_at
--   * an in-process dict for the anonymous per-IP scan cap
--   * in-memory sliding windows in routes/cover_letter.py and routes/export.py
--
-- The first of those is the reason this table exists at all. `resume_analyses`
-- is client-writable through RLS — the web calls insertAnalysis() AND
-- deleteAnalysis() directly — so a quota defined as "count today's rows" could
-- be reset by deleting today's history, and was silently over-charged by any
-- client-direct insert (a version promote, a Boost use-resume) that wasn't a
-- scan at all. A counter the browser cannot reach fixes both directions.
--
-- SERVICE-ONLY: RLS is enabled with ZERO policies, exactly like
-- billing_subscriptions in 039_billing.sql. Clients learn their remaining quota
-- from GET /api/scan-limit-status, never by reading this table.

create table if not exists public.entitlement_usage (
  subject       text        not null,   -- "user:<uuid>" | "ip:<sha256[:32]>"
  action        text        not null,   -- resume_scan | resume_export | ...
  period_start  timestamptz not null,   -- start of day/week/month, UTC
  count         integer     not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (subject, action, period_start)
);

-- The primary key already serves the (subject, action, period_start) point read
-- that every check() performs. This second index serves retention sweeps only.
create index if not exists entitlement_usage_period_idx
  on public.entitlement_usage (period_start);

alter table public.entitlement_usage enable row level security;
-- Deliberately NO policies. Service role bypasses RLS; everyone else gets nothing.

comment on table public.entitlement_usage is
  'Quota counters. Service-role only (RLS on, zero policies) — must not be '
  'client-writable: the counter it replaces was, and deleting history reset it.';

-- ── atomic increment ────────────────────────────────────────────────────────
-- This MUST be a single statement rather than a read-modify-write in Python.
-- N concurrent requests against a quota of N-1 would otherwise each read the
-- same count and each decide they are under the cap. ON CONFLICT DO UPDATE
-- serialises them on the primary key, which is what makes the limit real.

create or replace function public.increment_usage(
  p_subject      text,
  p_action       text,
  p_period_start timestamptz
) returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.entitlement_usage (subject, action, period_start, count, updated_at)
  values (p_subject, p_action, p_period_start, 1, now())
  on conflict (subject, action, period_start) do update
    set count = public.entitlement_usage.count + 1,
        updated_at = now()
  returning count;
$$;

-- No browser role may move its own counter. REVOKE FROM public strips the
-- implicit grant every role inherits — including service_role — so the backend's
-- own access has to be re-granted explicitly or the RPC 403s in production.
revoke all on function public.increment_usage(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.increment_usage(text, text, timestamptz) to service_role;

-- ── verifying this function (read before concluding it's broken) ────────────
-- Calling it N times inside ONE statement returns 1 every time and leaves
-- count = 1, e.g.:
--     select increment_usage('s','a',now()) from generate_series(1,50);   -- count = 1
-- That is a property of the test, not the function. All 50 executions share the
-- statement's snapshot, so none can see the row the others inserted.
-- PostgREST delivers each RPC as its own statement, so use a plpgsql loop (each
-- iteration bumps the command counter) or separate requests to test it honestly:
--     do $$ begin for i in 1..50 loop
--       perform increment_usage('s','a',now()); end loop; end $$;         -- count = 50
-- Verified against production 2026-07-25: 50 → 50, and counters isolate
-- correctly per action and per period_start.

-- ── retention ───────────────────────────────────────────────────────────────
-- Rows are only ever read for the CURRENT period, so anything older is dead
-- weight. Schedule if pg_cron is available; harmless to run by hand otherwise.
--   delete from public.entitlement_usage where period_start < now() - interval '90 days';
