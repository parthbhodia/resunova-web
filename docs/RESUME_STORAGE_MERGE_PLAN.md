# Résumé storage merge — one home for résumés

> **DIRECTION REVERSED (2026-07-24).** Production evidence (resume_versions at
> 0 rows ever; 10/39 60-day users returning; an observed user reaching for
> edit right at the score) flipped the winner: **the Library hub
> (`/?view=library`) is the ONE home**, and `/my-resumes` is retired behind a
> client redirect. Editing moved to the moment of score. Shipped as M1-M4
> (web #167 nav repoint + redirect, #169 edit-at-score + versions dual-write +
> `source_root_id` + `client_events`, #171 versions as hub cards with
> absorption + in-pane editor, and the M4 cleanup PR deleting the workspace).
> Design doc: `~/.gstack/projects/resunova/parth-main-design-20260724-012719.md`.
> The sections below are the ORIGINAL plan, kept for lineage — do not resume
> its direction.

**Goal (superseded):** make `/my-resumes` (the résumé-versions workspace) the single place a
user manages résumés, folding in the legacy **Library** (`/?view=library`) so
there aren't two disconnected "My Résumés" surfaces.

## Where we are

Two models grew at different times (full map in
[`RESUME_STORAGE_ARCH`](./RESUME_STORAGE_ARCH.md) / the migrations):

| Table | Role | Surface today |
|---|---|---|
| `resume_versions` | **editable core** (edit without re-scan) | `/my-resumes` (account menu) |
| `resume_analyses` | append-only scan log + uploaded source PDF | Library (analyzed) |
| `resumes` | tailored output (generated PDF) | Library (tailored) |
| `template_builder_resumes` | builder drafts | Library (builder) |
| `cover_letters` | cover letters | Library (cover_letter) |

The seam already exists: **`resume_analyses.version_id → resume_versions.id`**
(nullable, `ON DELETE SET NULL`, migration 037).

**Invariants that must survive the merge**
- `resume_analyses` stays **append-only + immutable** (no UPDATE RLS). Versions
  own editing; scans stay the honest record. Advisors keep reading it unchanged.
- No destructive/irreversible data migration until the UI merge has proven out.
- The résumé-ranked Jobs/Boost path (latest `resume_analyses` = working résumé)
  keeps working.

## Phases

### Phase 1 — UI unification (no data migration) ← this PR
Make `/my-resumes` the single home **without touching the schema**:
- `/my-resumes` additionally fetches `fetchLibraryItems()` and shows the legacy
  items (analyzed / tailored / builder / cover letter) in a **"From your
  history"** section below the versions list. Each item's "Open" reuses the
  existing Library/Analyze routes — no new detail UI.
- Repoint the sidebar **"My Resumes"** nav (and the mobile tab) to route to
  `/my-resumes` instead of the in-app `view="library"`. The `/?view=library`
  route stays live (the history items still open into it), it's just no longer
  the primary nav target.
- **Reversible, additive, zero schema/RLS change.** Nothing is hidden — every
  résumé a user already had still appears, now in one place.

Verification: tsc + vitest + `next build`. The signed-in `fetchLibraryItems`
merge reuses the Library's own proven fetch, but the combined render needs one
live pass (auth-gated, not exercisable in the sandbox).

### Phase 2 — Promote history into versions ← this PR
A **"Save as version"** action on each analyzed/tailored history item creates a
first-class editable version from it (client-direct `createVersion` — no scan,
no server change). Structured content is pulled from the item
(`result.structuredResume` for analyzed, `record.resume_doc.structured` for
tailored) and normalized. **Honesty:** an analyzed item carries its real quality
score (`last_score_source='llm'`); a tailored item's JD-**match** % is
deliberately NOT carried as a version quality grade. Drafts / cover letters keep
their own editors (no promote).

**Server primitive (shipped):** `POST /api/analyze-link-version` (resunova-api)
stamps `resume_analyses.version_id` on an already-persisted, owner-owned scan —
service-role, back-reference FK only, so the scan's content stays immutable.
A fresh Analyze upload writes its scan row *before* the client knows the version
id, so the link can't be set at insert; this is the after-the-fact primitive.
`linkAnalysisToVersion` (web, best-effort) calls it when **promoting an analyzed
item** ("Save as version"), so that version's scan history includes the original
scan right away.

Deferred (riskier, next): auto-attaching *every* new scan/upload to a version
(no manual promote) — it changes the load-bearing Analyze/Boost save path and
needs create-or-reuse dedupe, so it waits until the promote flow proves out live.

### Phase 3 — Library becomes per-version history
The old Library grid becomes a **"scans & history"** view scoped to a version
(reachable from the version), not a top-level peer of `/my-resumes`. Retire the
standalone `?view=library` nav entry once Phase 1+2 cover everything.

**Shipped (additive):** the version editor now carries a **"Scan history"**
panel — the `resume_analyses` rows linked to the version via `version_id`
(each in-place "Scan & score" appends one), each deep-linking to the full
Analyze report. Read-only, RLS-scoped, degrades to `[]` if `version_id` is
absent (`listScansForVersion`). This is the "scans scoped to a version" surface;
it does **not** yet retire the `?view=library` nav peer — that removal is gated
on the live signed-in pass Phase 1+2 still need (and on `version_id` being
populated for more than just in-place scores, i.e. Phase 2b).

### Phase 4 (optional) — Backfill
One-time, reversible migration that turns legacy standalone analyses/tailored
résumés into `resume_versions` (grouped by their existing `root_id` lineage), so
"From your history" empties into first-class versions. Gated behind a live audit.

## Status
- [x] Phase 1 — UI unification (/my-resumes surfaces history + nav points there)
- [x] Phase 2 — "Save as version" promotes analyzed/tailored history into versions
- [~] Phase 2b — link primitive (`/api/analyze-link-version`) shipped + wired
  into the promote flow; auto-attach on *every* fresh scan still deferred
- [~] Phase 3 — per-version "Scan history" panel shipped; retire `?view=library`
  nav peer still gated on the live pass + Phase 2b
- [ ] Phase 4 — backfill (optional)
