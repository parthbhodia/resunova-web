-- Migration 059: referral rewards, shared by the employee desk and invites.
--
-- Three things land here:
--
--   1. `referral_reward_ledger` — one Pro-day ledger for every referral reward,
--      whichever program paid it. Written only by the triggers below, read only
--      by resunova-api, which is the only thing that can actually extend a
--      subscription: billing_subscriptions has zero RLS policies (039) and a
--      subscription period cannot be moved from a browser.
--   2. A candidate-reported outcome, which is what earns the interview reward.
--      The existing status-only trigger (045/048) rejects any column change
--      other than `status`, so it is redefined here to let the candidate record
--      an outcome and nobody else.
--   3. `referral_notify_queue`, an outbox for "someone asked you". Any visitor
--      can insert a request including anonymously, so the send cannot be driven
--      by the form. The backend drains this and decides whether to send.
--
-- HLD: docs/REFERRAL_REWARDS_HLD.md. Desk: docs/COMPANY_REFERRER_HLD.md.
-- Apply in the Supabase SQL editor on the prod Resume Builder project.

-- ── 1. Candidate-reported outcome ──────────────────────────────────────────
-- What happened after the referral. `interview` and `offer` both mean it
-- worked, so both earn the interview reward; `closed` records the honest
-- outcome and earns nothing.
alter table public.company_referral_requests
  add column if not exists candidate_outcome text
    check (candidate_outcome is null or candidate_outcome in ('interview', 'offer', 'closed')),
  add column if not exists candidate_outcome_at timestamptz;

-- Status-only, plus one exception for the candidate.
--
-- The identity check is not optional. The referrer HAS an update policy on this
-- table (044) and is the party the 10-day reward pays, so without
-- `auth.uid() = candidate_user_id` an employee could set candidate_outcome on
-- their own request and award themselves Pro days. The function is invoker
-- security, so auth.uid() here is the caller, not the table owner.
--
-- The packet columns are now pinned too. They were only ever written on insert,
-- so pinning them costs nothing and closes a hole where the referrer could
-- rewrite a candidate's snapshot after reading it. The nudge columns stay off
-- this list on purpose: nudge_referral_request updates them, and it would
-- start raising here.
create or replace function public.company_referral_requests_status_only()
returns trigger
language plpgsql
as $$
begin
  if new.referrer_id is distinct from old.referrer_id
    or new.candidate_user_id is distinct from old.candidate_user_id
    or new.candidate_name is distinct from old.candidate_name
    or new.candidate_email is distinct from old.candidate_email
    or new.candidate_linkedin is distinct from old.candidate_linkedin
    or new.resume_pdf_path is distinct from old.resume_pdf_path
    or new.candidate_phone is distinct from old.candidate_phone
    or new.candidate_years_experience is distinct from old.candidate_years_experience
    or new.candidate_headline is distinct from old.candidate_headline
    or new.role is distinct from old.role
    or new.notes is distinct from old.notes
    or new.source is distinct from old.source
  then
    raise exception 'Only status can be updated on referral requests';
  end if;

  if new.candidate_outcome is distinct from old.candidate_outcome
    or new.candidate_outcome_at is distinct from old.candidate_outcome_at
  then
    if auth.uid() is null
      or new.candidate_user_id is null
      or new.candidate_user_id is distinct from auth.uid()
    then
      raise exception 'Only the candidate can report an outcome';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- SECURITY DEFINER because the candidate has no UPDATE policy at all: the RLS
-- grant runs the other way, to the referrer. Same shape as nudge_referral_request.
create or replace function public.report_referral_outcome(request_id uuid, outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.company_referral_requests%rowtype;
begin
  select * into row
  from public.company_referral_requests
  where id = request_id;
  if not found then
    raise exception 'request not found';
  end if;
  if row.candidate_user_id is distinct from auth.uid() then
    raise exception 'not your request';
  end if;
  -- Reporting an outcome on a request that was never submitted would award days
  -- for a referral that did not happen.
  if row.status is distinct from 'referred' then
    raise exception 'you can only report an outcome once you are referred';
  end if;
  -- One report per request. The ledger's unique index also blocks a second
  -- award, but failing here gives the candidate a real message instead of a
  -- silent no-op on their update.
  if row.candidate_outcome is not null then
    raise exception 'you already reported an outcome';
  end if;
  if outcome not in ('interview', 'offer', 'closed') then
    raise exception 'unknown outcome';
  end if;
  update public.company_referral_requests
  set candidate_outcome = outcome,
      candidate_outcome_at = now()
  where id = request_id;
end;
$$;

-- ── 2. The ledger ──────────────────────────────────────────────────────────
-- One row per award, per event. `pending` means the trigger recorded it and the
-- backend has not extended the subscription yet; the UI shows those days rather
-- than hiding them, because a reward that silently never arrives costs more
-- trust than a day of delay does.
create table if not exists public.referral_reward_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  source      text not null check (source in ('desk_referral', 'invite')),
  kind        text not null check (kind in ('referred', 'interview', 'invite_signup', 'invite_activated')),
  days        integer not null check (days > 0 and days <= 365),
  request_id  uuid references public.company_referral_requests (id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'granted', 'revoked')),
  created_at  timestamptz not null default now(),
  granted_at  timestamptz,
  revoked_at  timestamptz,
  expires_at  timestamptz
);

