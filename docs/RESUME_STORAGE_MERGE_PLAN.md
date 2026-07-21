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

### Phase 2 — New work attaches to a version
Analyze upload / `analyze-rescore` / Boost create-or-attach a `resume_versions`
row and stamp `resume_analyses.version_id`, so a fresh scan/upload shows up as a
version rather than a standalone Library row. Uses the existing
`createVersion` / `version_id` write path (already present, best-effort).

### Phase 3 — Library becomes per-version history
The old Library grid becomes a **"scans & history"** view scoped to a version
(reachable from the version), not a top-level peer of `/my-resumes`. Retire the
standalone `?view=library` nav entry once Phase 1+2 cover everything.

### Phase 4 (optional) — Backfill
One-time, reversible migration that turns legacy standalone analyses/tailored
résumés into `resume_versions` (grouped by their existing `root_id` lineage), so
"From your history" empties into first-class versions. Gated behind a live audit.

## Status
- [ ] Phase 1 — UI unification (in progress)
- [ ] Phase 2 — attach new work to a version
- [ ] Phase 3 — Library → per-version history
- [ ] Phase 4 — backfill (optional)
