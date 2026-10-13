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

## Advisor

| Endpoint | Method |
|----------|--------|
| `/api/advisor-access` | GET |
| `/api/cohort-stats` | GET |
| `/api/student-detail` | GET |

## Types to keep in sync

When the API changes these fields, update:

- `store/resumeAnalyzeStore.ts` — `StructuredResume`, analyze result types
- `lib/types.ts` — `RatingsData`, tailor types
- `lib/analysisCategoryMatch.ts` — category key union
- `lib/requirementMatch.ts` — JD match types

## Versioning

Breaking API changes should be coordinated between backend (`resunova-api`) and this repo. Prefer additive JSON fields over renames.
