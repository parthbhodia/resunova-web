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

## Design work

**Read [`DESIGN.md`](DESIGN.md) before any visual change.** It carries the
shipped token vocabulary, the type ladder, the marketing-surface conventions,
and the process.

Two skills are installed under `.claude/skills/` and they are **used together,
never one alone**:

- **`impeccable`** — deterministic 59-rule detector plus a design hook on UI
  edits. The verifier.
- **`redesign-existing-projects`** — audit checklist and upgrade techniques.
  The art direction. (`imagegen-frontend-web` produces reference comps.)

They catch disjoint sets. On `/pricing` the detector found zero issues on a page
the taste audit found eight in; the detector then caught three real defects in
the taste-driven rebuild, two of them WCAG AA failures that would have shipped.
Art direction proposes, the detector disposes.

```bash
npx impeccable detect app/pricing/    # full fidelity
```

⚠️ The hook's bundled detector runs in **DEGRADED regex mode** in this project
(missing `htmlparser2`, `css-select`, `domutils`), so its clean results are an
undercount. Trust `npx impeccable detect`.

## Material Design

New UI follows **Material Design 3**, and **MUI (`@mui/material`) is the
component library**.

> **This supersedes the decision recorded in #180.** That change adopted
> Material as a *token layer* over shadcn/base-ui and stated we deliberately
> did not install MUI, on the grounds that two component libraries means two
> theme systems and a permanent seam. That reasoning was sound and the
> tradeoff was made knowingly in the other direction: MUI ships the Material
> components rather than reimplementing them, and the seam is accepted as
> temporary while surfaces migrate. If you are reading git history and find
> the older rule, this section wins.

**Where each lives today.** Both exist during the migration; that is expected,
not drift:

| | library | status |
|---|---|---|
| Template Builder | MUI | converted |
| Cover Letter builder | MUI | converted |
| everything else | shadcn/base-ui + `--md-*` tokens | to migrate |

New chrome goes to MUI. Do not start new work on the token layer.

**The MUI theme is not Material's defaults.** `components/mui/theme.ts` maps
the palette onto this app's own CSS variables, takes its type scale from
`lib/typography.ts`, and sets a 44px minimum on Button/IconButton/MenuItem/Tab
so hit areas are inherited rather than re-decided. `components/mui/__tests__/
theme.test.ts` reads `globals.css` and fails if the two drift.

**The provider is scoped, not global.** `MuiThemeRegistry` wraps the subtree
that uses MUI, never the root layout — this is a static export of ~1,076
prerendered pages and only surfaces that opted in should carry an Emotion
runtime. `CssBaseline` is deliberately absent: it is a global reset and this
app already has one.

The legacy token layer still lives in `lib/material.ts`, mirrored as `--md-*`
in `app/globals.css` and pinned by `lib/__tests__/material.test.ts`. Leave it
in place until the last consumer is converted.

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

**No MUI component may render on the résumé or cover-letter paper**, and this
one fails silently rather than loudly. `useHtmlPdfExport` clones the paper and
ships it to headless Chromium with a hand-written, self-contained stylesheet.
Emotion's generated class names are not in that stylesheet, so an MUI component
there renders correctly on screen and **vanishes from the download**. Same
failure mode as referencing `var(--border)` on the paper. Use plain inline SVG
and literal colours instead — `components/canvas/CanvasPrimitives.tsx` is the
worked example.

## Calling the backend

**Always `apiFetch` from `lib/apiClient.ts`. Never a bare `fetch` at an API URL.**

```tsx
import { apiFetch } from "@/lib/apiClient";

const resp = await apiFetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

It resolves the base URL and attaches `Authorization: Bearer <token>` when a
Supabase session exists. Otherwise it sends no auth header at all — anonymous
use is deliberate (a visitor gets a free scan before signing in), and an empty
bearer would read to the backend as failed auth rather than as a guest. **Do
not gate UI on being signed in just because a call needs the API.**

This exists because about twenty endpoints shipped with no auth header: every
call site was making the decision itself, and a new one starts from a blank
`fetch`. `lib/__tests__/apiClientUsage.test.ts` fails the build if a raw
`fetch(apiUrl(...))` reappears, so the fix cannot quietly erode.

Two things the helper deliberately does not do:

- **It does not set `Content-Type`.** A FormData body needs the browser to pick
  the multipart boundary; defaulting the header would break every upload.
- **It does not parse the response.** Streaming endpoints
  (`/api/generate-stream`, `/api/suggest-changes-stream`) need the raw body.

**Refusals: branch on `remedy`, never on the message.** A 401 or 429 carries
`{ code, remedy: "sign_in" | "upgrade", limit, used, remaining, resetAt }`.
Read it with `refusalFrom(status, body)`:

```tsx
const refusal = refusalFrom(resp.status, json);
if (refusal?.remedy === "sign_in") openSignIn();
else if (refusal) openUpgrade(json);
```

Matching on prose meant a copy edit could start pitching Pro to someone who
only needed to sign in. `refusalFrom` also falls back to the status for older
payloads that predate `remedy`, so this works before and after the backend
switches over.

**Plans:** `/api/scan-limit-status` returns `unlimited` plus a `plan`
(`"pro" | "institution"`). Use `planLabel()` — never assume an unlimited user is
a university account, and never show a metered "Free" badge to a subscriber.
