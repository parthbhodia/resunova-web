# Resume Versions — a Tsenta-style "version as the core object" plan

Status: **proposed** (product direction, not started).

## The problem (user-reported, comparing to Tsenta)

Today, tailoring for a new JD means **re-scanning** the résumé. There's no "make a
named version for this JD and just edit it." Tsenta's Resume page is built around
one primitive — a **named résumé version** (`+ New` → *Duplicate* an existing one
or *Import from file*) — edited **conversationally** ("tell me what to change",
with persistent *always/never* rules), on **one clean surface**. Ours is split
across four surfaces (Analyze · Tailor · Template Builder · Profile), each dense,
and editing is click-a-category-apply-a-fix, not "no-rescan, just change it."

Goal: make the **résumé version** the core object — create / duplicate / import,
switch between them, and **edit without re-scanning** — on a calmer single surface.

## What we can REUSE (the bones already exist)

| Capability | Where it lives today | Reuse for |
|---|---|---|
| **Version lineage** (append-only child versions, `rootId`/`parentId`/`version`) | `resume_analyses` (migrations 034/035); `createAnalysisVersion` | The version chain per résumé |
| **Named, editable, reloadable drafts** | `template_builder_resumes` (migration 011); "Save to Hub" / `?builder=<id>` | **The closest thing to Tsenta's named profiles** — a named résumé you reopen and edit |
| **WYSIWYG live preview + inline edit** | `AnalyzeLiveResumeBody` (renders `structuredResume`; `lineOverrides`/`fieldOverrides`; hide-a-bullet) | Editing a version in place |
| **Apply-a-fix / rescore engine** | `patchAppliedEditsIntoResume`, `estimateScoreAfterFixes`, `/api/analyze-rescore` | Applying edits to a version without a fresh upload |
| **Chromium WYSIWYG export** | `useHtmlPdfExport` → `/api/export-pdf-html` | Download per version (unchanged) |
| **Career Profile as source data** | `user_extracted_profiles` (this session) | "Duplicate from my profile" as a starting point |
| **Structured extraction (import)** | `/api/upload-resume` → `structuredResume` | "Import from file" to seed a new version |

So a lot of Tsenta's model maps onto primitives we already ship. The gap is
**unification + create-fresh + (optionally) a chat layer**, not a from-scratch build.

## What is NET-NEW

