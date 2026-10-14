-- Lock the open-referrer directory to signed-in users.
-- Unsigned visitors must not enumerate who is open to refer (names, companies,
-- or open counts). Share links and the /refer company grid require auth.
-- Asks already require a session on the client; anon INSERT was revoked in 048.

revoke select on public.company_referrers from anon;

drop policy if exists "open company referrers are publicly readable" on public.company_referrers;
drop policy if exists "open company referrers readable when signed in" on public.company_referrers;
create policy "open company referrers readable when signed in"
  on public.company_referrers
  for select
  to authenticated
  using (open_to_refer = true or user_id = auth.uid());
