# Cutover checklist (founder / senior engineers)

Complete after pushing this repo to GitHub.

## 1. Create and push GitHub repo

```bash
gh auth login
cd /path/to/resunova-web
gh repo create YOUR_ORG/resunova-web --source=. --remote=origin --push
```

Grant employees read/write via org team or collaborators.

## 2. GitHub Pages

1. Repo **Settings → Pages** → Build: **GitHub Actions**
2. **Settings → Secrets → Actions** (migrate from monorepo):
   - `RAILWAY_API_URL`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
3. Run workflow **Deploy to GitHub Pages** on `main`
4. Confirm `www.resunova.io` serves the new build

## 3. Disable old monorepo deploy

- Delete or disable `.github/workflows/deploy.yml` on archived `resume-scoring-ai`
- Or archive the whole monorepo so Actions stop

## 4. Verify

- [ ] Site loads at www.resunova.io
- [ ] Analyze upload hits Railway API successfully
- [ ] PDF download works
- [ ] Employees can clone **this** repo but **not** `resunova-api`
