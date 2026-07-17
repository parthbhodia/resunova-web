# AnalyzeResume.tsx refactor plan

Status: **Slices 1–2 done, Slice 3 partial, Slice 5 done, Slice 4 component-extraction done + live-verified**; only the optional `useAnalyzeWorkspace()` hook (state relocation) remains.

> **Live verification (2026-07-15):** served the static export (`out/`) and drove
> the flows in a real browser. Confirmed: the extracted Analyze sidebar renders
> pre-scan ("Recent Analyses" / "No analyses yet") **and** post-scan (score ring
> "72/100 Strong"); and the Save-to-Profile toast (Slice 5) appears after a
> (mocked) analysis, saves on click ("✓ Saved to your Profile"), writes the
> career-profile record, and seeds the Tailor-defaults contact fields — no page
> errors. The earlier "not exercised in browser" caveats on Slices 3 & 5 are
> resolved. (Slice 4 remains untouched.)

`components/AnalyzeResume.tsx` is ~4,000 lines. It already delegates heavy
rendering to children (`AnalyzePreviewPane`, `AnnotatedResumePanel`,
`AnalyzeLiveResumeBody`, `ScoreRing`), so it is not a rendering monolith — it is
an **orchestration container** that accreted state + handlers feature by feature
(edit loop, rescore, version lineage, hide-a-bullet, inline edit, score
estimate). It is also the most invariant-laden flow in the app (the CLAUDE.md
honesty-pipeline + category invariants all surface here) and has **no frontend
tests**. So this refactor is behavior-preserving, incremental, and gated on
verification at each step.

## Guardrails
- **No behavior change.** Every slice is a pure move / lift; tsc + `next build` +
  the full vitest suite must stay green after each.
- **Add tests as we extract.** Pure logic pulled out gets characterization unit
  tests (locks current behavior) — this is also how we start closing the
  "no frontend tests" gap.
- **Stateful-JSX extraction is gated on live verification.** Extracting a
  component that reads the edit/rescore state machine must be smoke-tested in a
  running browser before it lands — do not ship a blind lift of stateful JSX.

## Slices

### Slice 1 — pure types + view helpers → own modules — ✅ DONE
- `components/analyze/analyzeTypes.ts`: the local interfaces (`AnalysisResult`,
  `RequirementConceptFE`, `JdMatchBreakdown`, `ScoringMeta`).
- `components/analyze/analyzeViewHelpers.tsx`: the module-level pure helpers +
  presentational constants (`scoreColor`, `scoreLabel`, `severity*`,
  `CATEGORY_LABELS`, `CATEGORY_COACH`, `CATEGORY_ICONS`, `CATEGORY_DESCRIPTIONS`,
  `ISSUE_TEXT_TO_CATEGORY`, `guessIssueCategory`, `issueCategoryOf`,
  `getBulletsForCategory`, `formatExperienceTenureChip`, `flaggedBulletFixChip`,
  `Spinner`).
- Zero runtime risk (module-level, side-effect-free moves). Unit tests added for
  the pure functions. ~300 lines out of `AnalyzeResume.tsx`.

### Slice 2 — history persistence helper (low risk) — ✅ DONE
- Lifted `LS_KEY` / `LS_MAX` / `lsLoad` / `lsSave` / `lsPush` (localStorage
  analyze-history) into `components/analyze/analyzeHistoryStore.ts` (`LS_KEY`/
  `LS_MAX` stay module-internal; `lsLoad`/`lsSave`/`lsPush` exported and imported
  back). +6 unit tests (round-trip, prepend, 10-item cap, per-user scoping,
  corrupt-JSON tolerance). Behavior-preserving; tsc + 245 vitest + `next build`
  clean. AnalyzeResume 3710 → 3690 lines.

### Slice 3 — `<AnalyzeSidebar>` presentational component (medium risk) — ◑ PARTIAL
- **Done (safe, presentational):** `components/analyze/AnalyzeSidebar.tsx`
  exports `AnalyzeSidebarPinned` (Recent-Analyses label OR score ring + label +
  tenure chip) and `AnalyzeHistoryRail` (pre-result skeleton / empty / rows).
  Verbatim JSX move — former closure refs became props; no handlers/state.
  tsc + 245 vitest + `next build` clean; AnalyzeResume 3690 → 3630. ⚠️ In-browser
  render NOT exercised (sandbox kept killing `next dev`) — but it is a verbatim
  presentational copy, so behavioral risk is minimal; worth a glance at the
  Analyze sidebar (pre-scan "Recent Analyses" + "No analyses yet", and the score
  ring after a scan) before merge.
