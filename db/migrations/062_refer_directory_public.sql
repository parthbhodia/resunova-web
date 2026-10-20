-- Make the referral directory readable without an account.
--
-- 052 closed it on purpose: "Unsigned visitors must not enumerate who is open
-- to refer (names, companies, or open counts)." Product has since decided the
-- directory should be browsable, and only the action behind it needs a
-- session, so this restores anonymous read of OPEN referrers and leaves every
-- write path exactly where it was.
--
-- Still gated:
--   * company_referral_requests: anon INSERT was revoked in 048 and the ask
--     path still requires a signed-in, entitled account.
--   * a referrer's own closed profile (open_to_refer = false) stays visible
--     only to that user, via the FOR ALL policy in 044.
--
-- Columns are granted explicitly rather than with a table-level SELECT, so
-- user_id and anything added later stay private by default.

grant select (
  id, display_name, company, company_slug, title, linkedin, slug, bio,
  open_to_refer, created_at, updated_at, referred_count
) on public.company_referrers to anon;

drop policy if exists "open company referrers readable when signed in" on public.company_referrers;
drop policy if exists "open company referrers are publicly readable" on public.company_referrers;
create policy "open company referrers are publicly readable"
  on public.company_referrers
  for select
  using (open_to_refer = true);
