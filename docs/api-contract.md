# API contract (frontend ↔ backend)

The backend is deployed separately (Railway). This document lists endpoints and response fields the UI depends on. **Do not duplicate algorithm logic here** — only HTTP shapes.

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `https://api.resunova.io`).

Auth: Supabase JWT in `Authorization: Bearer <token>` on protected routes.

## Core Analyze flow

### `POST /api/analyze-upload`

Multipart: `file` (PDF/DOCX).

Response (key fields):

| Field | Type | Notes |
|-------|------|-------|
| `overallScore` | number | 0–100 |
| `categoryScores` | object | Keys: `quantification`, `achievementQuality`, `readability`, `languageQuality`, `sectionStructure`, `atsCompatibility`, … |
| `bulletAnalysis` | array | Sparse weakest bullets only |
| `bulletAnalysis[].primaryCategory` | string | Category this bullet's rewrite fixes |
| `bulletAnalysis[].issueCategories` | string[] | All categories bullet is weak in (display) |
| `bulletAnalysis[].improvedBullet` | string | Suggested rewrite |
| `bulletAnalysis[].categoryRewrites` | object | Per-category rewrite map |
| `topIssues` | array | Global issues |
| `extractedText` | string | Synthesized preview text |
| `structuredResume` | object | Typed doc for structured preview |
| `analysisId` | string? | Saved analysis row id |
| `experienceSummary` | object? | Tenure chip data |

### `POST /api/analyze`

JSON body: `candidate_profile`, optional `job_description`, `include_bullet_analysis`, `structured_resume`.

Returns same rating shape as analyze-upload (Tailor rescore path).

### `POST /api/export-pdf-html`

JSON: `{ "html": "<full page HTML>", "filename": "..." }` → PDF bytes.

### `GET /api/health`

`{ "ok": true, "service": "resume_gui" }` — liveness only. It does not call the scoring model and does not say whether scans are being accepted. A proxy 502 with no app log never reaches this route.

### `GET /api/scoring-status`

Last scoring-model result already recorded by a real scan. This route does not call the model.

| Field | Type | Notes |
|-------|------|-------|
| `scoring` | `"ok"` \| `"paused"` | `paused` only for a refusal in the last 10 minutes |
| `reason` | `"rate_limit"` \| `"auth"` \| `"timeout"` \| null | null when scoring is ok |

The scan screen reads this and says scoring is paused. The rest of the site stays up.

## Tailor / gap fix

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload-resume` | POST | Library upload + structured extract |
| `/api/suggest-gap-fix` | POST | JD gap rewrite suggestions. Additive: `suggested_role` on a suggestion retitles that existing Experience role (aggressive mode only; frontend also fills this from the posting title when the model omits it). |
| `/api/extract-jd` | POST | Parse job description URL/text |

## Public share links

Recipients open `/r/?id=<shortid>`. Minting and revoking happen from `ShareButton`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/share/{folder}` | POST | Mint (or reuse) a link (auth). Body `{ pdf_url }`. Response `{ shortid, pdf_url, views?, reused }` |
| `/api/share/{shortid}` | GET | Public resolve to `{ shortid, folder, pdf_url, views, created_at }`. `410` when revoked |
| `/api/share/{shortid}` | DELETE | Owner revoke (auth) |

Create and revoke act as the Supabase bearer's user and `401` without one. A `user_id` in the body is ignored; `ShareButton` still sends it, which is harmless.

`folder` is either a tailored résumé's library folder (checked against `resumes`) or `analyze-<analysis id>` for an Analyze scan (checked against `resume_analyses`). For a scan the backend always links the stored `source_pdf_url` and ignores the `pdf_url` in the body. A scan with no uploaded PDF returns `404`, so the UI only offers Share when `sourcePdfUrl` is set.

## Referral rewards