1. **A "résumé version" object you create fresh / duplicate / import** — today
   `resume_analyses` versions are *scan-derived* (a child is only born from an
   existing analysis's applied edits). We need a "New version" that starts from
   (a) Duplicate an existing version, (b) Import a file, or (c) the Career
   Profile — **without a scan**. The data model (rootId/version) already supports
   the chain; what's missing is a non-scan create path + a user-given **name**
   (add a `name`/`label` we can edit; `resume_analyses.label` already exists).
2. **A version switcher on the primary surface** (the `★ Default` + `+ New`
   dropdown). We have `expandedGroups`/`rootId` grouping in the Analyze history
   rail — this promotes it to a first-class switcher.
3. **Edit-without-rescan** — apply changes (including JD-tailoring) directly to
   the active version via the existing apply/rescore plumbing; no re-upload.
4. **(Biggest) A chat editing layer** — "tell me what to change" + persistent
   *always/never* rules. This is a real LLM build (an instruction→structured-edit
   loop over `structuredResume`, honesty-validated like the analyze pipeline).

## Phasing (smallest-valuable-first; the chat layer is LAST)

### Phase 1 — Named versions + switcher + no-rescan edit (reuses the most, no LLM)
- Promote the résumé-version chain to a first-class object with an editable
  **name**, a **`+ New`** create modal (Duplicate / Import from file / From
  Profile), and a **version switcher** on the résumé surface.
- Editing an active version uses the existing inline-edit + apply-fix + "Save as
  version" plumbing — but decoupled from "you must scan first."
- **This alone delivers the user's ask**: "make a version per JD and edit it
  without rescanning." No chat, no new LLM surface — mostly wiring existing
  pieces (`template_builder_resumes`-style named persistence + the analyze
  version lineage + the WYSIWYG editor) into one switcher-driven view.

#### Phase 1 backend design (concrete)

Interactive mockup of the whole Phase-1 UI (switcher + "My Résumés" + New-version
modal) rendered in the real Resunova look, with this backend section:
**https://claude.ai/code/artifact/bae11e9f-1b56-4e98-8682-09bbbd5832c2**

**Assumed defaults** (the two dismissed crux questions — changeable, but Phase 1
is designed against these because they're the lowest-friction picks):
- **Version home = the Resume Library** ("My Résumés"). It already aggregates all
  four résumé kinds via `LibraryItem`, so it's the natural canonical store; the
  switcher is that store surfaced as a dropdown on Analyze + Tailor.
- **Data model = a new unified `resume_versions` table** (not extending
  `resume_analyses`), because the analysis table is an immutable append-only scan
  log with **no UPDATE RLS by design** and every row assumes a score — a version
  must be *editable* and exist *before* any scan.

**The core table (migration `037_resume_versions.sql`)** — the editable object;
`resume_analyses` stays exactly as-is (the immutable scan log). Mirrors the
root-trigger from 034 and the owner-only RLS from 036 (but with UPDATE, since
this table IS editable):

```sql
create table if not exists public.resume_versions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'Untitled résumé',
  -- git-like lineage (same shape as resume_analyses 034)
  root_id       uuid,                     -- groups every version of one résumé
  parent_id     uuid references public.resume_versions(id) on delete set null,
  version       int  not null default 1,  -- ordinal within a root (v1, v2…)
  -- the résumé itself (what the WYSIWYG editor reads/writes)
  structured    jsonb not null default '{}'::jsonb,  -- structuredResume / ResumeDocModel
  extracted_text text,                     -- synthesized flat text for scoring
  -- provenance + per-version JD context (Phase 2 tailoring writes jd_*)
  origin        text not null default 'upload',  -- upload|duplicate|profile|tailor|manual
  source_pdf_url text,
  jd_text text, jd_company text, jd_title text,
  -- cached for the list; real scores live in resume_analyses
  last_score int, last_score_source text,  -- llm|estimate|null
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- + resume_versions_set_root() trigger (verbatim from 034)
-- + indexes (user_id,root_id,version) and (user_id,updated_at desc)
-- + owner-only RLS: select/insert/UPDATE/delete using (auth.uid() = user_id)

-- link each scan back to the version it scored:
alter table public.resume_analyses
  add column if not exists version_id uuid
  references public.resume_versions(id) on delete set null;
```

**Relationship:** `resume_versions` = the editable doc; `resume_analyses` = 0..N
immutable scans per version (linked by `version_id`), which also cache
`last_score` back onto the version for list display. The honesty-pipeline
snapshots stay append-only and untouched — an invariant.

**Create paths** (all write one `resume_versions` row, **zero LLM**):

| Path | Source | Row written |
|---|---|---|
| Duplicate | an existing version's `structured` | same `root_id`, `version=max+1`, `origin='duplicate'` |
| Import file | `/api/upload-resume` → `structuredResume` | new root, `version=1`, `origin='upload'` |
| From Profile | `user_extracted_profiles` → structured | new root, `version=1`, `origin='profile'` |
| Save-as-version | applied edits from Analyze/Tailor | child of active version, `version=max+1` |

**Read/write surface — client-direct via RLS** (same pattern the app already uses
for `resume_analyses` + `template_builder_resumes`; almost no new Python). New
`lib/resumeVersions.ts`: `listVersions()` (grouped by `root_id`, reusing
`groupAnalysesByRoot`'s shape), `createVersion(input)` (the 4 paths),
`updateVersion(id, patch)` (edit-without-rescan → a real UPDATE),
`saveAsChildVersion(parent, structured, name)`, `setDefaultVersion(id)`,
`deleteVersion(id)`.

**The only backend (Python) change in Phase 1:** thread an optional `version_id`
through `/api/analyze-rescore` and `/api/analyze-upload` so a scan is stamped onto
the version it scored and returns `last_score` for the client to cache. Nothing
else in the analyze/extract/export pipeline changes.

### Phase 2 — Per-JD tailoring on a version (no rescan)
- "Tailor this version to a JD" applies the existing gap-fix / keyword pass to
  the *active version's* structured doc in place (we already have the Tailor
  gap-fix engine), producing a new child version — no re-upload.

### Phase 3 — Declutter the surface
- Progressive disclosure on Analyze: default to a calm view (score + preview +
  one primary action), fixes behind a toggle — closing the "why is theirs
  cleaner" gap. Their cleanliness is **doing less on screen at once**, not paint.

### Phase 4 — Chat editing (the real net-new)
- An instruction→edit loop ("make the summary punchier", "always use past
  tense") over `structuredResume`, with persistent rules and the same honesty
  validators the analyze pipeline uses. Biggest build; do last, once versions
  are the stable core object it edits.

## Hard questions to settle before Phase 1
- **Which table backs a "version"?** Options: extend `resume_analyses`
  (versioning already there, but it's analysis-shaped) vs `template_builder_resumes`
  (named + editable, but builder-shaped) vs a **new unified `resume_versions`**
  table. Leaning: a unified object, migrating the two into it over time — but that
  is the crux decision and needs a product call, because it touches the Library,
  Tailor, and Analyze history all at once.
- **One surface or keep four?** **DECIDED (product, 2026-07): Analyze and Tailor
  stay SEPARATE surfaces — do NOT merge them.** So the "résumé version + switcher"
  does not become a mega-page; it needs a home that both Analyze and Tailor can
  read from without being fused. Candidate homes (open): the **Resume Library /
  "My Resumes"** as the canonical version store, or the **Template Builder** (our
  existing named-WYSIWYG-draft surface). Analyze and Tailor each keep their own
  surface and consume/produce versions from that store.

## Explicitly NOT in scope here
- No commitment to the chat layer before Phases 1–2 prove the version model.
- No silent migration of the 5 résumé-ish tables — that's its own migration plan.
