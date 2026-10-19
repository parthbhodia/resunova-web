# Referral rewards — HLD

Status: **built on both sides.** Web half here; backend on `resunova-api`
branch `feat/referral-rewards`. Migration 059 was applied to prod
(`eiumlptnsmowvkxucprl`) on 2026-10-19, and the two drains run on a Railway cron
service every five minutes.

Companion to [`COMPANY_REFERRER_HLD.md`](COMPANY_REFERRER_HLD.md). That document
describes the desk. This one covers the rewards layer sitting on top of it, and
the invite program that shares it.

## One ledger, two programs

Two programs pay referral rewards and they pay in the same currency, so they
share one primitive rather than each growing its own counter:

| Program | Who earns | For what |
|---|---|---|
| Employee desk | An employee of some other company | Submitting a candidate, and that candidate getting an interview |
| Invites | Our own user | A friend signing up, activating, and subscribing |

The shared table is `referral_reward_ledger` (migration 059), and the shared
currency is **Pro days**.

Pro days rather than cash is not a close call for the desk. The person being
incentivised works for somebody else: plenty of employers prohibit their own
staff from taking referral payments, an employee who takes one has to disclose
it, and a payment attached to a hiring decision reads as a kickback to everyone
who looks at it later. Product value costs us cents and creates none of that.
Invites could legally pay cash since the referrer is our own user, but cash
converts a social favor into a transaction and invites fraud; the same currency
keeps one code path.

### What costs what

Asking for a referral is **Pro**. Publishing your own referral desk is **free**.

| | Free | Pro |
|---|---|---|
| Browse companies with open referrers | Yes | Yes |
| Ask an employee for a referral | No | Yes |
| Publish and maintain your own desk | Yes | Yes |
| Earn Pro days by referring | Yes | Yes |

The asymmetry is deliberate. The ask is what we sell: it costs a desk slot and a
review cycle. The desk is what we want, because the referrer works for somebody
else's company, and charging an employee to help a candidate is both a bad look
and the wrong side of the trade.

Two consequences worth knowing:

**It is a wall, not a quota.** `REFERRAL_ASK` carries `remedy=upgrade` with no
limit, because there is no free allowance to exhaust. A quota refusal renders
as "come back tomorrow", which would be false.

**An unknown plan asks for sign-in, not for money.** `referralAskEntitlement`
reads `plan` from `/api/scan-limit-status` rather than re-deciding the rule in
the browser, and treats `plan: null` as a session problem. Selling to someone
because our own status call flaked is worse than showing them nothing.

The form renders **disabled rather than hidden**, so a free candidate still sees
what they would be asking for and where it goes. A paywall that hides the product
behind it reads as a dead end; one that shows the ask and the price reads as a
choice.

## The numbers

| Event | Award | Why there |
|---|---|---|
| Mark a candidate `referred` | 3 Pro days | Nearly free to do, so it pays little |
| Candidate reports an interview or offer | 10 more | The referrer has to wait for a real result, so it pays most |
| Friend signs up via invite | 0 to referrer, 7 to friend | The friend needs to be able to act before paying us |
| Friend completes a first scan | 7 to referrer | Proves the signup was a person |
| Friend subscribes | 14 to referrer, 20% off for 3 months | Strongest signal |
| **Invite ceiling** | **90 Pro days per referrer per year** | Bounds the cost |

Two rules hold the shape together:

**Pay on outcomes, never on the ask.** An award for "someone asked me" buys
drive-by asks and pays the desk for volume it did not create. The ledger has no
`asked` kind at all, which is asserted in `referralRewards.test.ts`.

**An offer pays the same as an interview.** Otherwise the better outcome earns
less, which is both unfair and an obvious bug to whoever notices it first.

The invite curve is not yet built. `lib/referralRewards.ts` holds it as
`INVITE_REWARDS` and `makeInviteCode`, and `INVITE_ANNUAL_DAY_CAP` is the only
place the 90 needs changing.

## Migration 059

Additive on the live project. Three things land.

