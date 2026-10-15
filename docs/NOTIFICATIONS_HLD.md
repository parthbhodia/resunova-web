# Referral notifications — HLD

Status: **design, nothing built.** Written 2026-10-15 after reviewing #329 and #331.

---

## 1. Answering the two questions first

### Does #331 help with notification?

**No.** #331 ("Richer referral candidate packet") is a *content and read-surface*
change: three new snapshot columns (`candidate_phone`,
`candidate_years_experience`, `candidate_headline`), a richer inbox row, and a
new `/refer/candidate/?r=<id>` page. It changes **what a referrer sees once they
are already looking**. It adds nothing to *getting them to look*.

It is a good PR on its own terms — see §6 for the review — it just answers a
different question.

### Is #329's approach correct?

**Correct for in-app, and structurally unable to reach a closed tab.** That is
not a bug in #329; it is the ceiling of the mechanism it chose.

What ships today (`components/ProductNoticesHost.tsx`):

| Layer | What it does |
|---|---|
| Supabase Realtime `postgres_changes` | two channels — INSERT+UPDATE filtered `referrer_id=eq.<desk>`, UPDATE filtered `candidate_user_id=eq.<me>` |
| 60s poll (`REFERRAL_INBOX_POLL_MS`) | belt-and-braces if Realtime drops or the table is not in the publication |
| `localStorage` dedupe | `rn_toasted_referral_ids_v1` / `rn_toasted_sent_referral_ids_v1` so one event toasts once |
| `user_profiles.last_seen_referral_at` | unread watermark, survives devices |

All four are sound and the RLS story is right: Realtime enforces the table's
SELECT policy per subscriber, so the `filter:` is a narrowing convenience and
not the security boundary.

> ⚠️ **But every one of those layers only runs while `ProductNoticesHost` is
> mounted — i.e. while the app is open in a browser tab.** So the reach of the
> notification is exactly *"users who already had the app open"*, which is the
> population least in need of being notified.

And that collides with what the feature actually is. **Neither party in a
referral is sitting in Resunova:**

- A **referrer** gets an ask and should act within hours. They are at their job.
- A **candidate** whose status moves to `Reviewing` is waiting days.

> ⚠️ **The hard constraint nobody has written down yet: the referral feature is
> 100% client-direct Supabase + RLS. `grep -rln 'referral\|referrer'
> resume_gui/` matches two files, both about job boards.** The backend has never
> heard of this feature. So there is **no server request to hang a
> fire-and-forget email off**, which is how every other email in this product
> works (`services/email_triggers.py`). That is the real reason there is no
> email today, and it is the thing a design has to solve.

### So: is notification even the bottleneck?

Measured against production: `company_referrers` **0** rows, open **0**,
`company_referral_requests` **0**, against 95 accounts that could publish a desk.

> ⚠️ **Zero notifications have ever been deliverable, and none of this code has
> run against a real row.** So "notifications are the bottleneck" is an
> inference, not a measurement. It is a *reasonable* inference — a referrer who
> never learns they have an ask is this feature's defining failure mode, and
> today that failure is completely unobservable — but the honest ranking is that
> **§7's empty-state problem is the bigger open item**, because it governs
> whether a request is ever created at all.

Build this when the first real desk exists. It is cheap insurance; it is not the
thing standing between 0 requests and 1.

---

## 2. What the design has to deliver

| # | Requirement | Why |
|---|---|---|
| R1 | Reach a referrer whose tab is closed | the defining failure mode |
| R2 | Reach a candidate on a status change | the #329 intent, same gap |
| R3 | Send at most once per (event, recipient) | a status can go Reviewing → Declined → Reviewing |
| R4 | A failed send must be **visible**, not swallowed | this repo has been bitten repeatedly by graceful degrade that is indistinguishable from total failure |
| R5 | Never block or roll back the referral write | the user's action must not fail because an email provider is down |
| R6 | Honour opt-out | and see the ⚠️ in §4 about the default |
| R7 | Keep the in-app toast | #329 is the right experience for someone who *is* looking; this is additive |

---

## 3. Delivery channel: email, Chrome push, or both