create index if not exists referral_reward_ledger_user_idx
  on public.referral_reward_ledger (user_id, created_at desc);

-- One award per (user, kind, request). Note this is NOT unique on request_id
-- alone: a single referral legitimately earns both the referred award and the
-- interview award, and collapsing them would silently drop 10 of the 13 days.
create unique index if not exists referral_reward_ledger_idempotent_idx
  on public.referral_reward_ledger (user_id, kind, request_id)
  where request_id is not null;

-- Invites have no request_id, so they are keyed by invitee instead: one award
-- per invitee per kind.
alter table public.referral_reward_ledger
  add column if not exists invitee_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists referral_reward_ledger_invite_idempotent_idx
  on public.referral_reward_ledger (user_id, kind, invitee_user_id)
  where source = 'invite';

alter table public.referral_reward_ledger enable row level security;
-- Deliberately NO policies: service-role only, the same shape as
-- billing_subscriptions (039). The client reads rewards through
-- GET /api/referral/rewards, never by querying this table.

-- Awards are earned on outcomes, never on the ask. A reward for "someone asked
-- me" buys drive-by asks and pays the desk for volume it did not create.
create or replace function public.company_referral_requests_award_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_user_id uuid;
  award_kind text := null;
  award_days integer := 0;
begin
  if tg_op = 'UPDATE' and new.referrer_id is not distinct from old.referrer_id then
    if new.status = 'referred' and old.status is distinct from 'referred' then
      award_kind := 'referred';
      award_days := 3;
    elsif old.candidate_outcome is null
      and new.candidate_outcome in ('interview', 'offer')
    then
      award_kind := 'interview';
      award_days := 10;
    end if;
  end if;

  if award_kind is null then
    return null;
  end if;

  select r.user_id into referrer_user_id
  from public.company_referrers r
  where r.id = new.referrer_id;

  if referrer_user_id is null then
    return null;
  end if;

  insert into public.referral_reward_ledger (user_id, source, kind, days, request_id)
  values (referrer_user_id, 'desk_referral', award_kind, award_days, new.id)
  on conflict do nothing;

  return null;
end;
$$;

drop trigger if exists company_referral_requests_award_reward on public.company_referral_requests;
create trigger company_referral_requests_award_reward
  after update on public.company_referral_requests
  for each row execute function public.company_referral_requests_award_reward();

-- ── 3. Notify outbox ───────────────────────────────────────────────────────
-- The insert is written by whoever asked, including an anonymous visitor, so
-- Resunova cannot send from the form. The trigger records the event and the
-- backend decides whether to send.
--
-- The opt-in is NOT read here. Email preferences live in user_profiles
-- .notify_prefs behind /api/profile/notify-prefs, which is backend-owned, and
-- gating at send time means a preference that changes takes effect on the next
-- ask instead of stranding rows in a queue nobody drains.
create table if not exists public.referral_notify_queue (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.company_referral_requests (id) on delete cascade,
  referrer_id uuid not null references public.company_referrers (id) on delete cascade,
  kind        text not null default 'new_ask' check (kind in ('new_ask', 'nudge', 'outcome_reported')),
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  attempts    integer not null default 0,
  last_error  text
);

create unique index if not exists referral_notify_queue_idempotent_idx
  on public.referral_notify_queue (request_id, kind);

create index if not exists referral_notify_queue_pending_idx
  on public.referral_notify_queue (created_at)
  where sent_at is null;

alter table public.referral_notify_queue enable row level security;
-- Service-role only. The backend polls this; no browser ever reads it.

create or replace function public.company_referral_requests_enqueue_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'request' and new.status = 'requested' then
    insert into public.referral_notify_queue (request_id, referrer_id, kind)
    values (new.id, new.referrer_id, 'new_ask')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

drop trigger if exists company_referral_requests_enqueue_notify on public.company_referral_requests;
create trigger company_referral_requests_enqueue_notify
  after insert on public.company_referral_requests
  for each row execute function public.company_referral_requests_enqueue_notify();

-- ── Grants ─────────────────────────────────────────────────────────────────
revoke all on table public.referral_reward_ledger from anon, authenticated;
revoke all on table public.referral_notify_queue from anon, authenticated;

revoke all on function public.report_referral_outcome(uuid, text) from public;
grant execute on function public.report_referral_outcome(uuid, text) to authenticated;

revoke all on function public.company_referral_requests_award_reward() from public;
revoke all on function public.company_referral_requests_enqueue_notify() from public;