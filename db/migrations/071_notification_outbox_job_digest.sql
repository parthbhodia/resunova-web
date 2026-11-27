-- Migration 071: let the notification outbox carry the daily job digest.
--
-- The digest (resunova-api services/job_digest.py) is planned on a GitHub
-- runner after "Daily job discovery" finishes and queued here as one row per
-- user per UTC day; the existing drain (migration 067's pg_cron ping →
-- /api/notifications/drain on Railway) sends it.
--
-- ⚠️ THE ONLY SCHEMA CHANGE IS THE `kind` CHECK. 066 allowed exactly
-- ('referral_ask', 'referral_status'), so an insert with kind = 'job_digest'
-- fails with 23514 until this runs. Nothing else is needed:
--   * "at most one email per user per day" is the existing UNIQUE(dedupe_key),
--     keyed 'job_digest:<user_id>:<YYYY-MM-DD>' and inserted ON CONFLICT DO
--     NOTHING, so reruns queue nothing new;
--   * the opt-in lives in user_profiles.notify_prefs.jobDigest (jsonb, no DDL)
--     and is re-checked by the drain at send time.
--
-- The index below serves the runner's two reads: "what did this user already
-- get in the last 14 days" (so a posting is never sent twice) and "is today's
-- row already queued".
--
-- APPLY: Supabase SQL Editor → New query. Transaction-safe; safe to re-run.

alter table public.notification_outbox
  drop constraint if exists notification_outbox_kind_check;

alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in ('referral_ask', 'referral_status', 'job_digest'));

create index if not exists notification_outbox_kind_recipient_created_idx
  on public.notification_outbox (kind, recipient_user_id, created_at desc);

-- Verify:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'notification_outbox_kind_check';
--   select status, count(*) from public.notification_outbox
--    where kind = 'job_digest' group by 1;