> ⚠️ **CORRECTION to the first draft of this section.** It claimed a trigger
> calling out via `pg_net` would "raise and abort the referral the user just
> submitted." **That is wrong.** `pg_net` is asynchronous by design:
> `net.http_post()` enqueues into `net.http_request_queue`, returns a request id
> immediately, and a background worker performs the call — it cannot fail the
> caller's transaction. R5 holds for `pg_net` too. The real objections are
> narrower (no retry; `net._http_response` is garbage-collected after ~6h; and
> nobody reads that table), and correcting them opens **option E** below, which
> is now recommended over the cron-only design.

### Email vs Web Push, measured against this product

| | Email (Resend) | Chrome / Web Push |
|---|---|---|
| Reach, desktop | everyone | Chrome must be **running** (tab may be closed) |
| Reach, Android | everyone | good |
| ⚠️ Reach, **iOS** | everyone | **only if installed to the home screen** (iOS 16.4+); a plain Safari tab gets nothing |
| Permission needed | **none** | **one prompt, one chance** — a Block is permanent |
| Address already held | **yes**, from signup | no — needs a per-device subscription |
| Survives clearing site data | yes | **no** |
| Latency | seconds | seconds |
| Build cost here | **~0 infra** — Resend + `_notify_prefs_for_user` already wired | service worker (none registered today), VAPID keypair, `push_subscriptions` table, `pywebpush`, 410-Gone reaping |

**Recommendation: email first, push later, and the sequencing is not a hedge.**

1. ⚠️ **A referral ask needs "within hours," not "within seconds."** Push buys
   salience, not reach — and on the one channel that matters most for a
   candidate-facing product, **iOS, it buys nothing at all** unless they
   installed the PWA. `public/site.webmanifest` exists with
   `display: standalone`, but **no service worker is registered anywhere in the
   tree**, so there is no installed-PWA population today to push to.
2. ⚠️ **The permission prompt is a one-shot asset and asking early wastes it.**
   A Block is permanent per origin, and Chrome degrades the prompt to quiet UI
   for origins with low accept rates. The only honest moment to ask is **right
   after someone publishes a referral desk** — they have just opted into
   receiving asks, so the prompt has an obvious reason. Asking on first load
   burns it.
3. **A subscription is per-device and decays.** A `410 Gone` from the push
   service means delete the row; skip that and dead subscriptions accumulate and
   the "sent" count starts lying — the same class of false-confidence bug as a
   401 body rendering "∞ Unlimited".

> ⚠️ **AND THIS IS THE ARGUMENT FOR THE OUTBOX, so it is not over-engineering
> for one email: with an outbox, push is a `channel` column on the same rows.**
> Build `channel='email'` now; adding `channel='web_push'` later is a new row
> type and a second sender in the same drain, with the dedupe, retry, prefs and
> failure record already built. A one-off trigger→Resend call buys one email and
> has to be thrown away to get the second channel.

### Transport options for the email itself

| | Approach | Reaches closed tab | Latency | Retry | Permanent record | Blast radius |
|---|---|---|---|---|---|---|
| **A** | trigger → `pg_net` → Resend | yes | seconds | **no** | **~6h only** | small |
| **B** | trigger → outbox → api drains on cron | yes | ≤ cron period | yes | yes | small |
| **C** | route referral writes through the api | yes | immediate | yes | yes | **large** |
| **D** | Realtime + poll only (today) | **no** | — | — | — | zero |
| **E** | **trigger → outbox + `pg_net` ping; cron sweeps** | yes | **seconds** | yes | yes | small |

**C undoes the feature's architecture** to buy a send path. Client-direct + RLS
works and its tenant boundary is in the database, which is the right place for
it. Do not trade that away for an email. **B alone** is sound but pays a full
cron period on the one notification where latency is the point.

### Recommended: E — outbox for durability, `pg_net` for speed

The trigger does two things in one transaction: `INSERT ... ON CONFLICT
(dedupe_key) DO NOTHING` into `notification_outbox` (the durable fact), then
`net.http_post()` to the drain as a **best-effort wake, not the delivery
mechanism**. The cron becomes a **retry sweeper**. If the ping lands, the email
goes in seconds; if it is lost or the api is mid-deploy, the next sweep sends it.
**Nothing is ever only in flight** — the row exists before the ping does, so the
worst case is late, never lost.

> ⚠️ The ping carries **no payload worth trusting** — just "go drain." The api
> re-reads the outbox with service-role and decides what to send. An endpoint
> that took recipient and body from its caller would be an open relay.