**1. A candidate-reported outcome.** `candidate_outcome` and
`candidate_outcome_at` on `company_referral_requests`. This is what earns the
interview reward, so the desk could not have it without a way for the candidate
to speak.

The `company_referral_requests_status_only` trigger (045, redefined in 048)
rejects every column change except `status`, so it is redefined again here. The
identity check is the load-bearing part:

```sql
if auth.uid() is null
  or new.candidate_user_id is null
  or new.candidate_user_id is distinct from auth.uid()
then
  raise exception 'Only the candidate can report an outcome';
end if;
```

Without it an employee could set `candidate_outcome` on their own request and
award themselves 10 days. Note the asymmetry that makes this necessary: the RLS
UPDATE grant runs to the *referrer*, not the candidate, so the referrer is the
one who can already write to the row. The candidate reaches the column through
`report_referral_outcome`, a SECURITY DEFINER RPC, which also enforces
`status = 'referred'` and one report per request.

`nudge_count` and `last_nudged_at` are deliberately still absent from the
immutable column list. `nudge_referral_request` updates them, so pinning them
would break nudging on deploy.

**2. `referral_reward_ledger`.** One row per award per event. RLS with zero
policies, service-role only, the same shape as `billing_subscriptions` (039).
Two partial unique indexes make it idempotent:

- `(user_id, kind, request_id)` for desk awards. **Not** unique on `request_id`
  alone, because one referral legitimately earns both the 3 and the 10, and
  collapsing them would silently drop 10 of the 13 days.
- `(user_id, kind, invitee_user_id)` for invites, which have no `request_id`.

`status` moves `pending` → `granted`. The trigger writes `pending`; the backend
sets `granted` when it has actually extended the subscription.

**3. `referral_notify_queue`.** An outbox, not a send. An ask can be inserted by
anyone including an anonymous visitor, so Resunova cannot email from the form.
An AFTER INSERT trigger records the event; the backend drains it and decides
whether to send.

The trigger deliberately does **not** read the opt-in. Email preferences live in
`user_profiles.notify_prefs` behind `/api/profile/notify-prefs`, which is
backend-owned, and gating at send time means a preference change takes effect on
the next ask instead of stranding rows nobody drains.

## What the web repo can and cannot do

Worth stating plainly, because two of the four incentives need the backend.

| Incentive | Status | Why |
|---|---|---|
| Top referrer badge + directory sort | Shipped | `referred_count` already exists and is anon-granted (048) |
| Copy-ready referral note | Shipped | Pure client, the packet already had the fields |
| Email on a new ask | Frontend done, send is backend | No mail path here but admin-gated `/api/admin/send-test-email` |
| Pro days on outcomes | Frontend done, grant is backend | `billing_subscriptions` has zero client policies |

The grant cannot be done from a browser. `039_billing.sql` says so directly:
clients read their plan via `GET /api/billing/status`, "never by querying this
table." So the frontend half is a read plus a display, and the write is a service
role operation.

### The frontend halves

`fetchMyReferralRewards` calls `GET /api/referral/rewards`. A 404 resolves to an
empty list rather than an error, because a not-yet-shipped route is the expected
state and every fresh desk should not see a failure. `ReferralRewardsCard`
renders nothing when there is nothing earned.

Pending days are shown as "On the way", not hidden and not rounded up to
"granted". The award is recorded by a trigger and the subscription is extended
by the backend, so for a few seconds the two disagree; a reward that silently
never arrives costs more trust than a day of delay does.

## Backend contract — built

Lives in `resunova-api` on branch `feat/referral-rewards`:

| File | Role |
|---|---|
| `resume_gui/routes/referral_rewards.py` | `GET /api/referral/rewards` |
| `resume_gui/services/referral_rewards.py` | The two drains: grant days, send the email |
| `resume_gui/routes/notify_prefs.py` | Adds `referralAsks` |
| `resume_gui/tests/test_referral_rewards.py` | 31 tests, no network or DB |

### `GET /api/referral/rewards`

Supabase bearer, declared in `routes/access.py` POLICY, which raises at import
for any undeclared route.

