# Weekly Pro rollout

The weekly period is a **third recurring Price on the existing Pro product**,
not a new plan. It grants identical Pro entitlements; only the billing period
changes. Three repos are involved and **the order matters**, because the
database constraint and the backend vocabulary are independent of each other
and a mismatch fails closed in the worst way: the card is charged and Pro is
never granted.

## Status

| Step | Repo | State |
|---|---|---|
| 1. Relax `price_key` CHECK | `resunova-web` (`db/migrations/060_*.sql`) | **done, not applied** |
| 2. Frontend offers the period | `resunova-web` | **done** |
| 3. Stripe Price object | Stripe dashboard | **not created** |
| 4. Backend knows the key | `resunova-api` | **not applied** |
| 5. Set `STRIPE_PRICE_PRO_WEEKLY` | Railway | **not set** |

## Apply in this order

**1. Migration first, alone.** `db/migrations/060_billing_weekly_price_key.sql`.
The CHECK on `billing_subscriptions.price_key` rejects anything outside
`('pro_monthly','pro_quarterly')`, and the webhook writes `price_key` on every
subscription event. Safe to apply early: it only widens what is accepted, and
nothing references `pro_weekly` yet.

> Confirm the constraint name before applying. `039` declared it inline, so
> Postgres auto-named it `billing_subscriptions_price_key_check`. Verified
> against prod as of this writing. If it differs, `drop constraint if exists`
> silently no-ops and you end up with two constraints — check with:
>
> ```sql
> select conname, pg_get_constraintdef(oid)
> from pg_constraint
> where conrelid = 'public.billing_subscriptions'::regclass and contype = 'c';
> ```

**2. Create the Stripe Price.** $4.99 USD, recurring, interval `week`, on the
same Product as the existing monthly/quarterly prices.

**3. Backend patch** (below).

**4. Set `STRIPE_PRICE_PRO_WEEKLY`** on the Railway service for each
environment, then redeploy. Until this is set, `price_id_for_key` returns
`None` and `/api/billing/checkout` answers 400 for `priceKey: "pro_weekly"`.
That is the safe failure — it fails before checkout, not after payment.

## Failure modes worth knowing

- **Checkout succeeds, Pro never arrives.** Constraint or webhook write failed
  after payment. Symptom: user is charged, `/api/billing/status` still says
  `free`. This is what step 1 exists to prevent.
- **`checkout_unavailable` in the UI for everyone, including monthly.** A typo
  in `PRICE_KEYS` breaks lookup for the keys already in that tuple only if the
  tuple itself is malformed; a bad `_PRICE_ENV` entry degrades just that key.
- **Wrong amount charged.** The UI amounts in `PLAN_PRICE_LABELS` are display
  labels only. The charge comes from the Stripe Price object. If step 2 creates
  $4.99 but the label says something else, the label is what users complain
  about.

## Backend patch (`resunova-api`)

Branch: `feat/referral-rewards` (live worktree at
`/Users/mslcomx/Projects/resunova-api-referral-rewards`). Note this file does
**not** exist on the repo's checked-out branch (`ip-history-work`).

```diff
--- a/resume_gui/services/stripe_billing.py
+++ b/resume_gui/services/stripe_billing.py
@@ -9,7 +9,8 @@
   STRIPE_SECRET_KEY          — sk_test_... / sk_live_... (required to enable billing)
   STRIPE_WEBHOOK_SECRET      — whsec_... from the webhook endpoint config
   STRIPE_PRICE_PRO_MONTHLY   — price_... id for the pro_monthly plan
   STRIPE_PRICE_PRO_QUARTERLY — price_... id for the pro_quarterly plan
+  STRIPE_PRICE_PRO_WEEKLY    — price_... id for the pro_weekly plan
@@ -37,11 +38,12 @@
 # The only price keys the system knows. Mirrors the CHECK constraint on
 # billing_subscriptions.price_key (web migration 039_billing.sql).
-PRICE_KEYS = ("pro_monthly", "pro_quarterly")
+PRICE_KEYS = ("pro_weekly", "pro_monthly", "pro_quarterly")

 _PRICE_ENV = {
+    "pro_weekly": "STRIPE_PRICE_PRO_WEEKLY",
     "pro_monthly": "STRIPE_PRICE_PRO_MONTHLY",
     "pro_quarterly": "STRIPE_PRICE_PRO_QUARTERLY",
 }
```

No entitlement change. `services/entitlements.py` keys off the subscription
being Pro, not off the period, so a weekly subscriber gets the same
`PRO_SCAN_DAILY_LIMIT` / `PRO_INTERVIEW_DAILY_LIMIT` as monthly.

Existing `tests/test_billing.py` asserts against `PRICE_KEYS`; check whether
any assertion pins the tuple length or contents before merging.

## Copy decisions

Weekly is **above** the monthly run rate: $4.99 × 52 ≈ $21.6/mo against $19.
It is priced as a penalty on purpose — the impulse buy is "I have two roles to
apply to this week", not a discount. The panel says so rather than showing
`$4.99` alone and letting a reader assume it is the deal: the weekly option
carries a note reading `$21.6/mo if you keep it weekly` and a chip offering
`Monthly is $19, saves 12%`.

`components/__tests__/billingApi.test.ts` pins that relationship rather than
the prose, so dropping or re-pricing weekly fails a test instead of quietly
making the chip a lie.