### Edge Function or the api?

**The api, and not narrowly.** It already owns transactional email: Resend is
wired, `_notify_prefs_for_user()` already defaults correctly for the 85% of
users with no `user_profiles` row, failures are logged, and `POST /api/jobs/scan`
is the secret-gated + single-flight pattern to copy. A Supabase Edge Function
would add a **second email surface, in a second language, on a second deploy
pipeline** — the two-implementations-of-one-thing pattern this repo keeps paying
for, and two places that must agree about notify prefs.

### Abuse: already handled by the schema

> ⚠️ A surface that mails a stranger on someone else's action is normally an
> email-bombing vector — `/api/blog/subscribe` carries a 15-minute per-address
> cooldown for exactly this. **Here migration 045 already bounds it:**
>
> ```sql
> create unique index company_referral_requests_open_email_idx
>   on public.company_referral_requests (referrer_id, lower(candidate_email))
>   where source = 'request' and status in ('requested','reviewing')
>     and candidate_email <> '';
> ```
>
> **One open ask per (referrer, email)** — a re-ask collides, so it cannot
> re-trigger the mail. With `dedupe_key = ask:<request_id>` on top it is
> enforced twice over. **No cooldown needed.**
>
> Re-asking only becomes possible once the referrer moves the row to `referred`
> or `declined` — their own action, and a legitimately new ask. The vector left
> is **one account asking many different referrers**, which spreads across many
> inboxes rather than bombing one; not gated initially, but the thing to watch
> if desks get volume.

## 4. Recommended design in full

```
  CANDIDATE                                              REFERRER
      │                                                      ▲
      │ asks (client-direct, RLS)                            │
      ▼                                                      │
┌─────────────────────────────────────────┐                   │
│ public.company_referral_requests        │                   │
│   INSERT  → referrer should be told     │                   │
│   UPDATE status → candidate should be   │                   │
└──────────────────┬──────────────────────┘                   │
                   │ AFTER INSERT OR UPDATE OF status         │
                   │ (same transaction; neither step can      │
                   │  fail the user's write)                  │
                   ▼                                          │
        ┌───────────────────────────────┐                      │
        │ public.notification_outbox    │  ← the seam          │
        │  dedupe_key UNIQUE      (R3)  │                      │
        │  channel: email (push later)  │                      │
        │  status: pending|sent|failed  │                      │
        │  attempts, last_error   (R4)  │                      │
        └───────────────┬───────────────┘                      │
                        │ 1. pg_net wake  → seconds            │
                        │ 2. cron sweep   → retry, every 5 min │
                        ▼                                      │
        ┌───────────────────────────────┐                      │
        │ api: POST /api/notifications/ │                      │
        │      drain  (secret-gated,    │                      │
        │             single-flight)    │                      │
        │  • claim FOR UPDATE SKIP      │                      │
        │    LOCKED  (parallel-safe)    │                      │
        │  • resolve recipient + prefs  │                      │
        │  • resend_email.send()        │                      │
        │  • stamp sent | failed+error  │                      │
        └───────────────┬───────────────┘                      │
                        └──────────── email ───────────────────┘

  IN-APP (unchanged, #329): Realtime + 60s poll + localStorage dedupe
  → keeps working for whoever is already looking. Additive, not replaced.
```

### The trigger

`AFTER INSERT OR UPDATE OF status ON company_referral_requests`: one
`INSERT ... ON CONFLICT (dedupe_key) DO NOTHING` into the outbox, then one
`net.http_post()` wake to the drain (§3, option E). Both are non-blocking — the
insert is local and `pg_net` enqueues rather than calls — so R5 holds by
construction, and **the row exists before the ping does**, which is what makes
the worst case late rather than lost.

`dedupe_key` is the whole of R3:

- ask → `ask:<request_id>`
- status → `status:<request_id>:<new_status>`

So Reviewing → Declined → Reviewing sends **one** Reviewing email, because the
second attempt collides on the unique index. Same lesson as the `login` event
dedupe: supabase-js re-emits `SIGNED_IN` on tab refocus, and without a key the
count inflates by however many times someone changed tabs.

> ⚠️ Fire on `UPDATE OF status`, not bare `UPDATE`. The status-only guard
> trigger (migration 057) stamps `updated_at` on every accepted update, so a
> bare `AFTER UPDATE` would queue a row for a nudge.

