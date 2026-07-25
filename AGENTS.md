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
