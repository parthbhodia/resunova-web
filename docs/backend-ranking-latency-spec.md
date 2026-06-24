# Backend spec: cut résumé-scan latency before the jobs feed ranks

**Repo:** `resunova-api` (this doc lives in `resunova-web` because the frontend
half ships here; move/file it as a `resunova-api` issue).

**Status:** proposal · pairs with the frontend "progressive ranking" change in
`resunova-web` (`JobsFeed.tsx` / `JobsOnboardingWizard.tsx`).

## Problem

After the "Jobs for you" wizard, uploading a résumé blocks the user for ~15s on
`POST /api/analyze-upload` before `GET /api/jobs/feed` can return ranked jobs.

`analyze-upload` today does, synchronously, before returning:

1. parse the file → extract text + structured résumé
2. derive the matching **profile** (roles / skills / locations)
3. **ATS scan + category scoring + bullet analysis** ← the slow NLP (~most of the 15s)
4. persist the analysis row (`user_analyses`)
5. return the full analysis

But `/api/jobs/feed` ranking only needs **(1)+(2)** — résumé text + profile. Steps
**(3)** (bullet/category/topIssues) are consumed later, by the job-detail and
Boost views, *not* by feed ranking. So the feed waits ~15s on work it doesn't use.

## Fix — Option 1: two-phase single endpoint

Keep `POST /api/analyze-upload` as the only endpoint the client calls, but split
its work so **ranking is unlocked as soon as the profile is persisted**, and the
heavyweight analysis finishes afterward.

### Sequence
1. Parse → extract text + structured résumé → derive profile (steps 1–2).
2. **Persist the profile immediately** to `user_analyses` (or a lightweight
   `user_resume_profiles` row keyed by `user_id`), with a status like
   `profile_ready` and the full-analysis columns null.
3. **Return now** (≈1–2s) with enough for the client to proceed — minimally an ok
   status; the response can omit the heavyweight fields (`bulletAnalysis`,
   `categoryScores`, `topIssues`) or send them as `null`/`pending`.
4. **Compute the full analysis in the background** (task queue / `BackgroundTasks`
   / worker) and update the same row to `analysis_ready` when done. No second
   client call required for ranking.

### Ranking reads the profile, not the full analysis
`GET /api/jobs/feed` must rank off the **profile** the moment it exists:
- It already looks up the latest `user_analyses` row by JWT `user_id`. Ensure it
  treats a `profile_ready` row as rankable (uses résumé text + profile + the
  deterministic, zero-token weighted scorer). Do **not** require the
  bullet/category fields to be populated.
- `resumeAnalysisId` in the feed response = the profile row id (already the
  contract).

### Detail / Boost tolerate "analysis pending"
`GET /api/jobs/{id}` and `POST /api/jobs/boost` consume the full analysis. If a
user opens a job detail in the brief window before the background analysis lands:
- Prefer: those endpoints **compute/complete the analysis on demand** for that
  résumé if the row is still `profile_ready` (lazy finalize), then proceed.
- Or: return a `analysisPending: true` flag and let the client show a short
  spinner only there (rare; only if they open a detail within ~10s of upload).

## Acceptance
- `analyze-upload` p50 time-to-response drops from ~15s to ~1–2s (profile persist).
- `GET /api/jobs/feed` returns `ranked: true` immediately after that response, for
  the new résumé.
- Full analysis (`bulletAnalysis` etc.) is available within the background window
  and is identical to today's output — no quality regression in the scorer.
- No new required client round-trip; the existing frontend progressive-ranking
  flow (show feed instantly → upgrade to ranked in place) lights up end-to-end in
  ~1–2s instead of ~15s.

## Notes / migration
- Add a status column to `user_analyses` (`profile_ready` | `analysis_ready`) or a
  separate profile table; backfill is unnecessary (existing rows are already full).
- Keep the deterministic zero-token feed scorer unchanged.
- Idempotency: a re-upload supersedes the latest row as today (feed reads latest).
