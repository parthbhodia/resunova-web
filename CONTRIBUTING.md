# Contributing to Resunova Web

This repo contains the **Next.js frontend only**. The NLP analysis backend is a separate private repository.

## Local development

```bash
npm install
cp .env.local.example .env.local   # create if missing
npm run dev
```

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=https://your-railway-api.up.railway.app
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Most contributors point `NEXT_PUBLIC_API_URL` at the **staging or production Railway API** — you do not need the backend repo to work on UI.

For auth bypass during Analyze testing, set `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.

## API contract

When changing request/response shapes the UI depends on, update [`docs/api-contract.md`](docs/api-contract.md) and coordinate with a backend maintainer. TypeScript types live in `lib/types.ts` and `store/resumeAnalyzeStore.ts`.

## Pull requests

- Run `npx tsc --noEmit` before opening a PR.
- Do not commit `.env.local` or any file containing API keys.
