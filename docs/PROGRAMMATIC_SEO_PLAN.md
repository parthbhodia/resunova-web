# Programmatic SEO Plan — Resunova

> Built with the `programmatic-seo` skill methodology, grounded in the actual
> resunova-web stack and the resunova-api jobs dataset.
> Source keyword data: Semrush organic export, resunova.io vs kickresume.com
> (resunova.io currently ranks position 0 — i.e. nowhere — for every term below).

---

## 1. Situation

resunova.io ranks for **none** of the high-volume resume keywords. kickresume.com,
Teal, Resume Genius, Resume Now, and Zety own the SERPs. We have:

- A real product (AI tailoring + an ATS/resume scoring engine) — *commercial intent* terms.
- A **proprietary jobs dataset** (~208k postings in Supabase, with `role_family`
  classification, LLM-extracted `requirement_concepts`, salary, and work-model facts).
- A working **Template Builder** (sign-up-free, HTML→Chromium export).
- An existing content surface (`/blog`, 3 ATS articles) and clean technical SEO
  (root metadata, sitemap, robots, OG images).

The gap is **coverage**: we have ~6 indexable marketing URLs. The keyword universe
below is thousands of intent-bearing queries. Programmatic SEO closes that gap
*if* every page carries unique value — which our data lets us do.

### The one constraint that shapes everything

`next.config.ts` → **`output: "export"`** (static GitHub Pages build, `trailingSlash: true`).

There is **no SSR and no ISR**. Every programmatic page must be generated at
**build time** via `generateStaticParams()`, pulling its data from either:
1. a committed typed data file (the existing `lib/atsBlogPosts.ts` pattern), or
2. a **build-time fetch** to the API / Supabase (results frozen into the static HTML).

Client-side `fetch` does **not** count — Google may not run our JS reliably and AI
crawlers (GPTBot, PerplexityBot, ClaudeBot) do not run JS at all. **If the content
isn't in the static HTML, it doesn't exist for SEO.** This is the single most
important engineering rule for everything that follows.

---

## 2. Opportunity analysis — keyword clusters → playbooks

Grouped from the Semrush export by the pSEO playbook that fits, with aggregate
monthly US volume. (Volumes are the export's; many more long-tail variants exist on
pages 2–349 of the same report.)

| Cluster | Representative keywords (volume) | Aggregate | Playbook | Difficulty | Our moat |
|---|---|---|---|---|---|
| **Templates** | resume templates (823K), resume template (165K), free resume templates (60.5K), resume templates free (49.5K), professional resume template (14.8K), ats friendly resume template (12.1K), best resume templates (14.8K) | **~1.2M+** | Templates | High | Template Builder |
| **Examples** | resume examples (110K), resume example (18.1K), sample resume (12.1K), good/best resume examples (14.7K), resume summary examples (8.1K) | **~165K** | Examples + Personas | Med-High | **Jobs DB (real per-role data)** |
| **"Resume for [role]"** | persona long-tail (not all on page 1; classic pSEO pattern) | **High, fragmented** | Personas | Med | **Jobs DB (15 role families)** |
| **ATS tools** | ats (40.5K), ats resume checker (14.8K), resume score (12.1K), ats friendly resume (9.9K), ats cv checker (9.9K) | **~95K** | Product/tool | Med | **Resume scoring engine** |
| **How-to / glossary** | how to start a resume (368K), how to make a resume (40.5K), how to make a resume for first job (12.1K), words to describe yourself (14.8K), resume summary examples (8.1K) | **~450K** | Glossary/How-to | High | Blog + scorer |
| **Cover letters** | cover letter templates (550K), cover letter examples (9.9K), cover letter generator (12.1K), how long should a cover letter be (14.8K) | **~600K** | Templates + Glossary | High | (needs product) |
| **Comparisons / alternatives** | kickresume, resume now, resumenow, teal resume builder, resume genius | **brand-volume** | Comparisons | Low | We're the cheaper/free option |
| **Notice letters (adjacent)** | two weeks notice letter (9.9K), 2 week notice letter (18.1K), two weeks notice template (8.1K) | **~45K** | Templates | Low-Med | generic, but easy wins |

