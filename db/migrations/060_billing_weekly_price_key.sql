-- 060_billing_weekly_price_key.sql — add the weekly Pro period.
--
-- Weekly is a THIRD recurring Price on the same Stripe product, not a new
-- plan: it grants the same Pro entitlements as monthly and quarterly. The
-- only thing that changes is the billing period, so the vocabulary grows by
-- one key and nothing else in the schema moves.
--
-- This is load-bearing, not housekeeping. 039 declared the CHECK constraint
-- inline, so Postgres auto-named it billing_subscriptions_price_key_check
-- and it rejects anything outside ('pro_monthly','pro_quarterly'). The Stripe
-- webhook handler writes price_key on every subscription event, so without
-- this migration the FIRST weekly checkout would charge the card and then
-- fail the webhook write: money taken, Pro never granted, and the user has
-- no way to tell from the UI that anything went wrong. Relax the constraint
-- in the same deploy that ships the backend's STRIPE_PRICE_PRO_WEEKLY.
--
-- DROP then ADD rather than DROP then re-validate: a CHECK change is cheap on
-- this table (one row per user) and dropping first keeps the two statements
-- from fighting over the same lock. `if exists` on the drop makes this
-- re-runnable against a database where the constraint was never created.

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_price_key_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_price_key_check
  check (price_key is null or price_key in ('pro_weekly', 'pro_monthly', 'pro_quarterly'));

-- RLS stays untouched: the table is still service-only, and this migration
-- grants no client access. anon/authenticated still cannot read a row.
