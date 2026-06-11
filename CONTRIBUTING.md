# Contributing to Resunova Web

This repo is the **Next.js frontend**. The NLP backend is in the private **resunova-api** repo.

## Environments

| | Local dev | Staging (hosted) | Production |
|---|-----------|------------------|------------|
| **You clone** | `resunova-web` | same | same |
| **URL** | `http://localhost:3000` | **https://staging.resunova.io** | https://www.resunova.io |
| **API** | `localhost:8765` or staging Railway URL | Railway staging | Railway production |
| **Supabase** | Staging project (see below) | Staging project | Production project |
| **Deploy** | `npm run dev` | push to `staging` branch | push to `main` |

**Default for all contributors:** use the **staging Supabase project**, not production.

## Quick start

```bash
git clone https://github.com/parthbhodia/resunova-web.git
cd resunova-web
git checkout staging    # daily work branches off staging
npm install
cp .env.local.example .env.local
```

Fill `.env.local` (get values from team lead or 1Password — **do not commit**):

```
NEXT_PUBLIC_API_URL=https://<staging-api>.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://uvnncrtulyezsylcxnhw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging-anon-key>
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

```bash
npm run dev   # http://localhost:3000
```

### Running API locally (backend maintainers only)

Clone **resunova-api** (private), point `SUPABASE_*` at the **staging** project, run uvicorn on `:8765`, then set `NEXT_PUBLIC_API_URL=http://localhost:8765` in `.env.local`.

## Branch workflow

```
feature/my-thing  →  PR into staging  →  team QA  →  PR into main  →  prod
```

| Branch | What happens |
|--------|----------------|
| `staging` | Deploys to **staging.resunova.io** (staging API + Supabase) |
| `main` | Deploys to **www.resunova.io** (production) |

Open feature branches from `staging`, not `main`.

## Backend changes

If your UI needs a new API field or endpoint:

1. Update [`docs/api-contract.md`](docs/api-contract.md) and TypeScript types.
2. Ask a **resunova-api** maintainer to implement on the `staging` branch first.
3. After staging API deploys, test your web PR against staging.

## Pull requests

- Target **`staging`** for normal work; **`main`** only for release promotion.
- Run `npx tsc --noEmit` before opening a PR.
- Never commit `.env.local` or API keys.

## Who needs which repo

| Role | resunova-web | resunova-api |
|------|--------------|--------------|
| Frontend / design | ✅ | ❌ |
| Full-stack (integration) | ✅ | ❌ (use staging API URL) |
| Backend / NLP | ✅ | ✅ (invite required) |
