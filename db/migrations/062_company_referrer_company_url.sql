-- Migration 062: a referrer desk must point at the company it claims.
--
-- WHY. `company` is free text: anyone can type "Stripe" and publish a desk.
-- Nothing on the page let a candidate check that claim before sending a
-- stranger their résumé, phone number and CV. A clickable company page — the
-- LinkedIn company directory entry or the company's own domain — is the
-- cheapest verification that exists, and it costs the referrer one paste.
--
-- ⚠️ NULLABLE, THOUGH THE FIELD IS REQUIRED. A `not null` column would fail
-- against desks created before this existed. Required is enforced where it can
-- give a useful error — `upsertMyReferrerProfile` rejects a save without a
-- valid value — so an existing desk keeps working until its owner next edits
-- it, and then has to supply one. A backfill would mean inventing a URL on
-- someone's behalf and presenting the guess to candidates as verification.
--
-- ⚠️ A PERSONAL LinkedIn IS NOT ACCEPTED, and that is the point of validating
-- rather than taking any URL: the field directly above this one in the form is
-- the referrer's own `linkedin.com/in/…` profile, so pasting it here is the
-- mistake everyone will make, and it verifies nothing about the employer.
-- The rule lives in `isUsableCompanyUrl` (lib/companyReferrers.ts); the check
-- here is only a length bound, because a regex in a CHECK constraint would be
-- a second copy of that rule, free to drift from the one users actually hit.
--
-- APPLY: Supabase SQL Editor → New query. Transaction-safe.

alter table public.company_referrers
  add column if not exists company_url text;

alter table public.company_referrers
  drop constraint if exists company_referrers_company_url_len;

alter table public.company_referrers
  add constraint company_referrers_company_url_len
    check (company_url is null or char_length(company_url) <= 500);

comment on column public.company_referrers.company_url is
  'The COMPANY''s LinkedIn page or website — never the referrer''s personal '
  'profile, which is `linkedin`. Shown to candidates so they can check the '
  'employer is real before sending a résumé. Required on write by '
  'upsertMyReferrerProfile; nullable only for desks that predate it.';