### Reading the table

- **Templates and cover-letter templates are the largest pools but the hardest** —
  every resume site on earth targets them, and our content there is least
  differentiated. Compete with *quality + the Template Builder as the CTA*, not volume.
- **Examples + "resume for [role]" is the strategic sweet spot.** Medium volume,
  *defensible* because our jobs DB gives real per-role data nobody else has at this
  granularity. This is where we win, not just rank.
- **ATS tools is the highest-intent, highest-conversion cluster** and maps directly
  onto a product we already have. Treat the scorer as a *free tool landing page*, not
  a blog post.
- **Comparisons are the cheapest wins** — low competition, high commercial intent,
  and the user literally already has the resunova-vs-kickresume data.

---

## 3. The data moat — why these pages won't be thin content

The programmatic-seo skill's #1 rule: **unique value per page, proprietary data wins.**
Google penalizes "doorway"/thin pages that just swap a variable into a template.
Our defensibility hierarchy (strongest first):

1. **Product-derived: the jobs DB.** For any role family we can compute, at build time:
   - The **top requirement concepts** employers actually ask for (`requirement_concepts`
     aggregated across that `role_family`), with frequency — e.g. *"87% of Data Analyst
     postings require SQL; 64% mention Python; 41% Tableau."* No competitor has this.
   - **Salary ranges** and **work-model split** (remote/hybrid/onsite) from real postings.
   - A genuinely **scored example resume** per role (run our own scorer once at build).
2. **Product-derived: the scoring engine.** The ATS-checker pages embed a real tool, not prose.
3. **Public/curated:** template styles, how-to guidance — weakest, so we *layer* it
   on top of #1/#2, never ship it alone.

**Rule:** no programmatic page ships unless it contains at least one element from
tier 1 or 2. A "Data Analyst resume example" page that's just a generic sample =
thin. The same page with *"the 10 skills Data Analyst postings ask for most, by
frequency, from 3,400 live postings"* + a scored example = a page that earns links
and gets cited by AI engines.

---

## 4. Recommended page systems

Six systems, in priority order. Each lists the URL architecture, title/meta
templates, content outline, schema, **data source**, and the unique-value element.

### 4.1 Resume Examples by Role — `/resume-examples/[role]/` ★ build first

The flagship system. Examples playbook × Personas playbook, fueled by the jobs DB.

- **Hub:** `/resume-examples/` — grid of all roles, links to each spoke. Targets
  "resume examples" (110K).
- **Spokes:** `/resume-examples/data-analyst/`, `/software-engineer/`,
  `/registered-nurse/`, `/sales-representative/`, … one per role we have data for.
  Start with the 15 role families, then expand to specific titles within each.
- **URL:** subfolder (consolidates authority — never a subdomain). `trailingSlash: true`.
- **Title:** `{Role} Resume Examples & Skills Employers Want in {Year} · Resunova`
- **Meta:** `See {N} real {role} job postings' most-requested skills, a scored
  example resume, and the keywords that pass ATS. Free to tailor your own.`
- **Content outline (each must be in static HTML):**
  1. H1 + a 40–60 word direct-answer intro (what a strong {role} resume needs).
  2. **"Skills employers ask for most"** — table of top `requirement_concepts` for
     this `role_family` with frequency %. ← *the unique-data block; also the
     AI-citable / featured-snippet asset.*
  3. A **scored example resume** (rendered + its real Resunova score + 2–3 callouts).
  4. **Salary & work-model** facts from real postings.
  5. Role-specific bullet/summary guidance (curated, layered on top).
  6. FAQ block (FAQPage schema) — "What skills should a {role} resume have?", etc.
  7. CTA → Template Builder / ATS checker. Internal links to sibling roles + how-to hub.
