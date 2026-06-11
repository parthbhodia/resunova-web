# WIP: inline editing for all résumé fields (Analyze preview)

**Branch:** `feature/inline-field-editing` (off `staging`)
**Goal:** Let the user edit *every* non-bullet field in the Analyze preview — education, certifications, publications, projects, skills, entry headers — the same way bullets and the summary already work: edit → applies to the live preview **and** the exported PDF. Reversible.

## Done so far (commit `89df777`)

1. **Summary Rewrite card — Edit/Apply/Copy/Reset** (`components/AnalyzeResume.tsx`).
   Previously Copy-only. Now editable; Apply calls `setSummaryOverride` (already wired to preview + PDF). Local state: `summaryDraft`, `summaryCopied`.

2. **`fieldOverrides` store foundation** (`store/resumeAnalyzeStore.ts`).
   - State: `fieldOverrides: Record<string, string>` keyed by stable structured path.
   - Actions: `setFieldOverride(path, text)`, `clearFieldOverride(path)`.
   - Wired into `emptyEdits()`, `PersistedEdits`, `savePersistedEdits`, `persistEdits`, `restoreEdits` (survives "Save preview edits").
   - **Bullets stay on `lineOverrides` (by index); summary stays on `summaryOverride`; everything else → `fieldOverrides` (by path).**

## Remaining steps

1. **Emit paths in `buildBlocksFromStructured`** (`components/AnalyzeLiveResumeBody.tsx`).
   Extend the paragraph block: `{ type: "paragraph"; lines: string[]; paths?: (string | undefined)[] }`.
   Emit a parallel `paths` array per editable paragraph:
   - education entry `i`: `edu.${i}.head`, `edu.${i}.degree`
   - projects entry `i`: `proj.${i}.head`
   - skills line `j`: `skills.${j}`
   - extra_sections (certs/pubs/awards) entry `i` line `j`: `extra.${i}.${j}`
   - experience entry `i`: `exp.${i}.head` (bullets already editable via the bullet system)
   - **Skip `summary`** — it has its own `summaryOverride`.

2. **Thread props** store → `AnalyzePreviewPane` → `AnnotatedResumePanel` → `AnalyzeLiveResumeBody`:
   `fieldOverrides: Record<string,string>`, `setFieldOverride(path,text)`, `fieldsEditable?: boolean` (true for Analyze). (Mirror how `summaryOverride`/`summaryFlagged` are already threaded.)

3. **Render: editable lines** in the paragraph `.map` (`AnalyzeLiveResumeBody.tsx`).
   - Compute `linePaths` aligned to `paragraphLines` (note: skills/experience run through `mergeWrappedSkillsLines`/`coalesceEmploymentParagraphLines` — only attach paths when `paragraphLines.length === blk.lines.length`, else skip editing for that block but still substitute overrides).
   - Per line: `const ovr = path ? fieldOverrides[path] : undefined;` display `ovr ?? line`. When `ovr != null`, force the plain-text branch (overrides render as plain text).
   - When `fieldsEditable && path`, spread editable props onto the line's `<div>`: `contentEditable`, `suppressContentEditableWarning`, `data-field-path={path}`, `data-field-edited`, `onBlur` → `setFieldOverride(path, e.currentTarget.textContent ?? "")`, `onKeyDown` Enter→blur. Add an `.az-editable-field` affordance (hover bg + dashed underline; green when edited).
   - **Commit on blur only** (not onChange) to avoid contentEditable cursor jumps.

4. **Strip from PDF export** (`hooks/useHtmlPdfExport.ts` `cleanForExport`): add `[data-field-path]` to the strip loop + CSS (transparent bg, no outline, `contenteditable=false`), like `[data-bullet-idx]` / `[data-summary-flag]`.

5. **Verify in browser** (now possible from a resunova-web-rooted session): `npm run dev`, upload a CV, edit an education line / a cert / a skill, confirm the preview updates, Download PDF reflects the edit, and "Save preview edits" + reopen restores it.

## Notes
- `.env.local` points at staging API + staging Supabase; `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.
- Run `npx tsc --noEmit` before any PR. Target `staging`.
- Delete this file before the PR (or keep as a design note — your call).
