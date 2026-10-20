-- 061_referral_placement_outcome.sql — let the candidate report the hire.
--
-- "Offer" is not "placed": offers get declined, rescinded, or the candidate
-- takes something else. Without a placement value the referrer never hears that
-- the referral worked, and the desk cannot tell a 20% offer rate from a 20%
-- hire rate.
--
-- Placement is INFORMATIONAL for now. It does not pay a second award: the
-- candidate cannot prove a hire and the referrer is the party who gets the
-- days, so paying more for a self-reported "placed" is a collusion vector. The
-- 10 days still land on the first interview/offer, and a direct null -> placed
-- report earns those same 10 because the offer must have happened.
--
-- Outcomes are a progression, not a single choice. The 059 RPC refused a second
-- report, which froze every request at "interview"; the candidate could never
-- record the offer or the hire that followed. This one is forward-only:
-- interview -> offer -> placed, and closed from any open state. placed and
-- closed are final. Repeating the current value is a no-op so a retry is safe;
-- the award trigger already only fires on the first non-null outcome, and the
-- ledger's unique index blocks a second payment for the same kind.

-- Widen the CHECK. 059 declared it inline, so Postgres auto-named it; drop by
-- definition rather than by guessed name. A `drop constraint if exists` on the
-- wrong name silently no-ops and leaves the old check rejecting 'placed'.
do $$
declare
  constraint_name record;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.company_referral_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%candidate_outcome%'
  loop
    execute format(
      'alter table public.company_referral_requests drop constraint %I',
      constraint_name.conname
    );
  end loop;
end;
$$;

alter table public.company_referral_requests
  add constraint company_referral_requests_candidate_outcome_check
  check (
    candidate_outcome is null
    or candidate_outcome in ('interview', 'offer', 'placed', 'closed')
  );

create or replace function public.report_referral_outcome(request_id uuid, outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.company_referral_requests%rowtype;
  previous text;
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
  if outcome not in ('interview', 'offer', 'placed', 'closed') then
    raise exception 'unknown outcome';
  end if;

  previous := row.candidate_outcome;
  if previous is not null then
    -- A retry of the same report must not fail; the UI may resubmit after a
    -- dropped response.
    if previous = outcome then
      return;
    end if;
    if previous in ('placed', 'closed') then
      raise exception 'this referral is already final';
    end if;
    if outcome = 'closed' then
      -- An open process can always end. The days already granted for the
      -- interview stay granted: the interview did happen.
      null;
    elsif outcome = 'offer' and previous = 'interview' then
      null;
    elsif outcome = 'placed' and previous in ('interview', 'offer') then
      null;
    else
      raise exception 'outcome cannot move backwards';
    end if;
  end if;

  update public.company_referral_requests
  set candidate_outcome = outcome,
      candidate_outcome_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.report_referral_outcome(uuid, text) from public;
grant execute on function public.report_referral_outcome(uuid, text) to authenticated;

-- A direct null -> placed report still earns the 10 days the interview would
-- have. Everything else about the trigger is unchanged.
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
      and new.candidate_outcome in ('interview', 'offer', 'placed')
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

revoke all on function public.company_referral_requests_award_reward() from public;