- **Schema:** `Article` + `FAQPage` + `BreadcrumbList`. (Optionally `ItemList` for the skills table.)
- **Data source:** build-time aggregate over `job_postings` grouped by `role_family`
  (see §5.2). Frozen into a `lib/roleResumeData.ts` snapshot at build.

### 4.2 ATS Resume Checker — `/ats-resume-checker/` ★ build first (highest intent)

Not strictly programmatic — a single high-value **free-tool landing page** — but it's
the highest-conversion cluster (`ats resume checker` 14.8K, `resume score` 12.1K,
`ats` 40.5K, `ats friendly resume` 9.9K) and maps onto a product we already have.

- **URL:** `/ats-resume-checker/` (+ a thin alias concept `/resume-score/` if needed,
  canonicalized to avoid cannibalization — see §6).
- **Title:** `Free ATS Resume Checker — Score Your Resume Instantly · Resunova`
- **Page:** above-the-fold upload→score widget (the existing analyze flow), then
  static explainer content (what ATS checks, our scoring dimensions, how to read the
  score) so the page has indexable substance even before JS runs.
- **Schema:** `SoftwareApplication` + `FAQPage`.
- **Why now:** commercial intent (Semrush tags these `C`), direct product fit,
  and it's the natural CTA target for every example/role page.

### 4.3 Resume Templates by Style — `/resume-templates/[style]/`

Templates playbook. Biggest pool, hardest competition — compete on the live
Template Builder as the differentiator (most competitors gate downloads).

- **Hub:** `/resume-templates/` — "resume templates" (823K), "resume template" (165K).
- **Spokes:** `/resume-templates/ats-friendly/`, `/professional/`, `/modern/`,
  `/simple/`, `/minimalist/`, `/creative/`, `/free/` — each a real Template Builder
  preset preview.
- **Title:** `{Style} Resume Templates (Free, ATS-Friendly) · Resunova`
- **Unique value:** each template is *live-editable in the browser* (no email wall),
  exported via our Chromium pipeline. Pair with a "who this style is for" + a
  same-style example resume (reuse §4.1 data). Avoid shipping a bare image gallery.
- **Schema:** `Article` + `BreadcrumbList` (+ `ImageObject` for previews).

### 4.4 Competitor Comparisons & Alternatives — `/compare/` + `/alternatives/`

