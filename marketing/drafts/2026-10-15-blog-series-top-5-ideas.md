# Blog series: top 5 ideas (Oct 2026)

Source of the list: LinkedIn + Reddit research for what job seekers are actually arguing about, then five source-inspired posts that do not rewrite existing Resunova ATS / tailor guides.

## Already shipped (related)

| Slug | Title | Status |
|------|-------|--------|
| `job-search-2026-whats-working` | Most of Your Job Search Shouldn't Be Applications | Live (series #1) |
| `employee-referrals-help-and-ask` | Ask for a Referral Without Being Awkward… | Live (spin-off from #1, product `/refer/`) |

Older live posts (not this series): LinkedIn applicant counts, ghost/duplicate postings, salary transparency, S&P 100 hiring, Claude prompts, ATS how-it-works, optimizing for ATS, tailor to JD, AI rewrite failure modes, methodology.

## Shared house rules

- Tone: calm, measured, slightly skeptical of viral advice. Builder voice, not coach-hype.
- Information gap in the title; answer later.
- No spaced em dashes in user-facing copy. No "seamlessly / effortlessly."
- Proof ladder: named third-party reports (Gem, Ashby, Glassdoor, LinkedIn, Huntr) and Resunova corpus only when measured. Reddit/LinkedIn consensus labeled as consensus, never as measurement.
- Do not plagiarize. Credit the spark, rewrite with our angle and our proof.
- Prefer external citations over Resunova-as-proof in the body; product CTA at the end is fine.

---

## 1. Job searching in 2026: what's working

**Status:** Shipped as `job-search-2026-whats-working`.

**Inspired by:** Sarah Felice (LinkedIn Pulse)

**Our question:** What share of search time should go to applications vs humans, and what does "working" mean when portals feel dead?

| | |
|---|---|
| **Include** | Time-split framework; warm intros / alumni / recruiter notes; LinkedIn as discovery + outreach, not as the ATS; how long to expect before momentum; when silence is normal vs a signal to retarget |
| **Exclude** | Step-by-step resume rewrite; ATS parsing deep dive |
| **Tone** | Systems coach. Respects a slow market without doom |
| **Proof** | Gem / Ashby referral conversion; Glassdoor + CNBC on cold apply volume; LinkedIn connection hire rate; Huntr board vs career-page rates; Felice timeline as reported |
| **Risk** | Easy to sound generic without hard external numbers (mitigated in the live post) |

**Working title:** Most of Your Job Search Shouldn't Be Applications  
**Tag:** Guide

---

## 2. Job search strategy for 2026

**Status:** To write.

**Inspired by:** Jill Pante–style "operating system" Pulse advice

**Our question:** What's the weekly operating system (targets, AI role, follow-ups), not the vibes?

| | |
|---|---|
| **Include** | 80/20 people > portals as a *workflow*; target-company list so network asks are specific; AI as gap-finder not ghostwriter; value-story library (one win/week); same-day human message after apply; tracker fields (company, role, date, contact, status) |
| **Exclude** | Long resume craft; parser internals |
| **Tone** | Operator / checklist. Short sections, scannable |
| **Proof** | Soft: strategy consensus. Hard: narrow apps beat volume → median hard requirements (corpus **13**); link shipped ghost/duplicate post if useful. Product: Tailor + library as the tracker's resume layer |
| **Risk** | Overlaps #1. **Diff:** #1 = *why* mix of time; #2 = *calendar and artifacts* |

**Working title:** A Weekly Job Search System That Survives a Dead Portal  
**Suggested slug:** `job-search-weekly-system-2026`  
**Tag:** Guide

---

## 3. How to write a resume that gets noticed (2026)

**Status:** To write.

**Inspired by:** Andrew Seaman

**Our question:** What does a human (and a keyword search) actually notice in 15 seconds?

| | |
|---|---|
| **Include** | Kill the objective; summary as quantified elevator pitch; bullets as problem → action → outcome; mirror employer language *where true*; "noticed" = recruiter skim + search recall, not Canva aesthetics |
| **Exclude** | Full ATS engine tour; white-text / prompt-injection (one short "don't" with a named source) |
| **Tone** | Editorial clarity, Resunova-skeptical of fluff |
| **Proof** | Strongest lane: `ai-resume-rewrite-failure-modes` validators (no-op rewrite, fake quantification, dropped metrics). Cross-link Claude prompts for the good AI path |
| **Risk** | Closest to existing tailor + optimizing-ATS guides. Lead with *writing craft + verification*, not keyword extraction we already published |

**Working title:** What Recruiters Actually Notice on a Resume (And What AI Quietly Erases)  
**Suggested slug:** `what-recruiters-notice-on-a-resume`  
**Tag:** Guide

---

## 4. I reverse-engineered ATS parsing

**Status:** Parked unless we add primary evidence.

**Inspired by:** r/ResumesATS reverse-engineering thread

**Our question:** What does the *text layer* look like after parse, and which layout choices die?

| | |
|---|---|
| **Include** | Tokenization quirks as *illustrative*; Ctrl+A / paste-to-Notepad test; single column, standard headers, contact in body, one date format; "saved from Canva = image risk" |
| **Exclude** | Claiming we reverse-engineered Workday's proprietary parser unless we did |
| **Tone** | Technical but plain |
| **Proof** | Overlaps `how-ats-really-works`. **Only ship with new artifacts:** paste-test screenshots, before/after parse of a bad layout, or product-side parse checks |
| **Risk** | Highest duplication risk. Prefer a tight companion ("the notepad test") or fold into an ATS post update |

**Working title:** Paste Your Resume Into Notepad. That's Closer to What the ATS Sees.  
**Suggested slug:** `ats-paste-into-notepad-test`  
**Tag:** Research (only with new artifacts)

---

## 5. How recruiters sort in Workday / Greenhouse / Lever / Ashby

**Status:** To write (recommended next after #2 or before #3).

**Inspired by:** r/ResumesATS recruiter-sort thread

**Our question:** Is there a secret match score, or is it knockout filters + keyword search + date order?

| | |
|---|---|
| **Include** | Default view ≈ chronological; knockout questions as the real auto-reject; keyword search as the surface mechanism; apply-early as a mild tie-breaker; referrals jump the queue; myth-bust "ranked by AI score" |
| **Exclude** | Resume bullet writing; full parse tutorial |
| **Tone** | Myth-busting, recruiter-adjacent. Short, quotable |
| **Proof** | Soft: Reddit recruiter consensus (label it). Hard: LinkedIn applicant-count framing; corpus hard-requirement density (**13**). Optional first-hand product/public ATS behavior without leaking methods |
| **Risk** | Partially covered in `how-ats-really-works`. Make this the *recruiter UX* post (sort, filter, stop-when-enough), not the *parser* post |

**Working title:** There's No Secret ATS Leaderboard. Recruiters Search, Filter, and Stop.  
**Suggested slug:** `no-secret-ats-leaderboard`  
**Tag:** Research / Guide

---

## Recommended writing order

| Order | Post | Why |
|-------|------|-----|
| Done | #1 | Live |
| Next | #5 | Myth kill; opens the gap for craft posts |
| Then | #2 | Weekly OS pairs with #1 |
| Then | #3 | Document craft after the pile is demystified |
| Park | #4 | Only if we add paste-test / parse artifacts |

**Do not invent:** Felice's 10%→40%, "90% of recruiters use ATS," viral prompt-injection interview rates. Report with a named source or omit.

## Product links to reuse

- Series #1 already points at `/refer/` and the referrals post.
- #2 / #3 CTA: Tailor / Analyze / Claude prompts / failure-modes validators.
- #5 CTA: Analyze (honest checks) rather than "beat the ATS" hype.