- **Deferred to Slice 4:** the RESULT-state "Improvement Plan" panel (the
  interactive body of `sidebarScroll`) stays in AnalyzeResume — it drives
  category selection, save-version, and the bullet fix cards (edit/rescore state
  machine), so it is NOT a presentational move and must be live-verified.

### Slice 4 — interactive Improvement-Plan panel + hook — ◑ PANEL DONE (live-verified); hook optional
- **Done + live-verified (2026-07-16):** extracted the result-state Improvement-Plan
  panel (the interactive body of `sidebarScroll` — Save-a-version card, Summary
  entry, TOP FIXES / COMPLETED category lists, Past runs) into
  `components/analyze/AnalyzeImprovementPlan.tsx`. **Key insight that made this
  safe:** the panel owns NO state — every `useState`/`useCallback` stays in
  AnalyzeResume; the panel only reads `result`/derived values and calls
  passed-in setters/handlers. So it's a verbatim JSX move + **19 same-named
  props** (tsc flags any un-threaded free var; same-name passing can't mismatch
  values) — the same Slice-3 pattern, NOT a state relocation. Removed 4
  now-unused imports (`Badge`, `CATEGORY_ICONS`, `countBulletsInCategory`,
  default `JobSearchActivationWidget`). AnalyzeResume **3630 → 3378 lines**.
  Verified live (served the static export, mocked `/api/analyze-upload` with a
  flagged-category analysis): the panel renders (Save-a-version, TOP FIXES,
  COMPLETED, Past runs); clicking a category **activates it and drives the edit
  loop** — the center fix panel shows the rewrite + Apply/Copy/Edit, and the
  preview highlights the category's bullets in sync; "Save as version" button
  present; no page errors. tsc + 251 vitest + `next build` clean.
- **Remaining (optional, deferred): the `useAnalyzeWorkspace()` hook.**
- Lift the store selectors + edit/rescore/category handlers out of the JSX into a
  hook. This is ~half the file and the real win, but it touches the edit/rescore
  state machine — do it last, incrementally, **live-verified** each step, ideally
  after a couple of characterization tests exist for the edit-loop invariants.
- **Confirmed surface (2026-07-15):** the component holds **26 `useState` + 21
  `useCallback` + 14 `useEffect`**, all interdependent — the edit/rescore state
  machine itself. The only pure `useMemo`s (`categoryAssignmentOpts`,
  `scoreEstimate`, `bulletPrimaryCategories`) already delegate to tested libs
  (`estimateScoreAfterFixes`, `buildBulletPrimaryCategories`), so there is **no
  meaningful safe subset** — the value and the risk are the same code.
- **Explicitly paused (product call):** a blind extraction (hook, or even a
  props-threaded `<AnalyzeImprovementPlan>` component) would compile and pass the
  logic tests but could silently break apply-fix / rescore / save-version, with
  no component-level test net and no way to observe it — this session's sandbox
  kept killing `next dev`. Decision: **do NOT attempt Slice 4 without a working
  preview.** When a browser is available: extract the interactive Improvement-Plan
  panel first (props-threaded, verbatim), click through the full edit loop
  (select category → apply fix → est. score updates → Save as version → restore),
  then lift the hook incrementally, re-driving the loop after each step.

### Slice 5 — land deferred features in the slimmer file — ✅ DONE
- The "Save this résumé to your Profile" prompt (Profile-plan trigger #1) shipped
  as a self-contained `components/analyze/SaveToProfilePrompt.tsx` — a
  **fixed-position dismissible toast** (placement independent of the workspace
  grid). It reads `structuredResume` from the analyze store itself; a one-line
  insert next to the existing `feedbackToast`. On "Save to Profile" it maps the
  structured résumé → `ExtractedProfileState` (`extractedProfileFromStructured`
  in `components/analyze/saveToProfile.ts`, +6 unit tests), writes the
  career-profile record (`user_extracted_profiles`), and seeds the Tailor-defaults
  contact fields (`user_profiles`, prefer-empty) — reusing the Phase-1/2 save
  functions. Self-hides when there's no structured résumé or the same résumé
  (name+email fingerprint) was already saved/dismissed (`rn_saveprofile_seen_v1`).
  tsc + 251 vitest + `next build` clean. ⚠️ In-browser appearance after a real
  scan NOT exercised (sandbox killed `next dev`); the save path reuses
  live-verified functions and the toast mirrors the known-good `feedbackToast`,
  so risk is contained — glance at it after a scan before merge.

## Explicitly out of scope
- No consolidation of `AnalyzeResume`'s local `guessIssueCategory` with
  `lib/analysisCategoryMatch.ts`'s (a separate, riskier de-dup — keep the pure
  move behavior-identical for now).
