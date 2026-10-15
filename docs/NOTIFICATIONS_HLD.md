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

## 3. Options considered

| | Approach | Reaches closed tab | Retryable | Observable | Blast radius |
|---|---|---|---|---|---|
| **A** | DB trigger → `pg_net` → Resend, inline | yes | **no** | **no** | small |
| **B** | DB trigger → **outbox table** → api drains it | yes | yes | yes | small |
| **C** | Route referral writes through the api | yes | yes | yes | **large** |
| **D** | Realtime + poll only (today) | **no** | n/a | n/a | zero |

**A is the tempting one and it is wrong.** An HTTP call inside a trigger has two
endings and both are bad: it raises and **aborts the referral the user just
submitted** (violates R5), or it is swallowed and the notification vanishes with
no record (violates R4). That is precisely the shape this codebase keeps paying
for — a frozen SEO cache that went green, a snapshot workflow that went green
over a total outage, a `catch {}` that rendered a 401 as "∞ Unlimited".

**C undoes the feature's architecture** to buy a send path. The client-direct +
RLS design is working and its tenant boundary is in the database, which is the
right place for it. Do not trade that away for an email.

**Recommended: B.** It splits the two facts that must not share a fate —
*the referral happened* (durable, inside the transaction) and *the notice was
delivered* (retryable, outside it).

---

## 4. Recommended design

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
                   │ (same transaction — cannot be lost,      │
                   │  cannot call out, cannot fail the write) │
                   ▼                                          │
        ┌───────────────────────────────┐                      │
        │ public.notification_outbox    │  ← the seam          │
        │  dedupe_key UNIQUE  (R3)      │                      │
        │  status: pending|sent|failed  │                      │
        │  attempts, last_error  (R4)   │                      │
        └───────────────┬───────────────┘                      │
                        │ service-role drain, every 5 min      │
                        ▼                                      │
        ┌───────────────────────────────┐                      │
        │ api: POST /api/notifications/ │                      │
        │      drain  (secret-gated)    │                      │
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

`AFTER INSERT OR UPDATE OF status ON company_referral_requests`, writing one
outbox row. It only ever does an `INSERT ... ON CONFLICT (dedupe_key) DO
NOTHING` into a local table — no network, no failure mode that can reach the
user's write. R5 holds by construction.

`dedupe_key` is the whole of R3:

- ask → `ask:<request_id>`
- status → `status:<request_id>:<new_status>`

So Reviewing → Declined → Reviewing sends **one** Reviewing email, because the
second attempt collides on the unique index. This is the same lesson as the
`login` event dedupe: supabase-js re-emits `SIGNED_IN` on tab refocus, and
without a key the count inflates by however many times someone changed tabs.

> ⚠️ Fire the trigger on `UPDATE OF status` only, not bare `UPDATE`. The
> status-only guard trigger (migration 057) stamps `updated_at` on every
> accepted update, so a bare `AFTER UPDATE` would queue a row for a nudge.

### The drain

A new secret-gated route, following `POST /api/jobs/scan` exactly: `X-...-Secret`
compared to an env var, 403 when unset, **single-flight module lock returning 409
on overlap** — that lock is not decoration, it is the fix for a bug this repo has
already shipped once, where edge-dropped responses caused retries to stack
concurrent sweeps that re-did the same work.

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

## 5. Sequencing

| Phase | Work | Gets you |
|---|---|---|
| 0 | **Nothing. Wait for one real desk + one real ask.** | the measurement this design does not have |
| 1 | migration: `notification_outbox` + trigger + `notify_prefs.referrals` | the fact is durable the moment it happens, even with no sender |
| 2 | api drain route + cron + reuse `_notify_prefs_for_user` | R1, R2 |
| 3 | email templates (ask received / status changed) | — |
| 4 | admin panel reads `failed` rows | R4 end to end |

> Phase 1 alone is worth landing early and is safe: it starts **recording** what
> would have been sent, with no sender attached. After a week you can answer "how
> many notifications would this have delivered" from data rather than from a
> guess — and that is the number that justifies phases 2–4.

---

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
