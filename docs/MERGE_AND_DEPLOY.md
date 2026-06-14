# Merge & deploy guide

How to get your code from a feature branch → **staging** → **production**.

---

## The three environments

| Environment | URL | Git branch | Who uses it |
|-------------|-----|------------|-------------|
| **Local dev** | `http://localhost:3000` | `feature/*` on your machine | Every developer |
| **Staging** | https://staging.resunova.io | `staging` | Team QA before prod |
| **Production** | https://www.resunova.io | `main` | Real users |

**Rule of thumb:** never open feature PRs directly to `main`. Always go through `staging` first.

---

## Visual flow

```
┌─────────────┐     PR      ┌─────────┐     PR      ┌──────┐
│ feature/xyz │ ──────────► │ staging │ ──────────► │ main │
└─────────────┘             └─────────┘             └──────┘
       │                          │                       │
  npm run dev              staging.resunova.io      www.resunova.io
  (your laptop)            (team QA)                (production)
```

---

## Step 1 — Start from `staging`

Always branch off the latest `staging`, not `main`.

```bash
git clone https://github.com/parthbhodia/resunova-web.git
cd resunova-web
git checkout staging
git pull origin staging
git checkout -b feature/short-description
```

Examples of good branch names:

- `feature/analyze-summary-edit`
- `fix/auth-redirect`
- `chore/update-deps`

---

## Step 2 — Work locally

```bash
npm install
cp .env.local.example .env.local   # fill from team lead — see CONTRIBUTING.md
npm run dev
```

Before opening a PR, run:

```bash
npx tsc --noEmit
```

Commit and push your feature branch:

```bash
git add .
git commit -m "feat(analyze): describe what changed"
git push -u origin feature/short-description
```

---

## Step 3 — PR into `staging` (required for team)

1. On GitHub, open **New pull request**
2. Set:
   - **base:** `staging`
   - **compare:** `feature/short-description`
3. Add a short description of what changed
4. Request review (if your team uses reviews)
5. **Merge** when CI passes

**What happens after merge:**

| Repo | Trigger |
|------|---------|
| `resunova-web` | Auto-deploy to **https://staging.resunova.io** (~1 min) |
| `resunova-api` (if backend PR merged) | Railway **staging** API redeploys |

**Do you need a PR?**  
- **Team / normal work:** yes — always PR into `staging`  
- **Solo hotfix (you only):** you *can* push directly to `staging`, but PR is still preferred

### Open PR via CLI (optional)

```bash
gh pr create --base staging --head feature/short-description \
  --title "feat(analyze): short description" \
  --body "What changed and how to test on staging."
```

---

## Step 4 — QA on staging

After the PR merges, test on the hosted staging site:

**https://staging.resunova.io**

Checklist:

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Sign-in / upload / analyze flows work (if touched)
- [ ] Another team member has looked (for larger changes)

Local dev and staging should behave the same if both use the **staging API** and **staging Supabase** (see `.env.local.example`).

---

## Step 5 — PR from `staging` → `main` (release to prod)

When staging looks good:

1. Open **New pull request**
2. Set:
   - **base:** `main`
   - **compare:** `staging`
3. Title example: `Release: analyze summary edit (staging → main)`
4. Merge after review

**What happens after merge:**

| Repo | Trigger |
|------|---------|
| `resunova-web` | Auto-deploy to **https://www.resunova.io** |
| `resunova-api` | Railway **production** API redeploys (if `main` was updated there too) |

Only **leads / release owners** should merge `staging` → `main`.

---

## Backend changes (`resunova-api`)

Frontend-only devs do **not** need the backend repo. If your feature needs a new API field:

1. File a request or pair with a backend maintainer
2. Backend opens PR → **`staging`** on `resunova-api` first
3. After staging API deploys, merge your **web** PR to `staging`
4. QA both together on staging.resunova.io
5. Backend lead merges `staging` → `main` on API when you release web to prod

Same branch names and PR pattern as the web repo.

---

## Quick reference

| I want to… | Do this |
|------------|---------|
| Start new work | `git checkout staging && git pull && git checkout -b feature/...` |
| Deploy to staging for QA | **PR → `staging`** and merge |
| Test on hosted staging | Visit https://staging.resunova.io after merge |
| Ship to production | **PR `staging` → `main`** and merge |
| Run locally only | `npm run dev` — no deploy needed |
| Skip Google sign-in locally | `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` in `.env.local` |

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Branched from `main` | Rebase onto `staging`: `git fetch && git rebase origin/staging` |
| PR target is `main` for a feature | Change base branch to `staging` on GitHub |
| Staging site didn’t update | Check **Actions** tab → “Deploy staging to GitHub Pages” |
| Prod broke after release | Revert the `staging` → `main` merge; fix on `staging` first |
| Used production Supabase locally | Use staging keys in `.env.local` — see CONTRIBUTING.md |

---

## GitHub branch protection (recommended)

Ask a repo admin to enable on **resunova-web**:

| Branch | Suggested rules |
|--------|-----------------|
| `main` | Require PR, require review, no direct push |
| `staging` | Require PR (optional review) |
| `feature/*` | No protection — devs push freely |

---

## Related docs

- [CONTRIBUTING.md](../CONTRIBUTING.md) — local setup and env vars
- [api-contract.md](api-contract.md) — API shapes when UI needs backend changes
- [STAGING_DNS.md](STAGING_DNS.md) — staging domain DNS (admin only)
