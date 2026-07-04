# Resunova — launch kit

Copy for the Product Hunt launch and the surrounding push. Everything here is
draft text to edit, not final — but every claim in it is true today
(8-dimension score, validators, free/no-account, 160k+ live US postings,
8,000+ boards, 400+ early users). If a number changes before launch day,
update it here first.

---

## 1 · Product Hunt listing

**Name:** Resunova

**Tagline options** (max 60 chars — PH truncates longer):

1. `The AI resume checker that audits its own feedback` *(recommended — the differentiator, 51 chars)*
2. `Honest AI resume scoring — free, no account needed` (51)
3. `Resume scoring that deletes the AI's lies before you see them` (62 — trim if used)
4. `Score, fix, and tailor your resume in 60 seconds. Free.` (56)

**Topics:** Career · Artificial Intelligence · Productivity · Job Boards

**Description (≤260 chars):**

> Free AI résumé scoring with a twist: validators check every AI claim
> against your actual résumé and delete false feedback. 8-dimension score,
> bullet rewrites that never invent numbers, tailored PDF, 160k+ live jobs
> ranked against you. No account needed.

**Gallery order:** hero → honesty → rewrites → jobs → interview prep
(files in `assets/`, upload in that order). Thumbnail: `ph-thumbnail-512x512.png`.
**Gap to fill before launch: a 30–60s screen-capture video** (upload → score
→ rewrite → download). PH puts video first in the gallery when present.

---

## 2 · Maker's first comment

Post this within a minute of the listing going live. Personal, specific,
technical enough for the PH crowd:

> Hey Product Hunt! 👋
>
> I built Resunova because every AI resume checker I tried had the same
> problem: **the AI lies to look smart.** It told me to "add metrics" to a
> résumé that already had nine quantified bullets. It gave me "improved"
> rewrites that were word-for-word identical to my originals. It listed
> "no tables detected" as a *warning*.
>
> So the core of Resunova isn't the scoring model — it's the **honesty
> pipeline** that runs *after* it. Every claim the AI makes is checked
> against your actual résumé text: issues that contradict the evidence get
> dropped, no-op rewrites never surface, rewrites that would delete your
> numbers get rejected, and if the AI has been caught exaggerating, we stop
> trusting its overall score entirely and recompute it from the category
> evidence. When we don't know a metric, you get a `[X%]` placeholder —
> we never invent numbers for your résumé.
>
> What you get in under 60 seconds, free, no account:
> • an 8-dimension score where every number under 95 explains itself
> • bullet-by-bullet rewrites that keep your facts
> • a tailored, ATS-safe PDF
> • 160k+ live US jobs (pulled daily from 8,000+ company career pages)
>   ranked against your résumé — with salary data, H-1B sponsor history,
>   and real HR contacts
> • interview prep generated from *your* résumé — behavioral questions
>   citing your own bullets, a STAR story bank, and coding questions only
>   when the role actually calls for them
>
> It's free for students and the community. I'd genuinely love the
> harshest feedback you've got — and if you upload a résumé and the AI
> says something dishonest that slipped through the validators, tell me
> in the comments and I'll ship a fix.

---

## 3 · Teaser ("Coming Soon") page copy

**Headline:** The AI resume checker that audits its own feedback
**Body:** Most AI tools invent problems to look smart. Resunova checks every
AI claim against your actual résumé and deletes the lies — then scores you
across 8 dimensions, rewrites weak bullets without touching your facts, and
ranks 160k+ live jobs against you. Free. No account needed.
**CTA:** Get notified — we launch [DATE]

---

## 4 · Emails to the early-user list

**A · One week out** — subject: `We're launching on Product Hunt [DATE] 🚀`

> Hi — Parth here, the person behind Resunova.
>
> You were one of our first 400 users, and on [DATE] we're launching on
> Product Hunt. If Resunova ever helped you land an interview (or just made
> your résumé less painful to look at), the single most helpful thing you
> can do takes 30 seconds: upvote + one honest comment on launch morning.
>
> I'll send one reminder with the link when we're live. That's it — no
> spam, ever.
>
> Since you last visited we also shipped: a live job feed (160k+ US
> postings ranked against your résumé, with salary + H-1B data), one-click
> Boost to tailor your résumé toward any posting, and interview prep
> generated from your own bullets.