Comparisons playbook. The **cheapest, fastest wins** — low competition, high intent,
and AI engines cite comparison content ~33% of the time (it's their favorite format).

- `/compare/resunova-vs-kickresume/`, `/resunova-vs-teal/`, `/resunova-vs-zety/`,
  `/resunova-vs-resume-genius/`, `/resunova-vs-resume-now/`
- `/alternatives/kickresume/`, `/alternatives/teal/`, … ("best free alternative to X")
- **Title:** `Resunova vs {Competitor}: Free ATS Tailoring Compared ({Year})`
- **Content:** honest comparison **table** (price, free tier, ATS scoring, JD
  tailoring, template count, export, sign-up required), then prose on who each suits.
  Balanced and accurate — fabricated comparisons get penalized and erode trust.
- **Schema:** `Article` + `FAQPage`. Strong AI-citation candidate.
- **Data:** a committed `lib/competitors.ts` table (curated, fact-checked, dated).

### 4.5 "Resume for [role]" Personas — `/resume-for/[role]/`

Personas playbook, sharing the §4.1 jobs data but targeting the "resume for X"
phrasing (career-changer / first-job / by-industry intent). Build *after* 4.1 proves
the data pipeline — same data, second template, so marginal cost is low. Watch
cannibalization with `/resume-examples/[role]/` (see §6): differentiate intent
(examples = "show me", resume-for = "how do I make mine") and cross-link rather than
compete.

### 4.6 How-to / Glossary hub expansion — `/blog/` + `/guides/`

Glossary/How-to playbook. Highest volume (`how to start a resume` 368K) but most
competitive and least defensible — so **not** a primary bet. Expand the existing blog
with how-to guides that *end in our tools*: "how to make a resume" → Template Builder;
"how to make a resume for your first job" → scorer; "resume summary examples" →
pull real summaries by role from §4.1 data. Query fan-out (AI search) rewards
covering the full cluster, so these guides also lift the example/role pages.

---

## 5. Technical implementation (static-export pattern)

### 5.1 Mirror the existing data→page→sitemap pattern

The repo already does content-as-data correctly:
`lib/atsBlogPosts.ts` (typed array) → `app/blog/.../page.tsx` (renders) →
`app/sitemap.ts` (maps into sitemap). Programmatic systems extend this exactly.

```
lib/roleResumeData.ts        # typed snapshot: role slug, label, top skills[], salary, example
app/resume-examples/page.tsx            # hub (static)
app/resume-examples/[role]/page.tsx     # spoke + generateStaticParams + generateMetadata
components/seo/SkillFrequencyTable.tsx  # the unique-data block (reused across systems)
components/seo/JsonLd.tsx               # schema injector (<script type="application/ld+json">)
```

### 5.2 Build-time data freeze (the critical piece)

Because there's no SSR, the per-role aggregates must be computed **before/at build**
and committed as static data. Two options:

- **Option A (recommended): a generator script.** Add `scripts/build-seo-data.ts`
  that queries Supabase (or a new read-only `GET /api/seo/role-stats` aggregate
  endpoint in resunova-api), computes per-`role_family` top concepts + salary + a
  scored example, and writes `lib/roleResumeData.ts`. Run it in CI before
  `next build` (and on a schedule to refresh). Output is plain typed TS — fully static.
- **Option B:** fetch inside `generateStaticParams`/page module at build (Next runs
  these in Node during `next build`). Works, but couples the build to live DB
  availability; Option A's committed snapshot is more reproducible and reviewable.

```ts
// app/resume-examples/[role]/page.tsx  (sketch)
import { ROLE_RESUME_DATA } from "@/lib/roleResumeData";

export const dynamic = "force-static";
export function generateStaticParams() {
  return ROLE_RESUME_DATA.map((r) => ({ role: r.slug }));
}
export function generateMetadata({ params }): Metadata {
  const r = ROLE_RESUME_DATA.find((x) => x.slug === params.role)!;
  return { title: `${r.label} Resume Examples & Skills · Resunova`, /* … */ };
}
```

### 5.3 Sitemap, internal linking, indexation

- **Sitemap:** extend `app/sitemap.ts` to map each programmatic data array into
  entries (mirror the `BLOG_POSTS.map(...)` block). Consider **separate sitemaps per
  system** once any system exceeds a few hundred URLs (`/sitemap-examples.xml`, …)
  so indexation is monitorable per type.
- **Hub-and-spoke linking:** every spoke links to its hub + 3–6 sibling spokes +
  the relevant tool page. No orphan pages — every programmatic URL must be reachable
  from a hub that's reachable from the main nav/footer.
- **Breadcrumbs** with `BreadcrumbList` schema on every spoke.

### 5.4 AI-SEO layer (free, do alongside)

Since the `ai-seo` skill is installed and these pages should be AI-citable:
- Lead each section with a self-contained 40–60 word answer (snippet/citation bait).
- `FAQPage` schema on example/comparison/tool pages.
- Add `/llms.txt` and `/pricing.md` to `public/` (Resunova is free — say so explicitly;
  AI buying-agents reward parseable pricing).
- Confirm `robots.ts` allows GPTBot / PerplexityBot / ClaudeBot / Google-Extended
  (currently `allow: "/"` with only `/api/` disallowed — already fine; keep it that way).

---

## 6. Guardrails (penalty & cannibalization avoidance)

- **Thin content:** enforce the §3 rule — every page carries a tier-1/tier-2 data
  element. If we can't compute real data for a role, **don't ship that role's page**
  (better 40 great pages than 400 thin ones — skill principle #5).
- **Cannibalization:** `/resume-examples/[role]/` vs `/resume-for/[role]/` vs
  `/resume-templates/[style]/` can fight for the same query. Mitigations: distinct
  primary intent per template, one canonical per intent, deliberate cross-linking
  instead of duplication, and `noindex` on any variation that's too thin to stand alone.
- **Doorway pages:** never generate a page with no search demand just because the
  data exists. Gate generation on validated volume.
- **Freshness:** stamp "Updated {month year}" and refresh the build-time data on a
  schedule (the jobs DB updates daily already).
- **Accuracy in comparisons:** competitor facts must be true and dated. Re-verify quarterly.

---

## 7. Phased rollout

Priority = volume × commercial intent × defensibility ÷ difficulty.

| Phase | Ship | Why first |
|---|---|---|
| **0 — foundation** | `JsonLd` + `SkillFrequencyTable` components; `scripts/build-seo-data.ts` + `GET /api/seo/role-stats`; `/llms.txt`, `/pricing.md` | Unblocks every data-driven system. |
| **1 — quick wins + flagship** | `/ats-resume-checker/` (intent) · `/compare/*` + `/alternatives/*` (cheap, AI-citable) · `/resume-examples/` hub + 15 role spokes (flagship, defensible) | Highest ROI; proves the build-time data pipeline. |
| **2 — scale** | Expand role spokes from 15 families → specific titles; `/resume-templates/[style]/`; `/resume-for/[role]/` personas | Scale the proven pattern; separate sitemaps. |
| **3 — depth** | How-to/glossary guides feeding the tools; cover-letter system (needs a cover-letter product/feature first) | Topical authority + fan-out coverage. |

### Measurement

- **Indexation rate** per system (GSC Coverage; per-type sitemaps).
- **Rankings** for the cluster head terms (Semrush position tracking — re-run this
  same resunova-vs-kickresume report monthly).
- **Engagement + conversion** to Template Builder / scorer (GA4).
- **AI citations** (manual monthly check across ChatGPT/Perplexity/Google AI Overviews,
  per the `ai-seo` skill) — comparison + example pages are the likeliest to get cited.
- **Watch for:** thin-content/manual-action warnings, crawl errors, cannibalization
  (two of our URLs swapping for the same query).

---

## 8. Phase 1, fully specified (ready to implement)

The single highest-leverage build: **`/resume-examples/` hub + role spokes**, because
it's the most defensible (jobs-DB data), establishes the reusable build-time data
pipeline + schema components, and gives every other system its internal-link target.

1. **Backend:** add read-only `GET /api/seo/role-stats` to resunova-api returning, per
   `role_family`: top N `requirement_concepts` with frequency %, posting count, median
   salary, work-model split. (Aggregate query, zero per-request LLM cost — same
   philosophy as `_feed_match_score`.)
2. **Build script:** `scripts/build-seo-data.ts` calls it, runs one scorer pass per
   role for the example, writes `lib/roleResumeData.ts`. Wire into the deploy workflow
   before `next build`.
3. **Components:** `components/seo/JsonLd.tsx`, `components/seo/SkillFrequencyTable.tsx`.
4. **Pages:** `app/resume-examples/page.tsx` (hub) + `app/resume-examples/[role]/page.tsx`
   (`generateStaticParams` + `generateMetadata` + the §4.1 content outline + schema).
5. **Sitemap:** extend `app/sitemap.ts` with the role array. Add `/resume-examples/` to
   the main nav/footer so the hub (and thus every spoke) is reachable.
6. **QA against §6 guardrails** before merge; verify the data is in the **static HTML**
   (view-source, not just the hydrated DOM).

> Recommended next action: I can scaffold Phase 0 + the Phase 1 page system (components,
> the build script, the hub, and a sample role spoke wired to a small committed data
> snapshot) on this branch as a working proof-of-concept, then we expand once the
> `/api/seo/role-stats` endpoint lands.

---

## 9. Implementation status (shipped in this PR — Phase 1 proof-of-concept)

A working, build-verified slice of Phase 1 is now on this branch:

- **Data (two layers, merged at module load):**
  - `lib/roleResumeData.ts` — hand-authored **editorial seed** of 4 roles
    (software-engineer, data-analyst, registered-nurse, sales-representative): slug,
    label, `roleFamily`, intro prose, a scored example, FAQ, **and** a baseline of
    skills/salary/work-model so a page is complete even before the pipeline runs.
  - `lib/roleResumeData.generated.json` — **live data** keyed by `role_family`,
    refreshed by the generator. `ROLE_RESUME_DATA` overlays it onto each seed role by
    `roleFamily` (skills/salary/work-model/postings only). **Editorial is never
    overwritten** — it can't be computed deterministically, and that's what keeps the
    pages off the thin-content line.
- **Generator:** `scripts/build-seo-data.mjs` (run via `npm run build:seo-data`) — fetches
  `GET /api/seo/role-stats` (now live in resunova-api) and writes the family-keyed
  `roleResumeData.generated.json`, rewriting only when the data changed. **Safe no-op**
  (exits 0, leaves the committed JSON untouched) when the endpoint is absent, so it's safe
  to wire into the deploy workflow before the endpoint is deployed. Plain `.mjs` — runs
  with bare `node`, no ts-runner dep. No-op, success, and the full overlay→render path
  were all tested (live family data overrides the seed; families without live data keep
  the seed).
- **Components:** `components/seo/JsonLd.tsx` (schema injector) and
  `components/seo/SkillFrequencyTable.tsx` (the proprietary-data block).
- **Pages:** `app/resume-examples/page.tsx` (hub) + `app/resume-examples/[role]/page.tsx`
  (spoke — `generateStaticParams`, async `generateMetadata`, the §4.1 content outline,
  and Article + FAQPage + BreadcrumbList JSON-LD).
- **Wiring:** `app/sitemap.ts` (hub + spokes), a nav link from `/blog`.

**Verified against the static export (`out/`), not just the dev DOM:** `next build`
green, TypeScript clean, all 166 existing tests pass; the role page's `<h1>`/`<h2>`/
content **and** all three JSON-LD blocks are present in the raw prerendered HTML; titles
carry a single `· Resunova` suffix; sitemap lists all five URLs.

### Critical invariant discovered: new SEO routes MUST be added to `AuthGate`

The root layout wraps everything in `<AuthGate>` (`components/AuthGate.tsx`), a client
component that renders a **loading spinner** during prerender for any path **not** in its
`PUBLIC_ROUTES` / `PUBLIC_PREFIXES` allowlist. A route missing from that list ships a
static HTML body that is *just a spinner* — Googlebot might recover it via JS rendering,
but non-JS AI crawlers (GPTBot, PerplexityBot, ClaudeBot) see nothing, and the page is
effectively invisible. This PR adds `/resume-examples` + the `/resume-examples/` prefix
to the allowlist. **Every future programmatic/SEO route must be added here too** — and
verified by grepping the built `out/.../index.html` for real content, not a spinner.

### To take this to production

1. ✅ **Done** — `GET /api/seo/role-stats` shipped in resunova-api (deterministic
   per-`role_family` aggregates, zero per-request LLM cost; 17 pure tests). Needs
   deploying.
2. Add `npm run build:seo-data` before `next build` in the deploy workflow(s) (point
   `SEO_DATA_API_BASE` at the API). The committed `roleResumeData.generated.json` stays
   the empty default until then; the script populates it at build.
3. Add editorial seed entries (intro / scored example / FAQ) for the remaining roles —
   the endpoint already supplies the data for all 15 families; a page ships once it has
   editorial (anti-thin-content). Then expand to specific titles within families.
4. Build the remaining Phase 1 systems (`/ats-resume-checker/`, `/compare/*`).
