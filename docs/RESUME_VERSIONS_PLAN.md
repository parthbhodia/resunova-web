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
- **One surface or keep four?** Full Tsenta parity means collapsing
  Analyze/Tailor/Template-Builder editing into one "Resume" page. That's the big
  IA change; Phase 1 can ship the switcher *within the current Analyze surface*
  first and converge later.

## Explicitly NOT in scope here
- No commitment to the chat layer before Phases 1–2 prove the version model.
- No silent migration of the 5 résumé-ish tables — that's its own migration plan.
