-- Migration 060: notification outbox — the seam between "it happened" and
--                "they were told".
--
-- WHY AN OUTBOX AND NOT A TRIGGER THAT SENDS.
-- The referral feature is 100% client-direct Supabase + RLS; the API has never
-- heard of it, so there is no server request to hang a fire-and-forget email
-- off the way every other email in this product works. The tempting fix is a
-- trigger calling Resend through pg_net. ⚠️ That loses the send on any
-- transient failure: pg_net does not retry, and its responses live in
-- `net._http_response` for ~6 hours before garbage collection, so a failure
-- older than that is unrecoverable knowledge — and nobody reads that table. A
-- referral notification that can silently not-happen defeats the feature,
-- because the referrer never learns and the candidate waits forever.
--
-- So: the trigger writes a DURABLE row inside the same transaction, and a
-- drain outside it does the sending, with retries and a permanent record.
--
-- ⚠️ `channel` IS HERE ON DAY ONE even though only 'email' is used. With it,
-- Web Push later is a second channel on the same rows, inheriting dedupe,
-- retry, prefs and the failure record. Without it, adding push means redoing
-- this.
--
-- APPLY: Supabase SQL Editor → New query. All of this is transaction-safe
-- (no CREATE INDEX CONCURRENTLY — see migration 059 for that trap).

-- ── 1. The outbox ────────────────────────────────────────────────────────────

create table if not exists public.notification_outbox (
  id            uuid primary key default gen_random_uuid(),
  -- ⚠️ THE WHOLE OF IDEMPOTENCY. A status can go reviewing → declined →
  -- reviewing, and supabase-style re-emits are a fact of life; without a key
  -- the same news is sent twice. 'ask:<id>' / 'status:<id>:<status>'.
  dedupe_key    text not null unique,
  channel       text not null default 'email' check (channel in ('email', 'web_push')),
  kind          text not null check (kind in ('referral_ask', 'referral_status')),
  -- Who should hear about it. Resolved to an address by the drain, which can
  -- read auth.users; a client never can.
  recipient_user_id uuid references auth.users (id) on delete cascade,
  recipient_email   text,
  -- Everything the template needs, snapshotted. ⚠️ Snapshotted rather than
  -- joined at send time, because the row it describes may have changed status
  -- again by then and the notice must describe the step it was queued FOR.
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'pending'
                  check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts      integer not null default 0,
  last_error    text,
  -- Lease, so two drains never send the same row. Mirrors claim_extraction_batch.
  claimed_at    timestamptz,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- The drain's only query: oldest pending first.
create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where status = 'pending';

alter table public.notification_outbox enable row level security;
-- ⚠️ NO POLICIES, DELIBERATELY. This table holds other people's email
-- addresses. service_role bypasses RLS; anon and authenticated get nothing.
revoke all on public.notification_outbox from anon, authenticated;

-- ── 2. The claim, parallel-safe ──────────────────────────────────────────────

create or replace function public.claim_notification_batch(p_limit integer default 20)
returns setof public.notification_outbox
language sql
security definer
set search_path = public
as $$
  update public.notification_outbox o
     set status = 'pending', claimed_at = now(), attempts = o.attempts + 1
   where o.id in (
     select id from public.notification_outbox
      where status = 'pending'
        -- A row claimed but not finished within 15 minutes is presumed dropped
        -- (deploy, crash) and becomes claimable again. Attempts still rises, so
        -- a row that keeps dying still hits the cap rather than looping forever.
        and (claimed_at is null or claimed_at < now() - interval '15 minutes')
        and attempts < 5
      order by created_at
      limit greatest(1, least(coalesce(p_limit, 20), 100))
      for update skip locked
   )
  returning o.*;
$$;

revoke all on function public.claim_notification_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(integer) to service_role;

-- ── 3. The trigger ───────────────────────────────────────────────────────────

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
begin
  select * into v_referrer from public.company_referrers where id = new.referrer_id;

  if tg_op = 'INSERT' then
    -- An ask: tell the referrer, who owns the desk.
    v_kind := 'referral_ask';
    v_key  := 'ask:' || new.id::text;
    v_recipient := v_referrer.user_id;
    v_email := null;                      -- drain resolves from auth.users
  else
    -- A status change: tell the candidate.
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
      'request_id',    new.id,
      'status',        new.status,
      'role',          coalesce(new.role, ''),
      'notes',         coalesce(new.notes, ''),
      'candidate_name', coalesce(new.candidate_name, ''),
      'referrer_name', coalesce(v_referrer.display_name, ''),
      'company',       coalesce(v_referrer.company, '')
    )
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists company_referral_requests_notify on public.company_referral_requests;
-- ⚠️ `update of status`, NOT a bare `update`. The status-only guard trigger
-- (migration 057) stamps updated_at on every accepted update, so a bare AFTER
-- UPDATE would queue a notification for a nudge.
create trigger company_referral_requests_notify
  after insert or update of status on public.company_referral_requests
  for each row execute function public.queue_referral_notification();

-- ── 4. The preference ────────────────────────────────────────────────────────
--
-- ⚠️ THE DEFAULT DECIDES WHETHER THIS FEATURE WORKS AT ALL. 78 of 92 users have
-- no `user_profiles` row, so `_DEFAULT_NOTIFY` in services/email_triggers.py is
-- the setting for ~85% of people. `referrals` defaults TRUE there: a referral
-- ask is a direct person-to-person request the recipient opted into by
-- publishing a desk, not marketing. Nothing is added to the column here —
-- a missing key reads as the default, and backfilling would freeze today's
-- choice onto rows whose owners never made it.
