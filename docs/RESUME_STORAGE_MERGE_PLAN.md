# Résumé storage merge — one home for résumés

**Goal:** make `/my-resumes` (the résumé-versions workspace) the single place a
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

Deferred (riskier, next): auto-attaching every new scan/upload to a version and
stamping `resume_analyses.version_id` server-side — it changes the load-bearing
Analyze/Boost save path, so it waits until the promote flow proves out live.

### Phase 3 — Library becomes per-version history
The old Library grid becomes a **"scans & history"** view scoped to a version
(reachable from the version), not a top-level peer of `/my-resumes`. Retire the
standalone `?view=library` nav entry once Phase 1+2 cover everything.

### Phase 4 (optional) — Backfill
One-time, reversible migration that turns legacy standalone analyses/tailored
résumés into `resume_versions` (grouped by their existing `root_id` lineage), so
"From your history" empties into first-class versions. Gated behind a live audit.

## Status
- [x] Phase 1 — UI unification (/my-resumes surfaces history + nav points there)
- [x] Phase 2 — "Save as version" promotes analyzed/tailored history into versions
- [ ] Phase 2b — auto-attach new scans/uploads to a version (server, deferred)
- [ ] Phase 3 — Library → per-version history
- [ ] Phase 4 — backfill (optional)
