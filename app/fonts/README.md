# Self-hosted fonts

Loaded with `next/font/local` so a build never makes a network request for a
font. These came from the Fontsource packages (`@fontsource-variable/geist`
5.3.0 and `@fontsource/newsreader` 5.3.0), latin subset, both OFL-1.1; each
licence sits beside its file.

| File | Used for |
| --- | --- |
| `geist-latin-wght-normal.woff2` | The app and marketing body face (`--font-sans`), variable weight 100 to 900 |
| `newsreader-latin-400-italic.woff2` | The pricing headline's italic only |

Do not go back to `next/font/google`. It fetches from Google at build time, and
when that fetch failed on Vercel the production deploy of the job-pages change
errored with `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`
(it had failed the same way on two earlier merges). `lib/__tests__/noBuildTimeFontFetch.test.ts`
fails the build if it comes back.
