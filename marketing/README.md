# Resunova marketing assets

Launch/media images for Product Hunt, Reddit, X/LinkedIn link shares, etc.
Everything is generated from the HTML templates in `html/` (self-contained,
DM Sans embedded from `fonts/`) and rendered to PNG with headless Chromium.

## Assets (`assets/`)

| File | Size | Use |
|---|---|---|
| `ph-gallery-1-hero-1270x760.png` | 1270×760 @2x | Product Hunt gallery slide 1 — hero + score card |
| `ph-gallery-2-honesty-1270x760.png` | 1270×760 @2x | PH slide 2 — the honesty-pipeline differentiator |
| `ph-gallery-3-rewrites-1270x760.png` | 1270×760 @2x | PH slide 3 — before/after bullet rewrite |
| `ph-gallery-4-jobs-1270x760.png` | 1270×760 @2x | PH slide 4 — jobs feed ranked against résumé |
| `ph-gallery-5-interview-1270x760.png` | 1270×760 @2x | PH slide 5 — interview prep built from the résumé |
| `ph-thumbnail-512x512.png` | 512×512 | PH logo/thumbnail (min 240×240) |
| `og-link-share-1200x630.png` | 1200×630 @2x | OG/Twitter card, Reddit link-post preview |
| `social-square-1080x1080.png` | 1080×1080 @2x | Instagram / square Reddit image post |
| `reddit-banner-1920x384.png` | 1920×384 | Subreddit / profile banner |

## Regenerating

```bash
pip install playwright && playwright install chromium
python marketing/render.py
```

Edit copy/layout in `html/*.html`; shared brand tokens (amber mark `#c4793a`,
blue `#2563eb`/`#58a6ff`, navy gradient, DM Sans) live in `html/base.css`.
The logo mark SVG is copied verbatim from `components/BrandLogo.tsx` — keep
them in sync if the mark changes.

Claims used in the copy (keep honest, update when stale):
- 160k+ live US postings / 8,000+ company boards — jobs corpus as of 2026-07
- 400+ early users — landing-page social proof figure
- 8-dimension score, <60s, free, no account — product facts
