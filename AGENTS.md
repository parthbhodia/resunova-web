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
