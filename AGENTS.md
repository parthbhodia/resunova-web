# Resunova — frontend context

This is the **resunova-web** repository (Next.js UI only). The backend API is a separate private repo — see [`docs/api-contract.md`](docs/api-contract.md) for endpoints and response shapes.

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend-specific tips

- **State**: Zustand stores in `store/` (`resumeAnalyzeStore`, `suggestionsStore`). Hooks in `hooks/`. UI in `components/`.
- **API base URL**: `NEXT_PUBLIC_API_URL` (default `http://localhost:8765`). Use `apiUrl()` from `lib/utils.ts`.
- **Auth bypass** for local Analyze testing: `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` in `.env.local`.
- **PDF download**: `hooks/useHtmlPdfExport.ts` (DOM → Chromium). Preview must match download.
- **Category display**: `lib/analysisCategoryMatch.ts` mirrors backend category keys for UI bucketing. When the API adds fields, update types in `store/resumeAnalyzeStore.ts` and document in `docs/api-contract.md`.

## Local dev without backend repo

Point `.env.local` at staging or production Railway API. You do not need backend source to build UI features.

## Writing UI copy

**No spaced em dashes in anything a user reads.** One or two is a writing style;
scattered through a product it reads as machine-written, and on a page selling
AI-assisted work that costs exactly the credibility we are charging for.

Rewrite each one as the punctuation the sentence actually wants:

```
Upload your résumé — we do the rest      →  Upload your résumé. We do the rest.
Only add skills — you can back them up   →  Only add skills you can back up.
Saved to My Résumés — 3 versions         →  Saved to My Résumés (3 versions)
Importance: 4 — how critical this is     →  Importance: 4. How critical this is.
```

A blanket swap to ` - ` replaces one tell with a worse one. Pick per sentence.

Two uses are legitimate and stay:

- a bare `—` standing in for an empty value (`company.trim() || "—"`)
- en dashes inside ranges (`May 2022 – Present`, `p25–p75`)

Code comments are out of scope; users never see them.

`lib/__tests__/uiCopyStyle.test.ts` holds the line with a count baseline, the
same shape as the lint ratchet: copy may not get worse, and the number comes
down as the remaining files are cleaned up.

Other tells worth avoiding: "seamlessly", "effortlessly", "unlock the power of",
"in today's fast-paced", and rule-of-three padding ("fast, simple, and
reliable").

## Material Design

New UI follows **Material Design 3**, built on the existing shadcn/base-ui
primitives. We deliberately did **not** install MUI: running two component
libraries means two theme systems, two sets of primitives, and a permanent seam
between old and new screens. Material is a token layer instead, so every
component keeps its current API.

Tokens live in `lib/material.ts` and are mirrored as `--md-*` custom properties
in `app/globals.css`. One definition, two consumers, pinned by
`lib/__tests__/material.test.ts` so they cannot drift.

**Elevation** is six defined levels, not ad-hoc box-shadows:

```tsx
<Card variant="elevated" />                    // resting 1, hover 2
className="shadow-[var(--md-elevation-3)]"     // menus, raised chips
```

**Interaction uses the state layer**, not a hover background per variant. Add
`md-state-layer` to an interactive element and it gets hover, focus and pressed
feedback by overlaying its own foreground colour at Material's opacities. One
rule covers every colour, including ones added later:

```tsx
<button className="md-state-layer bg-primary text-primary-foreground" />
```

Do not write `hover:bg-*` on a component that already has the state layer —
the two stack and the result is muddy.

**Motion** comes from the scale: `var(--md-easing-standard)` with
`var(--md-duration-medium)`. Never `transition: all`.

**Shape**: `var(--md-shape-sm|md|lg|xl)`.

### Off limits

The résumé paper and everything on the PDF export path — `lib/resumeLayout.ts`,
`AnnotatedResumePanel`, `AnalyzeLiveResumeBody`, `ResumeEditor`,
`TemplateBuilder/*`, `CoverLetterPreview`. Those shadows and sizes are print
metrics that drive Chromium pagination, and Material elevation renders as a grey
box in an exported PDF. The exemption is asserted in the test; the state layer
is also stripped from the export via `.az-clean-export`.