Supabase bearer. See [`REFERRAL_REWARDS_HLD.md`](REFERRAL_REWARDS_HLD.md).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/referral/rewards` | GET | The caller's `referral_reward_ledger` rows, newest first (auth; `resunova-api` `feat/referral-rewards`) |

Response `{ entries: [...] }`, each entry `{ id, kind, source, days, status, subject, createdAt, grantedAt }`.

`kind` ∈ `referred` | `interview` | `invite_signup` | `invite_activated`. `source` ∈ `desk_referral` | `invite`. `status` ∈ `pending` | `granted` | `revoked`.

`pending` is normal for a few seconds: a database trigger records the award and the backend has not yet extended the subscription. The UI shows those days as "on the way" rather than hiding them, so **do not filter pending rows out of this response** or a reward looks like it was never earned.

A `404` is the expected response until this route ships; the client reads it as an empty list, not an error.

The candidate-reported outcome does **not** go through this API. It is the `report_referral_outcome` RPC called on Supabase directly, because RLS grants UPDATE on the request row to the referrer rather than to the candidate.

## Advisor

| Endpoint | Method |
|----------|--------|
| `/api/advisor-access` | GET |
| `/api/cohort-stats` | GET |
| `/api/student-detail` | GET |

## Extension (Chrome)

The Resunova Auto-Fill extension authenticates with **its own revocable session token**, not
with the user's Supabase tokens. Two-step handshake:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/extension/connect-code` | POST | Supabase bearer | Mint a single-use code (2 min TTL). Only the sha256 is stored. |
| `/api/extension/exchange` | POST | the one-time code | Consume it, return a 30-day session token + `{id,email}`. Only the sha256 is stored. |
| `/api/extension/refresh` | POST | extension session | Rotate the session (invalidates the old token). |
| `/api/extension/revoke` | POST | extension session | Revoke it. |
| `/api/extension/profile` | GET | extension session | Return the merged profile + `profileComplete`. |
| `/api/extension/applications` | POST | extension session | Record the job whose form was just filled. Lands as `status: "saved"`. |
| `/api/extension/applications/{app_id}` | PATCH | extension session | Change status, e.g. to `"applied"` on submit. |

### `POST /api/extension/applications`

Body: `{ url, company?, title?, location? }`.

- `url` must be `http(s)` and is the only required field. Anything else is 400, because the stored value renders as an `href` in the tracker and a `javascript:` URL there would be stored XSS.
- The backend matches `url` against `job_postings.external_url`, exactly first and then normalised for query string and trailing slash. On a match it takes `company`, `title` and `location` from the posting and sets `posting_id`, so the tracker row carries the rich card. Client-supplied values are used only when there is no match.
- `user_id` always comes from the extension session, never from the body.
- Re-filling never moves a row backwards. `_should_set_status` from `routes/applications.py` decides, so a job at `interviewing` stays there and a `rejected` job is not silently reopened.

Response: `{ id, status, created }`.

### `PATCH /api/extension/applications/{app_id}`

Body: `{ status }`, one of the `job_applications` statuses. Scoped to the session user; another user's id returns 404, deliberately indistinguishable from a missing row. `applied_at` is stamped only the first time an active status is set.

The frontend reads these rows through the existing `GET /api/applications`, so the Application Tracker needs no change. `source` is stored but not rendered by the tracker today.

`GET /api/extension/profile` response:

| Field | Type | Notes |
|-------|------|-------|
| `profile` | object | See below |
| `profileComplete` | boolean | `name` and `email` both non-empty. `false` means "complete your profile". |

`profile` merges two existing per-user records, and only those two. There is no
extension-specific profile table:

- `user_extracted_profiles.profile` (resume-derived career profile) wins where both have a value.
- `user_profiles.profile` (Tailor defaults + EEO) fills the gaps. EEO values come **only** from here.
- The account email is the last resort for `email`, and never overrides an explicit value.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | |
| `preferredName` / `country` | string | Application autofill details from `user_profiles.profile` |
| `email` | string | Falls back to the login address |
| `phone` / `location` / `headline` / `summary` / `role` | string | `location` is the person's own `currentLocation` ("City, ST", saved on `/profile`) when set, otherwise the résumé's |
| `linkedin` / `github` / `portfolio` | string | |
| `skills` | string[] | Non-array values are normalised to `[]` |
| `experience` / `education` / `projects` | array | Non-array values are normalised to `[]` |
| `eeoWorkUs` / `eeoSponsor` / `eeoDisability` / `eeoVeteran` / `eeoGender` / `eeoLgbtq` | string | Optional disclosure answers |

Access is declared in the backend's `routes/access.py` POLICY. Only `connect-code` sits behind a
Supabase session; the other four authenticate inside the handler against `extension_sessions`,
because the extension presents a non-Supabase token that the central gate would reject. Both
tables are service-role only, RLS on, with no browser grants (migration 053).

## Types to keep in sync

When the API changes these fields, update:

- `store/resumeAnalyzeStore.ts` — `StructuredResume`, analyze result types
- `lib/types.ts` — `RatingsData`, tailor types
- `lib/analysisCategoryMatch.ts` — category key union
- `lib/requirementMatch.ts` — JD match types

## Versioning

Breaking API changes should be coordinated between backend (`resunova-api`) and this repo. Prefer additive JSON fields over renames.
