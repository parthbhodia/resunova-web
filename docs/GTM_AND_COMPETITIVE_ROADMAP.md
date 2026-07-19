# GTM Decision + Competitive Roadmap (vs CareerOS / Handshake)

_Last updated 2026-07-14. Companion to `marketing/REDDIT_DATA_POSTS.md` and the
community college outreach kit. Competitive facts verified against careeros.com,
their funding announcements, and public product pages in July 2026._

## The GTM decision (one wedge, not three)

**Chosen: community-college-first, advisor-dashboard-led, student-side free.**

Rationale: career services at community colleges is drastically understaffed
(1 to 3 advisors for 5,000 to 20,000 students), placement outcomes drive their
funding and accreditation, our role-aware design (nursing gets patient
scenarios, analysts get SQL, business gets cases) is uniquely suited to their
program mix, and CareerOS's beachhead (European business schools, networking-first
MBA behavior) barely overlaps it. We sell capacity multiplication to the
institution and give the student product away.

**90-day plan:**
1. **Now to Aug 1:** PH launch (consumer credibility + users). Send the seven
   outreach drafts (CT State, Montgomery, Anne Arundel, Bronx CC, Bergen,
   LaGuardia, UMBC). Walk into Hudson County CC in person.
2. **Aug to Sep:** land 3 free single-program pilots (target: 1 NJ/NYC,
   CT State, 1 MACC college). Ship the institutional gap list below so pilots
   onboard cleanly. Name UMBC as reference the moment they agree.
3. **Oct to Dec:** mid-semester score-delta reports to each pilot dean; convert
   2 pilots to paid campus site licenses (anchor $3k to $8k/campus/year) for
   spring semester; open the MACC/VCCS system conversations with pilot data.

**Success metrics:** 3 pilots signed by Sep 1 · 500 student scans across pilots
by Oct 15 · 2 paid contracts by Dec 15.

**Explicitly deferred:** head-to-head against CareerOS at 4-year business
schools; employer-relations/event-management surface (that is Handshake's and
CareerOS's fight, not ours).

## Competitive landscape in one paragraph each

- **Handshake**: a JOB MARKETPLACE. Employers post roles targeted at partner
  schools; career centers manage events/appointments; the moat is the employer
  network (both sides pay/participate). It owns supply.
- **CareerOS**: a CAREER-CENTER CRM layered on top of other people's supply.
  Students save jobs from LinkedIn/Indeed/Handshake via a browser extension and
  get networking recommendations; advisors get coach assignment, AI session
  summaries, events, and equity/outcomes reporting. $1.2M pre-seed (Feb 2024),
  European business schools + UMD/Texas A&M, Highered merger for employer reach.
  It does NOT ingest or own jobs.
- **Resunova**: a STUDENT OUTCOME ENGINE. Owns a 247k-posting first-party
  corpus with deterministic importance-weighted matching, honest validated
  résumé scoring, résumé-to-JD interview prep with drafted answers, and an
  advisor dashboard computed from real student work product. It owns the
  analysis, not the CRM.

So: CareerOS is not "Handshake but smaller"; it is workflow on top of
bookmarked jobs. We are not behind them on product depth; we are behind on
institutional packaging and GTM polish, which is weeks of work, not years.

## How CareerOS gets jobs, and what we take from it

Their model: **user-initiated capture**. A Chrome extension lets students save
any posting they see (LinkedIn, Indeed, Handshake, JobTeaser) into CareerOS.
No scraping, no corpus, no freshness guarantees; the student is the crawler.

**Adopt the mechanism, keep our engine: build a "Save to Resunova" browser
extension.** User-initiated, single-page capture of a posting the student is
already viewing (low legal risk, unlike bulk scraping), POSTed to a new
`/api/jobs/save-external`, run through the existing `extract_requirements_from_jd`
one-call extraction, scored with `_feed_match_score` against their résumé, and
saved into the existing application tracker. This is strictly better than
CareerOS's version (they bookmark a link; we return a match score + gap
analysis on save) AND it plugs our biggest CC-segment gap: local hospital,
school district, county government jobs our national ATS crawl misses.
Cost: one extraction call per saved job, on infrastructure we already run.

## The copy list (validated by their traction), with Fable build estimates

Estimates are focused Claude Code sessions on this codebase, including tests.
"Session" = one working block; 2 to 3 sessions ≈ a day of wall-clock effort.

| # | Item | Why | Estimate | Notes |
|---|---|---|---|---|
| 1 | Advisor session-prep summary | Their headline feature; we already store everything it needs | 1-2 sessions | Button on student detail → LLM summary over score history + issues + applications; cache per (student, latest analysis) |
| 2 | Cohort report export (CSV + PDF) | "Reports in seconds, not weeks" is their best sales line | 1 session | CSV from `/api/cohort-stats`; PDF via existing Chromium export path |
| 3 | Coach assignment | Multi-advisor colleges need student→advisor mapping | 2 sessions | `institution_advisors` exists; add advisor_id scoping on roster + queue |
| 4 | FERPA one-pager + security page | First procurement question, blocks every deal | hours | Student-owned accounts, RLS, advisor scoping already true; write it down |
| 5 | Customers/social-proof page | Credibility gap vs their logo wall | hours | Ships the moment UMBC agrees to be named |
| 6 | Config-driven institution branding | UMBC variant is hardcoded by email domain today | 2-3 sessions | Table of {domain, name, logo, colors, banner copy}; generalize `userDomainDetection` |
| 7 | Save-to-Resunova Chrome extension | Their acquisition mechanism + our local-jobs gap | 1-2 weeks | MV3 extension + `/api/jobs/save-external` + store review time (review latency dominates) |
| 8 | SSO (SAML/institutional) | Required at system-deal scale, not for pilots | 1-2 weeks | Supabase SAML SSO (paid tier) + per-IdP testing; Google OAuth already covers pilots |

**Total to close the gap that matters: roughly 3 to 4 weeks of focused sessions**
(items 1-6 ≈ one week; extension and SSO run longer mostly on external review
and IdP coordination, not code).

**Cloning ALL of CareerOS (events, employer CRM, Salesforce/Canvas/Outlook
integrations, equity demographics): months, and the wrong move.** That surface
is their identity and Handshake's fortress; ours is the outcome engine. We copy
the six things their buyers demonstrably value and skip the CRM.

## Positioning line for deals where CareerOS appears

"CareerOS organizes your career center. Resunova improves your students and
proves it with a score delta per student. If you can only fund one, fund the
one that changes outcomes rather than tracks them."
