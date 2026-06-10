# Access control (resunova-web)

## Who should have access

| Role | Access |
|------|--------|
| All employees | Read + PR access (branch protection recommended) |
| Founder + leads | Admin / merge rights |

## What this repo contains

- Next.js UI, Supabase client, TypeScript API **types** (not algorithms)
- [`docs/api-contract.md`](docs/api-contract.md) — HTTP shapes only

## What is NOT in this repo

- NLP prompts, scoring validators, LLM client (`resunova-api` — private)
- `GROK_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Employees who need full-stack local dev without backend source should use `NEXT_PUBLIC_API_URL` pointing at Railway staging/production.
