# Reddit Data-Story Posts — S&P 100 Tech Jobs Corpus

5 self-contained, data-driven posts built from the Resunova jobs pipeline. Each has:
title options → body → "how we built it" → where to post. Numbers marked ✅ are
live-verified from the pipeline (June–July 2026 sessions). Numbers marked `[SQL]`
have a ready-to-run query at the bottom — run it right before posting so the
figure is fresh, then delete the bracket.

**Rules (same as LAUNCH_KIT):** clean URLs only on Reddit (no UTM — automod
filters). Post as "side project I built" — Reddit rewards builders, punishes
marketers. Lead with the data, mention the product once at the end or only in
comments when asked.

---

## Post 1 — The corpus flex (r/dataisbeautiful, r/cscareerquestions, r/datasets)

**Title options:**
- "I've been scraping the career sites of 19 S&P 100 companies every day. Here's what 247,000 live job postings look like."
- "247k live US job postings, scraped daily, straight from company career sites — no Indeed, no LinkedIn. AMA about the data."

**Body:**

Most job-market data you see on Reddit comes from Indeed/LinkedIn scrapes —
aggregator data that's weeks stale and full of ghost reposts. I wanted the
source of truth, so I built a pipeline that hits company ATS APIs directly
(Greenhouse, Lever, Ashby, Workday, SmartRecruiters, iCIMS…) every day.

Current scale:
- **247,000 active US postings** ✅ (deactivated the moment they leave the board)
- **~3,700 new US postings ingested per day** ✅
- **8,885 company boards scanned daily** ✅, incl. **19 S&P 100 companies first-party**: NVIDIA, Amazon, Visa, Mastercard, Salesforce, Adobe, Cisco, Broadcom, Capital One, Wells Fargo, U.S. Bank, BlackRock, CVS Health, Accenture, Boeing, Chevron, Comcast, Disney, Target
- **142,000 postings with LLM-extracted skill requirements** ✅
- **34,000 with structured salary data** ✅
- **61,000 matched to federal H-1B sponsorship records** ✅

A snapshot from the big names (live counts from their own boards): NVIDIA ~287,
Salesforce ~285, Visa ~271, Capital One ~266, Cisco ~252, Accenture ~765. ✅

Top skills across S&P 100 engineering postings right now: `[SQL-1]`

Happy to answer questions about the data or share aggregate cuts.

**How-we-built-it paragraph (drop in body or first comment):**
Every ATS platform exposes a public JSON API for its hosted career pages —
nobody rate-limits them because real candidates hit the same endpoints. The hard
part isn't fetching, it's the long tail: Workday lies about pagination totals
after page 1, Amazon's board UA-filters non-browsers, and half the "new" postings
each day are byte-identical duplicates the pipeline has to hash-dedupe. One LLM
call per posting turns the JD into structured requirements, cached forever —
so scoring a résumé against all 247k jobs costs zero tokens at request time.

---

## Post 2 — The engineering war story (r/webscraping, r/programming, r/ExperiencedDevs)

**Title options:**
- "A one-line pagination bug hid 90% of Fortune-500 job postings from my scraper for weeks"
- "Workday's API returns the real result count only on page 1. Page 2 onward: total=0. Here's how that silently capped every enterprise board at 40 jobs."

**Body:**

I scrape ~8,900 company career boards daily for a jobs dataset. For weeks,
every Workday-hosted enterprise board — NVIDIA, Visa, Salesforce, Adobe, Cisco,
Capital One — was stuck at ≤40 postings while smaller Greenhouse startups showed
hundreds. I assumed big companies just posted less through the API. Wrong.

Workday's CXS endpoint returns the true `total` (e.g. 2000) **only on the first
page**. Every subsequent page says `total: 0`. My loop's exit condition was
`offset >= total` → `40 >= 0` → stop after 2 pages. Silent, no error, plausible
output. The worst kind of bug.

The fix was one guard: only trust a *positive* total; let the empty-page check
handle real exhaustion. Results overnight: NVIDIA 0→287 live postings, Visa
0→271, Salesforce 11→285, Cisco 2→252, Capital One 3→266. ✅

Then the 7.5× heavier crawl immediately tripped Akamai's rate limiter — 61 of
183 boards started returning 429 — so round two was `Retry-After`-aware backoff
and dropping concurrency from 8 to 3.

Lessons:
1. Never re-trust a paginated API's metadata after page 1 without a positivity guard.
2. "Plausible but small" output is more dangerous than an exception.
3. Fixing throughput bugs earns you rate-limiting bugs. Budget for both.

(Dataset this feeds: 247k live US postings across 8,885 boards, incl. 19 S&P
100 companies first-party. ✅)

---

## Post 3: The ghost-jobs exposé (r/recruitinghell, r/jobs, r/webscraping)

