# AnalyzeResume.tsx refactor plan

Status: **Slice 1 done**; Slices 2–5 proposed.

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

### Slice 2 — history persistence helper (low risk)
- Lift `LS_KEY` / `LS_MAX` / `lsLoad` / `lsSave` / `lsPush` (localStorage
  analyze-history) into `components/analyze/analyzeHistoryStore.ts`. Small,
  self-contained, testable.

### Slice 3 — `<AnalyzeSidebar>` presentational component (medium risk)
- Extract the `sidebarPinned` + `sidebarScroll` rail (recent analyses, score
  ring, improvement plan) into a component with an explicit prop contract.
  Presentational-ish — **live-verify** the history list + score ring render.

### Slice 4 — `useAnalyzeWorkspace()` hook (high value, high risk)
- Lift the store selectors + edit/rescore/category handlers out of the JSX into a
  hook. This is ~half the file and the real win, but it touches the edit/rescore
  state machine — do it last, incrementally, **live-verified** each step, ideally
  after a couple of characterization tests exist for the edit-loop invariants.

### Slice 5 — land deferred features in the slimmer file
- The "Save this résumé to your Profile" prompt (Profile-plan Phase 4 / trigger
  #1) drops in as a self-contained `<SaveToProfilePrompt>` once the file is
  cleaner. It reads the analyze store itself, so it stays a one-line insert
  regardless — but a slimmer host makes the seam obvious.

## Explicitly out of scope
- No consolidation of `AnalyzeResume`'s local `guessIssueCategory` with
  `lib/analysisCategoryMatch.ts`'s (a separate, riskier de-dup — keep the pure
  move behavior-identical for now).