```json
{ "entries": [
  { "id": "…", "kind": "interview", "source": "desk_referral", "days": 10,
    "status": "pending", "subject": "Alex Kim",
    "createdAt": "2026-10-05T12:00:00Z", "grantedAt": null }
] }
```

`kind` ∈ `referred` | `interview` | `invite_signup` | `invite_activated`.
`source` ∈ `desk_referral` | `invite`. `subject` is the candidate name for desk
rows, null for invites.

Three decisions worth keeping:

**`subject` is resolved here, not in the ledger.** The ledger stores ids, so the
route joins the request rows. A list of bare "10 Pro days" entries reads like a
bug; "Candidate reported an interview: Alex Kim" does not. The join runs
through the service role because RLS only lets the referrer or the candidate
read a request, and an award can be older than either party's current access.

**A missing name degrades, an unreadable store does not.** A failed name lookup
returns a null subject and the row still renders. A failed ledger read is 503,
because "you have earned nothing" and "we could not check" must not look alike
to a user who is owed Pro days.

**Vocabulary is normalized on the way out.** An unknown `kind` or `status`
becomes a safe value rather than passing through, because the web's
`parseRewardEntry` drops rows it cannot render, which would make an earned
reward silently invisible.

### Granting the days

`grant_pending_rewards()` reads pending rows, groups them by user, and extends
`billing_subscriptions.current_period_end` once per user rather than once per
award. Then it marks the group `granted` with `granted_at` and `expires_at`.

Three things it deliberately does not do:

**It never creates a subscription.** A user with no `billing_subscriptions` row
is settled as granted with no days added, because there is no Pro period to
extend and upserting a row would make a free user look like a subscriber to
every plan check in `entitlements.py`.

**It leaves rows pending on failure.** A transient billing error must not
consume the award; the next drain retries, and the ledger's unique index is what
stops a retry paying twice.

**It chunks `in_()` filters at 50.** That filter rides in the query string, and
a large id list can 400 the request.

`expires_at` is set on every grant. A day credit that never expires turns a
one-off favor into a permanent entitlement, which is what the invite annual cap
exists to prevent.

### Sending the ask

`drain_referral_notifications()` sends one email per queued ask, through the
existing `resend_email` helper.

The email carries the candidate's **first name and role only**. No résumé, no
notes, no phone. The recipient has not decided to refer this person yet, and an
inbox full of candidate PII is a liability before consent. User text is HTML
escaped before it reaches the template.

The opt-in check reads `notify_prefs.referralAsks` at **send** time, not at
enqueue time. Two reasons: a preference that changes takes effect on the next
ask rather than stranding rows nobody drains, and the trigger stays free of a
dependency on a backend-owned column. The check **fails open** — a storage blip
must not silence the one email that says someone is waiting.

A row is marked sent without sending when the referrer has opted out, when there
is no email on file (counted against `NOTIFY_MAX_ATTEMPTS`, so a permanently
undeliverable row is not retried forever), or when the ask is no longer
`requested` (the referrer may have answered before the drain ran).

### `referralAsks` in notify prefs

Added to `_DEFAULTS`, defaulting to **on**, unlike the other two opt-ins.

The merge has a special case worth knowing about: a `user_profiles` row written
before this key existed has no value for it, and a plain `{**DEFAULTS, **stored}`
would report the stored dict as authoritative and silently turn the default off
for every existing referrer. Absence is treated as "not chosen yet".

The web already writes the same key to the same localStorage
(`rn_notify_prefs_v1`) `EmailPreferencesCard` uses, so there is one preference
surface rather than two.

### Wiring the drains

Both are plain functions, so any scheduler works. **Decision: Railway cron**,
as a second service in the API project. It runs:

```bash
python -m resume_gui.jobs.referral_drains
```