### The drain

A new secret-gated route following `POST /api/jobs/scan` exactly: `X-...-Secret`
compared to an env var, 403 when unset, and a **module-level single-flight lock
returning 409 on overlap**. That lock is not decoration — it is the fix for a
bug this repo has already shipped, where edge-dropped responses caused retries
to stack concurrent sweeps that redid the same work. With a `pg_net` ping *and* a
cron on the same queue, overlap is now the normal case rather than the rare one.

Claiming uses `FOR UPDATE SKIP LOCKED`, the same primitive as
`claim_extraction_batch`, so two drains never send the same email.

### Recipient resolution — the trap

> ⚠️ **DO NOT inner-join `user_profiles` to read notify prefs.** Measured:
> **78 of 92 users have no `user_profiles` row at all.** A recipient query that
> joins it finds 14 people and silently drops 85% of the audience — this is
> written down because it has already been found once, in the digest plan, and it
> is the single easiest way to make this feature look built and deliver nothing.
>
> `_notify_prefs_for_user()` in `services/email_triggers.py` already does it
> right: it returns `_DEFAULT_NOTIFY` when there is no row. Reuse that function;
> do not write a second prefs reader.

| Recipient | Address source | Note |
|---|---|---|
| candidate | `company_referral_requests.candidate_email` | stated at ask time; already validated by `isUsableEmail` |
| referrer | `auth.users.email` via `candidate_user_id`→desk owner | **service-role only** — a client could never do this, which is another reason the drain belongs in the api |

### The pref and its default

Add `referrals` to `notify_prefs`. ⚠️ **The default decides whether this feature
works at all.** With 85% of users having no row, `_DEFAULT_NOTIFY` *is* the
setting for almost everyone:

- `referrals: false` → the 85% get nothing, and this ships dark.
- `referrals: true` → it works, and someone can turn it off.

Recommend **`true`**, with the reasoning that this is not marketing: a referral
ask is a direct person-to-person request the recipient agreed to receive by
publishing a desk. `accountChanges` is already `True` by the same logic.

### Observability

`status`, `attempts` and `last_error` on the row, plus one log line per drain
naming counts. That is R4: a notification that failed is a queryable row saying
why, not an absence. Cap `attempts` at 5 and leave the row `failed` rather than
deleting it — the corpse is the evidence.

---

## 4b. ⚠️ CORRECTED — the bell exists, and it is now specific

> ⚠️ **THIS SECTION PREVIOUSLY SAID "there is no bell icon anywhere in this
> app". THAT WAS FALSE.** `components/NotificationBell.tsx` is mounted in
> `AppShell` for every signed-in user, with a dropdown and a red count. My grep
> for `Bell|bell` missed it because `aria-labelledby` contains the substring
> "bell"; those matches filled the first ten results and `head -10` cut off the
> real file. A check that could not see, reported as fact — the failure mode
> this file documents more than any other, walked into while writing about it.
>
> **The phase 1b that followed from it — "add a count badge to the rail" — is
> therefore obsolete and has been removed.** The bell already does that job, and
> does it better: it is a list, not a number.

**What was actually wrong was the copy, and the cause was structural.** The
bell's referral row read:

> A request you sent was updated (reviewing, referred, or declined).

⚠️ It **enumerated the possibilities instead of naming the one that happened**,
so being *referred* and being *declined* rendered as the identical string — the
best and the worst news in the product, in a list whose entire job is to tell
them apart.

⚠️ **And no wording could have fixed it, because `notificationFeed` took
`inboxUnread` and `outcomeUnread` NUMBERS.** It was a counter formatter. The
rows were in `ProductNoticesHost` all along and were discarded before the feed
was built.

**Fixed (shipped):** the feed takes rows and emits **one entry per referral**,
each naming its step in the title — *You were referred* / *Referral declined* /
*Now being reviewed* — with the detail in the body. One producer,
`outcomeNotificationCopy`, backs both the bell row and the toast so they cannot
drift. The toast's multi-row sentence, which had the same defect, now groups by
step: *"Referred at Acme. Declined at Beta."*

> ⚠️ A latent bug went with it: `NotificationBell` decided "persist a dismissal"
> by comparing against two **fixed** ids, so per-row ids would have fallen
> through and written every referral into the user's `dismissed_notices` jsonb
> permanently. It keys off `REFERRAL_ITEM_PREFIX` now.

