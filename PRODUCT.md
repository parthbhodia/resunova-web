# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: students and early-career switchers applying to US jobs, many of them
international students (UMBC is a live design partner, and the sponsorship /
work-authorization questions are load-bearing for that group, not boilerplate).

They arrive mid-application-cycle with a résumé already written, usually a PDF
they have been reusing. The job is not "write me a résumé" — it is "tell me
whether this one is good enough, and make it fit this posting."

Measured behaviour that shapes every decision here: of 67 people who have ever
scanned, **38 scanned once and never returned**. Activation, not depth, is the
weak link.

## Product Purpose

Score a résumé honestly, then tailor it to a specific job posting without
inventing anything the candidate cannot back up. Success is a user who applies
to a real posting with a résumé measurably better matched than the one they
walked in with.

## Positioning

The honesty layer is the mechanism a neighbouring product cannot truthfully
copy. Scores and rewrites pass through server-side validators that drop
no-op rewrites, strip claims the résumé contradicts, refuse gaps the candidate
has no evidence for, and badge added numerals the candidate never supplied.
The product's claim is not "AI improves your résumé" but "we will not let the
AI lie on your behalf."

## Operating Context

Two main flows, both starting from a PDF upload:

- **Analyze** — upload → vision extraction → comprehensive score across 8
  dimensions → per-bullet rewrites → WYSIWYG PDF download.
- **Tailor** — paste a job description → deterministic requirement matching +
  an LLM rating → a prioritized work queue of gaps → per-bullet fixes.

Around them: a Jobs feed ranked against the saved résumé, Interview Prep,
Cover Letter, and Template Builder. Free tier is 3 scans/day; Pro is $19/mo.

The Career Profile sits beside these, and today duplicates the résumé rather
than complementing it.

## Capabilities and Constraints

- Next.js static export (`output: "export"`) on GitHub Pages. No server
  components for data; everything user-specific is client-fetched.
- Supabase with owner-only RLS; the Python API holds the service role.
- `/profile` is in AuthGate's PUBLIC_ROUTES — it is reachable signed out and
  must degrade rather than blank.
- Theming is `[data-theme]`-attribute driven, not Tailwind's `dark:` class
  convention. Raw Tailwind color utilities silently never adapt.
- An eslint ratchet (baseline 217) fails CI on newly added lint errors.
- `lib/__tests__/uiCopyStyle.test.ts` bans spaced em dashes in user-visible
  copy; separators must be `·`.

### Career Profile — confirmed scope (user, this session)

- **The page's job:** hold what a résumé cannot — target roles and locations
  (which drive Jobs ranking and Tailor defaults), and the work-authorization /
  EEO answers every application portal asks for. The career record is seeded
  from a scan, never typed from scratch.
- **The primary user is first-time, filling it in.** Optimize for getting from
  empty to useful with the least typing. Maintenance is the secondary case.
- **`tagline`, `degree`, `graduation`, `gpa` get wired up, not deleted.** They
  currently have no runtime reader. Confirmed consumers exist to connect them
  to: `tagline` → ResumeBuilder's headline override (already sent to the rating
  LLM); `gpa` → `TBEducation.gpa` (field already exists in Template Builder);
  `degree` + `graduation` → the jobs feed's `experience` bucket, which is
  NULL-inclusive and keyed on years. This is backend-touching scope.

## Brand Commitments

- Name: Resunova (resunova.io). A UMBC-branded variant swaps the logo mark and
  wordmark for @umbc.edu users; institution branding must survive any redesign.
- Voice: plain, specific, no AI narration. Copy states consequences rather than
  states ("showing every US metro", not "not set").
- Existing token system in `app/globals.css` is the incumbent visual authority:
  accent `#0969da` light / `#58a6ff` dark, grounds `#f7f9fc` / `#0d1117`.

## Evidence on Hand

- Real usage counts from `usage_events` and the artifact tables (92 users, 225
  scans, 179 tailored résumés lifetime; scans May 117 → Jun 74 → Jul 34).
- A consumer audit of every `user_profiles` field, recorded in the api repo's
  CLAUDE.md, establishing which Profile fields have runtime readers.

## Open Decisions

- Completeness weighting: any readiness score must be weighted by what each
  field unlocks, and the weights measured against the ranking code rather than
  assigned by feel. Not yet measured.
