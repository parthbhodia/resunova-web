# Cutover checklist (founder / senior engineers)

Complete after pushing this repo to GitHub.

## 1. Create and push GitHub repo

```bash
gh auth login
cd /path/to/resunova-web
gh repo create YOUR_ORG/resunova-web --source=. --remote=origin --push
```

Grant employees read/write via org team or collaborators.

## 2. Vercel

The site is deployed by Vercel from `main` (see `vercel.json`). GitHub Pages no longer builds it.

1. Vercel project connected to this repo, production branch `main`
2. **Settings → Environment Variables** (Production), migrated from the old Actions secrets:
   - `NEXT_PUBLIC_API_URL` (was `RAILWAY_API_URL`)
   - `NEXT_PUBLIC_SUPABASE_URL` (was `SUPABASE_URL`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (was `SUPABASE_PUBLISHABLE_KEY`)
   - `NEXT_PUBLIC_SITE_URL` = `https://www.resunova.io`
3. **Settings → Domains**: `www.resunova.io` (and `resunova.io` redirecting to it)
4. Confirm `www.resunova.io` serves the Vercel build

## 3. Disable old monorepo deploy

- Delete or disable `.github/workflows/deploy.yml` on archived `resume-scoring-ai`
- Or archive the whole monorepo so Actions stop

## 4. Verify

- [ ] Site loads at www.resunova.io
- [ ] A public job page (`/jobs/<id>/`) renders, and a closed one is a 404
- [ ] Analyze upload hits Railway API successfully
- [ ] PDF download works
- [ ] Employees can clone **this** repo but **not** `resunova-api`
