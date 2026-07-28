# Résumé storage — backend architecture

Two models grew at different times: an **append-only scan log** and an
**editable version object**, in separate tables, surfaced on separate pages.

## The tables

| Table | Role | Key columns | RLS | Read by |
|---|---|---|---|---|
| **`resume_versions`** | editable core (edit without re-scan) | `structured` (jsonb) + `extracted_text`, `name`, `origin` (upload\|duplicate\|profile\|tailor\|manual), lineage `root_id`/`parent_id`/`version`, `source_pdf_url`, per-version JD (`jd_text`/`jd_company`/`jd_title`), `last_score`/`last_score_source`, `is_default` | owner — **all 4 verbs incl. UPDATE** | `/my-resumes`, `lib/resumeVersions.ts` |
| **`resume_analyses`** | append-only scan log | `result` (jsonb: scores + extracted text), `score`, **`source_pdf_url`** + `source_filename`, lineage, `score_source`, **`version_id → resume_versions`** | owner — INSERT/SELECT/DELETE, **no UPDATE** | Library (analyzed), Advisor |
| **`resumes`** | tailored output | `folder`, `pdf_url`, `structured`, `job_description`, public share slug | owner-scoped | Library (tailored) |
| **`template_builder_resumes`** | builder drafts | `label`, `data` (jsonb `TBResumeData`) | owner — incl. UPDATE | Library (builder), `/template-builder` |
| **`cover_letters`** | cover letters | — | owner-scoped | Library (cover_letter) |

## How they connect

- **`resume_analyses.version_id → resume_versions.id`** (nullable, `ON DELETE SET NULL`, migration 037) — a scan links back to the version it scored (0..N per version). This is the seam a merge grows along.
- **Lineage** (git-like) on both `resume_versions` and `resume_analyses`: `root_id` groups all versions of one résumé, `parent_id` chains a version to the one it was edited from, `version` is the ordinal (v1 → v2 → v3). A fresh version roots itself via a trigger.
- On `resume_analyses`, "saved edits" append an **immutable child** row (it has no UPDATE policy) rather than mutating.

## Two UI homes (today)

- **Library** — `/?view=library` (`ResumeLibrary`) = `resumes` + `resume_analyses` + `template_builder_resumes` + `cover_letters`, normalized into one `LibraryItem` union by `fetchLibraryItems()`.
- **My Résumés** — `/my-resumes` (`MyResumes`) = `resume_versions`. Boost + the version editor already save here.

## Access pattern

Mostly **client-direct via Supabase RLS** (`lib/resumeVersions.ts`, `lib/supabase.ts`) — very little résumé storage lives in the Python API.

## Source of record

`web/db/migrations/` — 037 (versions + `version_id`), 034 (analysis lineage), 035 (score source), 008 (source PDF), 011 (builder). Applied-direct to Supabase project `eiumlptnsmowvkxucprl`.

See [`RESUME_STORAGE_MERGE_PLAN.md`](./RESUME_STORAGE_MERGE_PLAN.md) for the plan to unify these into one home.