**B · Launch morning (~9 AM ET)** — subject: `We're live 🎉 (30 seconds, huge help)`

> We're live on Product Hunt: [LINK]
>
> An upvote helps; an honest comment about how you used Resunova helps
> 10× more. Thank you — genuinely. — Parth

---

## 5 · Reddit posts (launch day)

⚠️ Read each sub's self-promo rules the week before. r/EngineeringResumes
and r/resumes ban tool promotion — do NOT link-drop there; participate by
giving real advice and mention the tool only if someone asks what you use.

**r/SideProject** — title:
`I got tired of AI resume checkers lying to me, so I built one that audits its own feedback`

> Every AI resume tool I tried invented problems to look useful — "add
> metrics" on a résumé with nine quantified bullets, "improved" rewrites
> identical to the original.
>
> So I built Resunova around an honesty pipeline: validators re-check every
> AI claim against the actual résumé text and delete what doesn't hold up.
> No-op rewrites never surface. Rewrites that drop your numbers get
> rejected. If the AI gets caught exaggerating twice, its overall score is
> discarded and recomputed from evidence.
>
> It's free, no account needed: 8-dimension score, bullet rewrites,
> tailored PDF, plus a job feed of 160k+ live US postings ranked against
> your résumé.
>
> Stack, for the curious: Next.js + Starlette, vision-model PDF extraction,
> Chromium WYSIWYG PDF export, deterministic job matching so the feed costs
> $0 per request. Happy to answer anything — including "the AI still lied
> to me about X," which I'll treat as a bug report.
>
> [link] — also launching on Product Hunt today: [PH link]

**r/jobsearchhacks** — title:
`Free tool: scores your resume across 8 dimensions and deletes dishonest AI feedback (no signup)`

> Made a free resume scorer with a difference: it validates the AI's own
> feedback against your résumé before showing it to you, so you don't get
> the usual "add metrics!!" on a résumé full of metrics.
>
> Upload a PDF → 8-dimension score with explanations → rewrites for weak
> bullets that never invent numbers ([X%] placeholders instead) → tailored
> PDF download. There's also a job feed (160k+ live US postings, updated
> daily) ranked against your résumé, with salary data and H-1B sponsor
> flags.
>
> No account needed to scan. Would love feedback on what's missing.

---

## 6 · X / LinkedIn (launch morning)

**X:**
> AI resume checkers lie. "Add metrics" — there are nine. "Improved
> rewrite" — it's identical.
>
> So I built one that audits its own feedback: validators check every AI
> claim against your actual résumé and delete the lies.
>
> Free, no account. Live on @ProductHunt today → [link]

**LinkedIn:** same story, one extra paragraph on who it's for (students +
early-career; free for the community) and the jobs feed. Tag nothing, ask
for nothing except honest feedback — LinkedIn punishes engagement-bait.

---

## 7 · Launch-day runbook (Tuesday or Wednesday)

| Time (ET) | Action |
|---|---|
| 3:01 AM (12:01 PT) | Listing goes live; post maker comment immediately |
| 3:05 AM | Verify gallery order, thumbnail, links; share PH link in any founder/community Slack or Discord you're in |
| 8:00 AM | X + LinkedIn posts |
| 9:00 AM | Launch email to early users (their morning = US East peak) |
| 9:30 AM | r/SideProject + r/jobsearchhacks posts |
| All day | Reply to every PH comment within ~15 min; screenshot-worthy replies > thanks-replies |
| ~2:00 PM | Midday nudge: reply-thread on your own X post with a result/stat from the morning |
| Evening | Thank-you comment on the PH thread with anything you shipped/fixed during the day (PH loves live fixes) |
| Day after | Add the PH badge to the landing page; email non-openers once; write the "what we learned" post |

**Prod checklist before launch day:**
- [ ] Merge PR #98 and deploy so the nova mark + new OG image are live
- [ ] Record the 30–60s demo video
- [ ] Anonymous scan path load-checked (Railway warm, scan limits in place)
- [ ] PH "Coming Soon" page up ≥2 weeks before, teaser copy above
- [ ] Claims re-verified: live-postings count, boards count, user count
