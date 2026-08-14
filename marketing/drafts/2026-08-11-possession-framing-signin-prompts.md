# Possession framing for the sign-in prompts

Status: DRAFT for human review. These strings live in product components, so
nothing here is applied. Applies principle 06 from
`marketing/PSYCHOLOGY_PLAYBOOK.md`.

## The rule

**Name what they already have, not what we offer.** Sign-in reads as a toll
when the copy leads with the system's requirement ("create a free account",
"this page needs") and as protection when it leads with the user's own
artefact ("your report is saved here").

## The test that decides whether it applies

**Does the user own something at this exact moment?** Verified per surface:

| Surface | Held before sign-in | Where |
|---|---|---|
| Analyze | the finished report | `ANON_ANALYSIS_STASH_KEY` |
| Analyze edits | line overrides, rewrite drafts | `rn_az_edit_v1_*` |
| Builder | the working session | `SS_KEY` |
| Jobs, Interview, Tracker | nothing | no local stash |

If the answer is no, **this technique does not apply** and reaching for it
produces a false claim. That failure is already live in the codebase, see the
last row of the table below.

---

## Proposed rewrites

| Site | Current | Proposed |
|---|---|---|
| `AnalyzeResume.tsx:301` | Sign in to rescore and keep your report history. | Your report is saved on this device only. Sign in to keep it anywhere. |
| `AnalyzeResume.tsx:382` | Sign in free for more résumé scans and saved reports. | Your report is saved on this device. Sign in to keep it, and scan again. |
| `AnalyzeResume.tsx:835` | Sign in free to edit your résumé here and watch your score improve. | Your report is saved here. Sign in to edit it and keep the changes. |
| `ResumeBuilder.tsx:1229` | Sign in free to score your résumé against the job and unlock per-bullet fixes. | Your draft is saved on this device. Sign in to score it against the job and keep the fixes. |
| `AuthGate.tsx` body | This page needs a free account so your work is saved to it. | A free account keeps your work, so it is here when you come back. |

**Why "on this device only" is the strongest of these.** It is literally true
(localStorage), and it names a real limitation rather than a benefit. The user
learns they hold something *and* that it is fragile, in five words. Loss
aversion and endowment in the same sentence, with nothing invented.

**Why AuthGate changes least.** It is the generic gate and fires for visitors
who may hold nothing, so it cannot claim possession. The fix is smaller: stop
centering the page's requirement ("this page needs") and center the user's
work. No possession claimed, no falsehood risk.

---

## Do not convert

| Site | Why |
|---|---|
| `JobsFeed.tsx:1005`, `:1028` | Nothing is held locally. These are genuinely "start something" moments, so the honest lever is information gap or reciprocity, not endowment. |
| `AdvisorDashboard.tsx:1254` | Institutional roster access. Different job entirely. |
| `JobDetail.tsx` | Public SEO pages, visitor holds nothing. |

## One live misuse, worth fixing

`ApplicationTracker.tsx:700` currently reads:

> Your application tracker is saved to your account, sign in to get started.

It claims possession ("your application tracker") of something a signed-out
visitor does not have, which is exactly the failure mode the playbook guardrail
names. It also carries an em dash in the original, in copy a user reads.

Proposed:

> Track every application in one place. Sign in free to start yours.

No false possession, and the dash goes.

---

## Sequencing note

These are worth shipping as one batch rather than piecemeal. The prompts are
read as a set by anyone who hits two of them in a session, and a mix of
possession framing and toll framing reads as inconsistent rather than as an
improvement.