**Still presence-dependent.** The bell only exists while the app is open, so
this makes the in-app half *correct* rather than making it *reach* anyone. That
is still what phase 2 is for.

## 5. Sequencing

| Phase | Work | Gets you |
|---|---|---|
| 0 | **Wait for one real desk + one real ask.** | the measurement this design does not have |
| 1 | migration: `notification_outbox` (with `channel`) + trigger + `notify_prefs.referrals` | the fact is durable the moment it happens, even with no sender |
| 2 | api drain route + `pg_net` wake + cron; reuse `_notify_prefs_for_user` | **R1, R2 — the referrer-on-ask email, which is the ask** |
| ~~3~~ | ~~email templates~~ **DONE** — `send_referral_ask` / `send_referral_status` in `services/resend_email.py`, on a shared Outlook-safe shell | step-naming copy; refuses an unknown status rather than falling back to "was updated" |
| 4 | admin panel reads `failed` rows | R4 end to end |
| 5 | *optional:* Web Push as `channel='web_push'` — service worker, VAPID, `push_subscriptions`, prompt **after a desk is published** | salience, on Chrome/Android and installed-PWA iOS only |

> Phase 1 alone is worth landing early and is safe: it starts **recording** what
> would have been sent, with no sender attached. After a week you can answer
> "how many notifications would this have delivered" from data rather than from
> a guess — and that number is what justifies phases 2–4.

> ⚠️ **Phase 5 is deliberately last and deliberately optional.** It is the only
> phase whose reach depends on something outside our control (a permission
> prompt we can ask once, and on iOS an install that almost nobody will do), and
> it is the only phase that cannot replace email for any user. Ship it as a
> salience upgrade for the people who opted in, never as the delivery mechanism.

## 6. Review of #331, since it was merged

**Access control: the claim holds, and it is in the right place.**
`fetchReferralRequestById` is client-direct with **no owner filter** — no
`.eq("referrer_id")`, no `.eq("candidate_user_id")` — so the entire boundary on a
packet carrying name, email, **phone**, LinkedIn, headline, years and a résumé
path is RLS. Verified rather than assumed:

```sql
-- migration 050
on public.company_referral_requests for select to authenticated
using (auth.uid() = candidate_user_id
       or private.user_owns_company_referrer(referrer_id))
```

`to authenticated` (anon reads nothing), and `candidate_user_id` is set
explicitly at insert (`lib/companyReferrers.ts:828`) with migration 045's INSERT
policy `(candidate_user_id is null or candidate_user_id = auth.uid())` stopping a
spoof. `robots: { index: false }` on the page. **Sound.**

**Migration 057 is careful about the thing most people miss:** it extends the
status-only immutability trigger to all three new columns, so a referrer cannot
rewrite a candidate's phone after the fact. Length and range checks present.

**Two findings, both already fixed in the merge commit on this branch:**

1. ⚠️ **Seven hardcoded hex values came back into
   `components/profile/CompanyReferrerPanel.tsx`** — `#374151`, `#6b7280`,
   `#4b5563`, `#2563eb`×3, `#dc2626`. That panel mounts *inside* the themed
   profile hub, so those are light-mode values on a page that may be dark: the
   exact defect that made this whole feature render identically in both themes.
   `referrerThemeTokens.test.ts` was **red and named all seven**, which is the
   second time that invariant has caught a regression in a rewrite it did not
   predict. Swapped to `--text` / `--muted` / `--accent` / `--red-ink`.
2. **`ReferralCandidatePacket.tsx` put raw `"` around an interpolation**, +2 on
   the lint ratchet. Fixed with curly quotes, the convention eight other
   components already follow.

---

## 7. ⚠️ Still the bigger open item

`/refer` makes company search the hero, and with `company_referrers` at **0** rows
**every search returns "No open referrers for that company yet"** — today that is
not an edge case, it is the only reachable result, rendered in muted grey with
nothing to do next. The approved comp (`public/mockups/refer-v1.html`) leads with
the side that works: an employee publishing a desk.

Main's #309/#310 rewrite changed that page's implementation, not its structure,
so the question is still open — **and no notification design matters until a
request can be created in the first place.**
