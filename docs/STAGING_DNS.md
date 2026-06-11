# Staging DNS setup (Namecheap)

`staging.resunova.io` returns **NXDOMAIN** until you add a DNS record.

Production `www.resunova.io` already uses:

| Type | Host | Value |
|------|------|-------|
| CNAME | `www` | `parthbhodia.github.io` |

Add the same for staging:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| **CNAME** | `staging` | `parthbhodia.github.io` | Automatic |

## Namecheap steps

1. Log in → **Domain List** → **Manage** for `resunova.io`
2. **Advanced DNS**
3. **Add New Record**
   - Type: `CNAME Record`
   - Host: `staging`
   - Value: `parthbhodia.github.io`
   - TTL: Automatic
4. Save

Wait 5–30 minutes for propagation.

## After DNS works

Re-enable the custom domain on GitHub Pages:

```bash
gh api -X PUT repos/parthbhodia/resunova-web-staging/pages \
  -f cname=staging.resunova.io \
  -f build_type=legacy \
  -f 'source[branch]=gh-pages' \
  -f 'source[path]=/'
```

Update `.github/workflows/deploy-staging-pages.yml`:

```yaml
NEXT_PUBLIC_ASSET_PREFIX: https://staging.resunova.io
```

Push to `staging` to redeploy.

## Interim URL (works now, no DNS)

https://parthbhodia.github.io/resunova-web-staging/
