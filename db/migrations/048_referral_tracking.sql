-- Candidate tracking for company referrals.
--
-- referred_count is the only public tally: people marked Referred. Open inbox
-- size stays private. Nudges are a signed-in candidate action, capped in
-- nudge_referral_request. Apply in the Supabase SQL editor.

alter table public.company_referrers
  add column if not exists referred_count integer not null default 0;

grant select (referred_count) on public.company_referrers to anon;

alter table public.company_referral_requests
  add column if not exists nudge_count integer not null default 0,
  add column if not exists last_nudged_at timestamptz;

alter table public.user_profiles
  add column if not exists last_seen_sent_referral_at timestamptz;

update public.company_referrers r
set referred_count = coalesce((
  select count(*)::integer
  from public.company_referral_requests q
  where q.referrer_id = r.id
    and q.status = 'referred'
), 0);

-- Asking requires a signed-in candidate. A referrer may still log a referral
-- they already submitted.
drop policy if exists "anyone can request an open referrer" on public.company_referral_requests;
create policy "anyone can request an open referrer"
  on public.company_referral_requests
  for insert
  with check (
    (
      source = 'request'
      and auth.uid() is not null
      and candidate_user_id = auth.uid()
      and exists (
        select 1 from public.company_referrers r
        where r.id = referrer_id
          and (r.open_to_refer = true or r.user_id = auth.uid())
      )
    )
    or (
      source = 'submitted'
      and (candidate_user_id is null or candidate_user_id = auth.uid())
      and exists (
        select 1 from public.company_referrers r
        where r.id = referrer_id
          and r.user_id = auth.uid()
      )
    )
  );

revoke insert on public.company_referral_requests from anon;

-- Candidates can read the referrer they asked, even if that desk is paused.
drop policy if exists "candidates can read referrers they asked" on public.company_referrers;
create policy "candidates can read referrers they asked"
  on public.company_referrers
  for select
  using (
    exists (
      select 1 from public.company_referral_requests q
      where q.referrer_id = company_referrers.id
        and q.candidate_user_id = auth.uid()
    )
  );

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
    or new.role is distinct from old.role
    or new.notes is distinct from old.notes
    or new.source is distinct from old.source
  then
    raise exception 'Only status can be updated on referral requests';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.company_referrers_sync_referred_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'referred' then
      update public.company_referrers
      set referred_count = referred_count + 1
      where id = new.referrer_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.status = 'referred' then
      update public.company_referrers
      set referred_count = greatest(referred_count - 1, 0)
      where id = old.referrer_id;
    end if;
    return old;
  elsif old.status is distinct from new.status then
    if new.status = 'referred' then
      update public.company_referrers
      set referred_count = referred_count + 1
      where id = new.referrer_id;
    elsif old.status = 'referred' then
      update public.company_referrers
      set referred_count = greatest(referred_count - 1, 0)
      where id = old.referrer_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists company_referrers_sync_referred_count on public.company_referral_requests;
create trigger company_referrers_sync_referred_count
  after insert or update or delete on public.company_referral_requests
  for each row execute function public.company_referrers_sync_referred_count();

create or replace function public.nudge_referral_request(request_id uuid)
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
  if row.status not in ('requested', 'reviewing') then
    raise exception 'this request can no longer be nudged';
  end if;
  if row.created_at > now() - interval '3 days' then
    raise exception 'you can nudge 3 days after asking';
  end if;
  if row.nudge_count >= 2 then
    raise exception 'nudge limit reached';
  end if;
  if row.last_nudged_at is not null and row.last_nudged_at > now() - interval '7 days' then
    raise exception 'nudged recently';
  end if;
  update public.company_referral_requests
  set nudge_count = nudge_count + 1,
      last_nudged_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.company_referrers_sync_referred_count() from public;
revoke all on function public.nudge_referral_request(uuid) from public;
grant execute on function public.company_referrers_sync_referred_count() to authenticated, service_role;
grant execute on function public.nudge_referral_request(uuid) to authenticated;
