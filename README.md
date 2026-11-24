# Resunova Web

Next.js frontend for [Resunova](https://resunova.io): Analyze, Tailor, Template Builder, Resume Hub, Advisor dashboard.

| Doc | Purpose |
|-----|---------|
| [`AGENTS.md`](AGENTS.md) | Frontend conventions — read before editing |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Local dev for employees (API is remote) |
| [`docs/api-contract.md`](docs/api-contract.md) | REST API shapes the UI depends on |

## Local dev

Requires **Node ≥20.9**.

```bash
npm install
npm run dev
```

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Open [http://localhost:3000](http://localhost:3000).

Most contributors use the **remote Railway API** — the NLP backend is in a separate private repository.

## Deploy

Pushes to `main` deploy on Vercel (`www.resunova.io`). The build command in [`vercel.json`](vercel.json) typechecks, runs the tests, refreshes the role data and runs `next build`, so a failure stops the deploy and the previous build keeps serving.

Required Vercel environment variables (Production): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

The public job pages (`/jobs/`, `/jobs/<id>/`) and the sitemap are rendered on demand from the API, so they need `NEXT_PUBLIC_API_URL` at runtime and nothing at build time.

## Key paths

- `app/` — Next.js App Router
- `components/` — Feature UI (`AnalyzeResume`, `ResumeBuilder`, …)
- `hooks/` — `useHtmlPdfExport`, analyze export, etc.
- `lib/` — API helpers, Supabase client, `analysisCategoryMatch.ts`
- `store/` — Zustand state
- `db/migrations/` — Supabase SQL migrations

## Typecheck

```bash
npx tsc --noEmit
```