**REVISED 2026-07-14 (the original ~40%/"800 times" framing below was a
one-time snapshot from a single provider-activation surge on 2026-07-02, not an
ongoing daily rate. The honest current picture, live-verified today: the boards
never stop re-listing duplicates, so the dedupe pass collapses ~23,000 of them
on EVERY scan, and the active-feed duplicate share oscillates between ~3% right
after a pass and ~12% mid-crawl. Full numbers, methodology, and the near-miss
bug in the fix itself are in the companion blog post; this post leads with the
discovery, then links out instead of claiming any point-in-time rate as
permanent.)**

**Title options:**
- "I turned on 6 new job-board integrations overnight and found 13,000 duplicate postings hiding in the surge. One company had reposted the same JD to ~800 locations."
- "How much of a 'live jobs' feed is duplicate spam? 38% on the worst day I measured. My dedupe pass now collapses ~23,000 reposted JDs per scan, every scan, and they always come back."

**Body:**

I run a pipeline that ingests job postings directly from company ATS APIs
(not aggregators). In early July I turned on six previously-dormant provider
integrations at once, and daily US ingest jumped ~7x (~530 → ~3,700/day). Before
I could celebrate, I looked closer at what had actually come in.

Of the ~34,000 raw postings ingested that run, ~13,000 (38%) were byte-for-byte
identical to another posting in the same batch. ✅ Same title, same body text,
different location field. The record holder: a security-staffing company had
reposted **one job description across ~800 different locations**. ✅ One real
requisition, counted 800 times by anything that doesn't dedupe.

Why it matters if you're applying:
- Aggregators that count postings raw inflate "X,000 open roles" this way:
  the real number of distinct reqs is a fraction of the headline count.
- Companies doing this are usually pipeline-building (collecting résumés
  broadly), not filling a specific seat in your city.
- A stricter fix (byte-identical only, not "looks similar") turned out to
  matter: a looser normalized-text match I tried first over-collapsed ~17,000
  postings that only *shared boilerplate*, not the same job.

Here's the kicker: the fix is a treadmill, not a cleanup. The boards never
stop re-listing the duplicates, so every fresh crawl re-activates them, and
the pass at the end of the crawl collapses them again. My scan logs show
**~23,000 duplicates deactivated on every single scan**, several times a day.
The active-feed duplicate share breathes with the cycle: ~3% a few hours after
a pass, ~12% mid-crawl (both measured live on the same day). And it's never
the same offenders: today's crawl surfaced a personal-training company with
one JD active in 383 copies, a boutique-fitness chain at 163, and a delivery
service at 158. Full breakdown + the query behind every number:
https://resunova.io/blog/ghost-jobs-duplicate-postings/

---

## Post 4 — The H-1B / real-contacts data drop (r/cscareerquestions, r/h1b, r/immigration)

**Title options:**
- "I cross-referenced 247k live job postings with DOL H-1B filings. 61,000 of them are at employers who actually sponsor. The government data even has real HR emails."
- "Stop guessing which companies sponsor H-1B. I matched live postings to federal LCA filings — here's what the data shows."

**Body:**

Every company that sponsors an H-1B must file an LCA with the Department of
Labor, and those filings are public — including the **employer's point-of-contact
email**, which is a real HR/immigration person on the company's own domain
(present for 92.9% of the 30,103 employers in the disclosure files ✅).

I matched those filings against a live corpus of 247k US job postings scraped
daily from ~8,900 company career sites. Results:

- **61,000 active postings are at verified H-1B sponsors** ✅ — about 1 in 4.
- **30,103 distinct sponsoring employers** in the DOL data ✅, from FAANG down to
  50-person consultancies you've never heard of.
- Of the S&P 100 companies I track first-party (NVIDIA, Visa, Salesforce,
  Cisco, Capital One, Amazon…), sponsorship rate on live tech reqs: `[SQL-3]`

Practical takeaways:
1. "Does this company sponsor?" is answerable from public data before you apply.
2. The LCA POC contact is often more responsive than the black-hole portal —
   it's a human whose job is literally this.
3. Sponsorship concentrates hard: consultancies + big tech dominate filings,
   but the long tail of small sponsors is where competition is lowest.

Data/method in comments if people want it.

---

## Post 5 — The $14/month LLM pipeline (r/LocalLLaMA, r/SideProject, r/selfhosted)

**Title options:**
- "My pipeline runs LLM extraction over ~3,700 job descriptions a day (283M tokens/90 days). Total LLM bill: ~$14/month. Here's the stack."
- "How I process 142k job descriptions with LLMs without going broke: qwen-turbo + a local 8B on my own GPU"

**Body:**

I extract structured requirements (skills, salary, seniority, work model, visa
signals) from every job posting in a 247k-posting corpus. The naive version of
this — frontier model, one call per JD — would cost ~$2,500 per quarter.
Mine costs **~$14/month total**. ✅