every five minutes (UTC, Railway's minimum interval), with restart policy
Never and no public networking. `resume_gui/jobs/referral_drains.py` is a
one-shot process, not a loop: Railway skips the next tick while a previous run
is still active, so it has to exit when the two drains return.

Two properties matter more than the schedule:

- **It refuses without a database client.** Both drains swallow a missing
  Supabase client and return 0, which looks identical to "nothing to do". The
  entrypoint checks `drains_available()` first and exits 1, so a deploy with the
  wrong env vars fails in the run history instead of sitting green while rewards
  stay pending.
- **It refuses to touch the email queue without `RESEND_API_KEY`.** A drain with
  no sender returns False from `send`, increments the row's attempt counter, and
  after five runs the ask is never retried. Rewards are still granted;
  `--skip-email` is the explicit way to run rewards only.

The jobs pipeline deliberately has **no in-process scheduler** (Railway cron or
an external trigger drives it), so this stays out of the web process as well.
The reward grants are the one piece of this feature that is not end-to-end on a
request: without a drain, the trigger still records the award as `pending` and
the UI shows it as "on the way" indefinitely. Service settings live in the API
repo's `DEPLOY.md`.

## Rollout

Migration 059 is applied to prod (2026-10-19). Deploy order before that point
mattered only in that the web half reads `candidate_outcome`, and it is written
to tolerate the column being absent: every request read falls back through
`selectWithFallback` to the pre-059 column set, so deploying the web first
degrades the report section instead of breaking the inbox.

The rewards card hides itself until `GET /api/referral/rewards` exists, so
nothing user-visible changes on deploy.

## Metrics

Desk open rate (`open_to_refer` true as a share of published desks) is the
health metric. An incentive that lifts asks but not open rate has moved work to
the referrers who were already open.

Then: asks per active desk per month, ask → `referred` conversion (the quality of
the supply, and the number that justifies paying on outcomes), the share of
`referred` requests that get an outcome reported, and 30-day desk retention after
a first referral.

## Notifications and feedback

Every reward action has one: a toast on the action, and a bell row on the feed.

| Event | Surface | Copy |
|---|---|---|
| Ask lands | Toast + bell + email | "Alex asked you for a referral at Acme." |
| Candidate nudged | Toast + bell | "Alex nudged you about Backend." |
| Marked referred | Toast | "3 Pro days on the way. An interview makes that 10." |
| Marked declined | Toast | "Alex will see that you passed on this one." |
| Outcome reported | Toast + bell | "Alex Kim marked you as referred for Backend." |
| Interview reported | Success toast + bell | "Alex Kim reported an interview. 10 Pro days added." |
| Miss reported | Info toast | "Noted. No reward, and thanks for saying so." |
| Note copied | Success toast | "Paste it in. Add your reason for vouching first." |
| Email pref toggled | Success or error toast | "Referral emails on." |
| Rewards load fails | Retry, not a blank card | 503 is distinct from "earned nothing" |

Two decisions behind it:

**Toast copy leads with the person, not the number.** "Alex Kim reported an
interview" is the sentence a referrer wants to read; "10 Pro days" is not what
makes them open the app.

**A reward arriving while the rewards card is on screen does not toast.** The
card is already rendering those numbers, and a toast on top of it repeats the
page. `isReferralInboxOpen()` gates it.

The bell treats rewards as a **live counter**, not a one-shot notice: clicking it
must not mark it dismissed, because the count returns on the next poll and a
dismissed marker would come back as a permanently struck-through item. See
`LIVE_FEED_IDS` in `NotificationBell.tsx`.

The reward toast keys on `kind:status`, not id alone, so a reward that lands as
`pending` and later settles to `granted` is a second notification. The transition
is the news: pending means the trigger recorded the award, granted means the
subscription was actually extended. The seen-list is capped at 200 entries
because, unlike the referral keys, nothing clears it.

## Copy constraints

No spaced em dashes in user-facing copy (the `uiCopyStyle` ratchet). No "Free
forever", "no credit card", or other trust copy we cannot substantiate. The desk
keeps the profile-hub card language, not a rewards gradient, so the badge is a
chip and the rewards card is a card rather than a hero.

The referral note in `lib/referralNote.ts` is generated, but it never asserts a
claim about the candidate that the candidate did not make. The referrer's
endorsement is left as a prompt, because only the referrer knows why they are
vouching for someone and a generated sentence would put words in their mouth in
front of their employer.