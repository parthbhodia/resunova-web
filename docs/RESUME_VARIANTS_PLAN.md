# Résumé Variants — named parallel profiles ("Default", "Judi Health", "+ New")

**Status: plan (nothing implemented).** Companion to the Tsenta-style version chips the user
requested 2026-07-14. This is NOT the same thing as #123's version *lineage* (rescore history
chained by `root_id`/`version` — a time axis). Variants are a **content axis**: parallel,
independently-editable profiles of the same person, e.g. a generalist default plus one leaned
toward a specific employer or role. Lineage keeps working *within* each variant.

## Data model

**Corrected 2026-07-14 during phase-1 implementation** — the original draft put a mutable
`is_default_variant` boolean directly on `resume_analyses`. Checked the live RLS policies on
that table first: it has **INSERT / SELECT / DELETE only, no UPDATE** (migration 034's own
comment says so — rows are append-only by design). A boolean meant to be flipped later cannot
live on a table nothing can update. Fixed below.

New columns on **`resume_analyses`** (migration `037`, additive, nullable, **written once at
INSERT and never mutated** — legacy rows are implicitly the default variant):

| column | type | meaning |
|---|---|---|
| `variant_group` | uuid | One group per user-résumé identity. Nullable; NULL rows all coalesce into one implicit group at the read layer, so no backfill is needed for v1 (effectively every user has exactly one group today — the column exists for a hypothetical future multi-identity case, e.g. an advisor managing several people). |
| `variant_name` | text | Display name ("Default", "Judi Health"), fixed at creation. |

**Which variant is "current" is a separate, mutable POINTER — `user_profiles.default_variant_name`**
(same table, same update-capable RLS pattern as `tailoring_mode`), not a flag on the immutable
rows. "Set default" / rename become simple `user_profiles` writes; renaming a variant does NOT
rewrite historical rows' `variant_name` — it stores a display-name override
(`user_profiles.variant_display_names` jsonb, keyed by the original `variant_name`) that the
read layer applies. This mirrors how `tailoring_mode` already works and avoids ever needing an
UPDATE on `resume_analyses`.

- Rows stay append-only snapshots (existing invariant). A variant's "current" content is its
  newest lineage head *within* `(variant_group, variant_name)` — `groupAnalysesByRoot` already
  gives us heads; we add a variant grouping layer above it in `lib/analyzeVersions.ts`.
- **Jobs feed / Boost read "latest resume_analyses row"** on the API side today. That query
  changes to "latest row of the default variant" (fallback: latest row at all, so legacy users
  and pre-deploy rows behave identically). This is the one **backend** touch (resunova-api,
  `_latest_analysis_for_user`-style helpers in `routes/jobs.py` + boost).
- `resumes` (tailored rows) are already per-JD artifacts — they stay out of scope for v1.

## Challenges → how to tackle each

1. **Two version axes colliding (lineage vs variants).** Tackle: variants are a grouping ABOVE
   lineage, never a replacement. Duplicating a variant copies the head snapshot into a NEW
   `root_id` (fresh lineage) with the same `variant_group` + new name. Rescores inside a variant
   keep chaining by `root_id` as today.
2. **"Which résumé do Jobs rank against?"** becomes ambiguous with N variants. Tackle: the
   `is_default_variant` flag + a star affordance on the chip (matching Tsenta's ★). The Jobs
   feed banner gets a one-line "Ranked against: Default ▾" so the choice is visible where it
   matters, not buried in settings.
3. **Edit drafts are keyed by analysis id** (`rn_az_edit_v2_<id>` + store `hiddenPaths` etc.).
   Tackle: nothing changes — drafts already key on the analysis row id, and each variant has its
   own rows. Switching chips = restoring a different saved analysis (the `?analysis=<id>`
   restore path that already exists).
4. **Scan quota abuse** — duplicating shouldn't burn a daily scan. Tackle: "Duplicate" copies
   the stored `result` JSON verbatim client-side (new row via `insertAnalysis`, no LLM);
   "Import from file" goes through the normal `/api/analyze-upload` and DOES count (it is a
   real scan). The create dialog says which is which.
5. **Name collisions / orphaned defaults.** Tackle: unique `(variant_group, variant_name)`
   index; deleting the default promotes the most-recently-active variant (single UPDATE in the
   same transaction, service-role endpoint).

## UI/UX — where it lives and how it shows

- **Placement: a chip row directly ABOVE the preview panel** in Analyze (`AnalyzeResume`
  header area, same visual line as the Recent Analyses toggle) — the exact slot Tsenta uses.
  Chips: `★ Default` (filled), `Judi Health`, `+ New`. Overflow scrolls horizontally (same
  pattern as the featured-companies rail). Each chip has a ⋮ menu: Rename / Set default /
  Duplicate / Delete.
- **`+ New` opens a Create dialog** mirroring the reference screenshot: name field with role
  placeholder, "Start from" = **Duplicate** (copy-from dropdown listing existing variants) or
  **Import from file** (reuses the existing upload dropzone → analyze-upload flow).
- **Tailor**: no chip row of its own; the upload step's "From library" picker groups items by
  variant so you pick which profile to tailor. (Tailor is per-JD; variants are inputs to it.)
- **My Resumes**: analyzed cards gain a small variant badge; filter dropdown gains "Variant".

## Phases (each independently shippable)

1. **Migration 037 + read-model** (`lib/analyzeVersions.ts` variant grouping + types;
   `insertAnalysis` carries variant fields; legacy rows = implicit default). Zero UI.
2. **Chip row + create dialog** in Analyze (duplicate + import paths, rename/delete/set-default
   via ⋮). Restore-on-click through the existing `?analysis=` path.
3. **API: default-variant ranking** — jobs feed/boost "latest analysis" helpers prefer the
   default variant; "Ranked against" banner in the Jobs feed.
4. **Polish**: My Resumes badges/filter, Tailor library grouping, advisor view labels.

## Test plan sketch

- Unit: variant grouping over mixed legacy/new rows (no variant fields → single implicit
  default group); duplicate-copies-head; default uniqueness.
- Migration: applied to prod project `eiumlptnsmowvkxucprl` via MCP after the file lands.
- Manual: create → edit variant B → confirm variant A's preview untouched; set B default →
  Jobs feed re-ranks; delete default → promotion.
