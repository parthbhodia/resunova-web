-- Migration 067 (numbered 061 until main took 059-064 for referrals): fire the drain from the database, not from GitHub Actions.
--
-- ⚠️ THIS REPLACES A GITHUB ACTIONS CRON, AND THE REASON IS LATENCY. GitHub's
-- scheduler is best-effort and drifts badly under load — this project has
-- measured a 5h52m delay on an 08:30 job. A referral email that can arrive five
-- hours late is one nobody acts on. `pg_cron` runs inside Postgres on time, and
-- is ALREADY ENABLED here (admin_job_market.sql uses it for the daily MV
-- refresh), so this adds a schedule rather than a dependency.
--
-- Two callers, ONE function, which is the point: the trigger pings it the
-- instant a referral happens (seconds), and cron sweeps it every five minutes
-- to catch anything the ping lost. Neither is the other's fallback in code —
-- they are the same call from two clocks.
--
-- ⚠️ pg_net IS ASYNCHRONOUS. `net.http_post` enqueues and returns a request id;
-- a background worker performs the call. It cannot block or fail the referral
-- the user just submitted, which is what makes it safe to call from a trigger.
-- What it cannot do is RETRY — which is exactly why the outbox row (migration
-- 066) is written first and the drain is what actually sends.
--
-- APPLY AFTER 066. Supabase SQL Editor → New query.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── 1. Where the URL and secret live ─────────────────────────────────────────
--
-- ⚠️ VAULT, NOT A TABLE. The drain secret is a credential; Vault keeps it
-- encrypted at rest and out of `pg_dump` output. Run these two ONCE with your
-- real values, then they never appear in SQL again:
--
--   select vault.create_secret('https://<api-host>/api/notifications/drain',
--                              'notifications_drain_url');
--   select vault.create_secret('<the same value as NOTIFICATIONS_DRAIN_SECRET '
--                              'on the API host>', 'notifications_drain_secret');
--
-- To rotate later: `select vault.update_secret(id, '<new>')` on the row in
-- `vault.secrets`, and change the Railway env var to match. ⚠️ Both sides or
-- neither — a mismatch is a silent 403 and the queue just stops draining.

-- ── 2. The one call both schedulers make ─────────────────────────────────────

create or replace function public.ping_notification_drain()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'notifications_drain_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'notifications_drain_secret';

  -- ⚠️ Unconfigured is a NO-OP, not an error. This is called from a trigger on
  -- the referral write: raising here would fail the user's ask over a missing
  -- deployment setting, which is never the right trade.
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'X-Notifications-Secret', v_secret),
    -- ⚠️ NO PAYLOAD WORTH TRUSTING — just "go drain". The API re-reads the
    -- outbox with service-role and decides what to send. An endpoint that took
    -- a recipient and a body from its caller would be an open relay.
    body    := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
end;
$$;

revoke all on function public.ping_notification_drain() from public, anon, authenticated;
grant execute on function public.ping_notification_drain() to service_role;

-- ── 3. The instant path: the trigger pings after queueing ────────────────────
--
-- `create or replace` so this is safe to run whether or not 066's version is
-- already installed. The body is 066's, with the ping appended.

create or replace function public.queue_referral_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer   public.company_referrers%rowtype;
  v_key        text;
  v_kind       text;
  v_recipient  uuid;
  v_email      text;
  v_queued     boolean := false;
begin
  select * into v_referrer from public.company_referrers where id = new.referrer_id;

  if tg_op = 'INSERT' then
    v_kind := 'referral_ask';
    v_key  := 'ask:' || new.id::text;
    v_recipient := v_referrer.user_id;
    v_email := null;
  else
    if new.status is not distinct from old.status then
      return new;
    end if;
    if new.status not in ('reviewing', 'referred', 'declined') then
      return new;
    end if;
    v_kind := 'referral_status';
    v_key  := 'status:' || new.id::text || ':' || new.status;
    v_recipient := new.candidate_user_id;
    v_email := nullif(btrim(new.candidate_email), '');
  end if;

  insert into public.notification_outbox
    (dedupe_key, kind, recipient_user_id, recipient_email, payload)
  values (
    v_key, v_kind, v_recipient, v_email,
    jsonb_build_object(
      'request_id',     new.id,
      'status',         new.status,
      'role',           coalesce(new.role, ''),
      'notes',          coalesce(new.notes, ''),
      'candidate_name', coalesce(new.candidate_name, ''),
      'referrer_name',  coalesce(v_referrer.display_name, ''),
      'company',        coalesce(v_referrer.company, '')
    )
  )
  on conflict (dedupe_key) do nothing;

  -- ⚠️ Only ping when a row was actually queued. ON CONFLICT DO NOTHING means a
  -- duplicate queues nothing, and waking the drain for it is a wasted HTTP call
  -- on every re-emit.
  get diagnostics v_queued = row_count;
  if v_queued then
    perform public.ping_notification_drain();
  end if;

  return new;
end;
$$;

-- ── 4. The sweep: catches anything the ping lost ─────────────────────────────

select cron.unschedule('notification-drain')
 where exists (select 1 from cron.job where jobname = 'notification-drain');

select cron.schedule(
  'notification-drain',
  '*/5 * * * *',
  $$ select public.ping_notification_drain(); $$
);

-- Verify:
--   select jobname, schedule, active from cron.job where jobname = 'notification-drain';
--   select status, count(*) from public.notification_outbox group by 1;
--   -- pg_net's own view of recent calls (garbage-collected after ~6h):
--   select status_code, count(*) from net._http_response group by 1;
