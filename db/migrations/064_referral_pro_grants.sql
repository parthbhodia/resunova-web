-- Migration 064: grant referral Pro days in the database, at insert time.
--
-- 059 wrote awards to `referral_reward_ledger` as `pending` and left the grant
-- to a scheduled backend job that moved `billing_subscriptions.current_period_end`.
-- That grant did nothing, for three independent reasons:
--
--   * Pro is decided by subscription STATUS (resunova-api
--     billing_store.plan_from_subscription), never by the period end.
--   * The Stripe webhook copies current_period_end from Stripe on every
--     subscription event, so the next renewal erased the extension.
--   * A free referrer has no subscription row, so they were settled as
--     `granted` with nothing added. Publishing a desk is free, so that is most
--     referrers.
--
-- Earned time now lives in its own table that Stripe never writes, and the
-- grant happens in the same transaction as the award. resunova-api's
-- `user_has_pro` returns true for a Stripe Pro status OR an unexpired
-- `pro_until`.
--
-- Apply in the Supabase SQL editor on the prod Resume Builder project.

-- ── 1. Earned Pro time ─────────────────────────────────────────────────────
create table if not exists public.user_pro_grants (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pro_until  timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.user_pro_grants enable row level security;
-- Deliberately NO policies: service-role only, like billing_subscriptions (039)
-- and the ledger (059). A client that could write pro_until could give itself
-- Pro, and the API is the only reader.
revoke all on table public.user_pro_grants from anon, authenticated;

-- ── 2. Grant on insert ─────────────────────────────────────────────────────
-- AFTER INSERT, not BEFORE. The award trigger inserts with
-- `on conflict do nothing`, and BEFORE row triggers fire before the conflict
-- check: a BEFORE trigger would extend pro_until for a duplicate award that is
-- then discarded, paying twice. AFTER INSERT only sees rows that landed.
--
-- Days stack from whichever is later, now or the current pro_until, so an award
-- earned while Pro time is still running adds to it instead of overlapping it.
-- expires_at records when the Pro time this award contributed to runs out.
create or replace function public.referral_reward_ledger_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  granted_until timestamptz;
begin
  if new.status is distinct from 'pending' then
    return null;
  end if;

  insert into public.user_pro_grants as g (user_id, pro_until)
  values (new.user_id, now() + make_interval(days => new.days))
  on conflict (user_id) do update
    set pro_until  = greatest(g.pro_until, now()) + make_interval(days => new.days),
        updated_at = now()
  returning g.pro_until into granted_until;

  update public.referral_reward_ledger
  set status     = 'granted',
      granted_at = now(),
      expires_at = granted_until
  where id = new.id;

  return null;
end;
$$;

drop trigger if exists referral_reward_ledger_grant on public.referral_reward_ledger;
create trigger referral_reward_ledger_grant
  after insert on public.referral_reward_ledger
  for each row execute function public.referral_reward_ledger_grant();

-- ── 3. Settle anything already pending ─────────────────────────────────────
-- The ledger was empty when this was written, but a row written between 059
-- and this migration would otherwise stay pending forever. Oldest first so the
-- stacking order matches the order the awards were earned.
do $$
declare
  r record;
  granted_until timestamptz;
begin
  for r in
    select id, user_id, days
    from public.referral_reward_ledger
    where status = 'pending'
    order by created_at
  loop
    insert into public.user_pro_grants as g (user_id, pro_until)
    values (r.user_id, now() + make_interval(days => r.days))
    on conflict (user_id) do update
      set pro_until  = greatest(g.pro_until, now()) + make_interval(days => r.days),
          updated_at = now()
    returning g.pro_until into granted_until;

    update public.referral_reward_ledger
    set status = 'granted', granted_at = now(), expires_at = granted_until
    where id = r.id;
  end loop;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────
-- Supabase's default privileges grant EXECUTE to anon and authenticated
-- explicitly, so revoking from PUBLIC alone removes nothing.
revoke all on function public.referral_reward_ledger_grant() from public, anon, authenticated;
