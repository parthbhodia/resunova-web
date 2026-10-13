-- Reading a referrer checked referral requests, and reading those requests
-- checked referrers. Postgres aborted both with infinite recursion (HTTP 500).
-- The checks now run as security definer functions, so they do not re-enter RLS.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.user_asked_company_referrer(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_referral_requests q
    where q.referrer_id = target_id
      and q.candidate_user_id = auth.uid()
  );
$$;

create or replace function private.user_owns_company_referrer(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_referrers r
    where r.id = target_id
      and r.user_id = auth.uid()
  );
$$;

revoke all on function private.user_asked_company_referrer(uuid) from public;
revoke all on function private.user_owns_company_referrer(uuid) from public;
grant execute on function private.user_asked_company_referrer(uuid) to authenticated, service_role;
grant execute on function private.user_owns_company_referrer(uuid) to authenticated, service_role;

drop policy if exists "candidates can read referrers they asked" on public.company_referrers;
create policy "candidates can read referrers they asked"
  on public.company_referrers
  for select
  to authenticated
  using (private.user_asked_company_referrer(id));

drop policy if exists "referrer or candidate can read requests" on public.company_referral_requests;
create policy "referrer or candidate can read requests"
  on public.company_referral_requests
  for select
  to authenticated
  using (
    auth.uid() = candidate_user_id
    or private.user_owns_company_referrer(referrer_id)
  );

drop policy if exists "referrer can update request status" on public.company_referral_requests;
create policy "referrer can update request status"
  on public.company_referral_requests
  for update
  to authenticated
  using (private.user_owns_company_referrer(referrer_id))
  with check (private.user_owns_company_referrer(referrer_id));

drop policy if exists "referrer can delete requests" on public.company_referral_requests;
create policy "referrer can delete requests"
  on public.company_referral_requests
  for delete
  to authenticated
  using (private.user_owns_company_referrer(referrer_id));