The token math (90-day window, from my own usage logs ✅):
- **qwen-turbo: 61% of tokens** — bulk JD extraction via DashScope (real-time + batch). ~90× cheaper on input than the frontier model I started with.
- **llama3.1:8b: 19%** — local Ollama on my own GPU. Free. Handles the backlog grind.
- **qwen3-vl-plus: 15%** — vision extraction (résumé side of the product).
- Frontier model (grok-4): **<0.1%** — reserved for the one task where quality actually pays.

Design rules that made it cheap:
1. **Extract once at ingest, never per user.** The structured output is cached on
   the posting row; matching a résumé against all 247k jobs is deterministic
   scoring, zero tokens per request.
2. **Content-hash before extracting.** ~40% of daily raw ingest is duplicate JD
   text ✅ — hash-dedupe first and you never pay for the same JD twice.
3. **Route by task, not by loyalty.** Strict-schema JSON extraction is a solved
   problem for cheap models; only the fuzzy judgment call needs the expensive one.
4. **Never mix extractor models in one ranked corpus.** A/B'd the same JD+résumé
   on two extractors: importance-bucket distributions diverged so hard the match
   score went 29 vs 67. ✅ Switching models means re-extracting everything.

Happy to share schema / prompt details in comments.

---

## SQL to fill the `[SQL-n]` slots (run in Supabase SQL editor, prod project)

S&P 100 tracked set (adjust as coverage grows):

```sql
-- reusable CTE prefix for all three queries
with sp100 as (
  select unnest(array[
    'nvidia','amazon','visa','mastercard','salesforce','adobe','cisco',
    'broadcom','capital one','wells fargo','u.s. bank','blackrock',
    'cvs health','accenture','boeing','chevron','comcast','disney','target'
  ]) as name
)
```

**[SQL-1] Top 10 skills across S&P 100 tech postings:**

```sql
, sp_posts as (
  select jp.requirement_concepts
  from job_postings jp join sp100 s on lower(jp.company) = s.name
  where jp.is_active and not jp.non_us
    and jp.role_family in ('software','data')
    and jp.requirement_concepts is not null
)
select c->>'canonical' as skill,
       count(*) as postings,
       round(100.0 * count(*) / (select count(*) from sp_posts), 1) as share_pct
from sp_posts, jsonb_array_elements(requirement_concepts) c
where length(c->>'canonical') <= 40   -- drop responsibility-sentence junk
group by 1 order by 2 desc limit 10;
```

**[SQL-2] Location-clone share at S&P 100:**

```sql
, sp_posts as (
  select jp.id, md5(jp.jd_text) as jd_hash
  from job_postings jp join sp100 s on lower(jp.company) = s.name
  where jp.is_active and not jp.non_us and jp.jd_text is not null
)
select count(*) as total,
       count(*) - count(distinct jd_hash) as clones,
       round(100.0 * (count(*) - count(distinct jd_hash)) / count(*), 1) as clone_pct
from sp_posts;
```

**[SQL-3] H-1B sponsor share of live S&P 100 tech reqs:**

```sql
select round(100.0 * count(*) filter (where jp.h1b_sponsor) / count(*), 1) as sponsor_pct
from job_postings jp join sp100 s on lower(jp.company) = s.name
where jp.is_active and not jp.non_us and jp.role_family in ('software','data');
-- if the flag column differs, join through the h1b match table instead
```

> Column-name caveat: written against the documented schema (`is_active`,
> `non_us`, `role_family`, `requirement_concepts`, `jd_text`). Verify the H-1B
> flag/join name in the live schema before running SQL-3.

---

## Posting strategy

| Post | Subreddits (pick 1–2, don't cross-post same day) | Best day |
|---|---|---|
| 1 Corpus flex | r/dataisbeautiful (needs a chart!), r/datasets, r/cscareerquestions | Tue–Thu AM ET |
| 2 Workday bug | r/webscraping, r/programming, r/ExperiencedDevs | Any weekday |
| 3 Ghost jobs | r/recruitinghell, r/jobs | Sun evening / Mon AM (job-hunt anxiety peak) |
| 4 H-1B | r/cscareerquestions, r/h1b | Weekday AM ET |
| 5 $14 LLM | r/LocalLLaMA, r/SideProject | Sat/Sun (hobbyist traffic) |

- Space them ~3–5 days apart; Post 2 or 5 first (pure engineering, zero promo
  smell) to build account karma before the product-adjacent ones.
- For r/dataisbeautiful, Post 1 needs an original chart (bar: postings per S&P
  company; or skills share) — OC rule. The marketing/render.py setup can
  generate it.
- Mention Resunova only when asked in comments, or one line at the end:
  "This feeds a side project I'm building (resunova.io) — happy to share the
  pipeline details regardless."
- Post 3 + 4 are timed well ahead of the July 14 PH launch — comment karma
  there gives the launch-day posts credibility.
