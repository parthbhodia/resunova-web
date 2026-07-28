# Resunova retention email sequence (DRAFTS, not sent)

Status: drafts for human review. Nothing here is scheduled or sent. Sending
happens later via Resend after a human approves copy and wiring.

Audience: users who signed up via Google OAuth and completed at least one
résumé scan. All merge data exists for every recipient by definition (a scan
row exists), so no email in this sequence needs a fallback for "never scanned."

Style rules applied (marketing-assets skill): no em dashes or en dashes
anywhere, hyphens inside compound words only, honest numbers only. The single
corpus figure used is 247,000 live US postings (live-verified). Per-user
numbers are merge variables computed at send time, never hardcoded.

---

## Sending cadence

| # | Email | Trigger | Timing | Type |
|---|-------|---------|--------|------|
| 1 | Welcome + top fix | First completed scan | Day 0, within 1 hour of scan | Transactional (Emails API) |
| 2 | One fix waiting | Scan completed, top fix not applied | Day 2 | Lifecycle (Emails API, scheduled) |
| 3 | Jobs feed intro | Day 7 after first scan | Day 7 | Lifecycle |
| 4 | Interview prep intro | Day 14 after first scan | Day 14 | Lifecycle |
| 5 | Score getting stale | No login in 30 days | Day 30 of inactivity | Re-engagement |
| 6 | Weekly digest | Recurring, active subscribers | Weekly, Tuesday morning recipient-local or 10:00 ET | Recurring digest |
| 7 | Win-back | No login in 60 days | Day 60 of inactivity | Re-engagement, founder-voiced |

Suppression logic (implement before sending anything):
- Emails 2 through 6 suppress if the user unsubscribed or the account is deleted.
- Email 2 suppresses if the top fix was already applied (check `lineOverrides` / rescore activity on the latest analysis).
- Email 5 and 7 suppress each other's audience: a user who re-engages after email 5 exits the inactivity track.
- Email 6 pauses automatically for anyone who enters the 30-day inactivity segment (do not stack digest + re-engagement).
- Email 7 "pause my emails" click sets a suppression flag that stops everything except transactional receipts.

---

## Merge variables and where the backend gets each one

| Variable | Source |
|----------|--------|
| `{{first_name}}` | Supabase auth user metadata from Google OAuth (`user_metadata.full_name`, first token). Fallback: omit the greeting name, never "Hey there {{first_name}}". |
| `{{resume_score}}` | `resume_analyses.result->overallScore` from the user's latest analysis row. |
| `{{top_issue}}` | First entry of `resume_analyses.result->topIssues` (title text) from the latest analysis. Deterministic topIssues (`source: "deterministic"`) are excluded, matching the app UI. |
| `{{top_issue_category}}` | The `primaryCategory` bucket of that issue (one of the 8 category keys), humanized (e.g. "quantification" renders as "measurable results"). |
| `{{match_count}}` | Count from the ranked jobs feed for this user: active US postings in the user's `role_family` with a deterministic `_feed_match_score` above the display threshold. Zero LLM cost, computed by a batch job reusing `routes/jobs.py` count logic. |
| `{{target_role}}` | The user's role family label, from `classify_role_family` on their latest analysis (or their jobs onboarding wizard pick in `rn_jobs_browse_v1`, synced server-side, if present). |
| `{{new_jobs_count}}` | Count of `job_postings` rows in the user's role family with `posted_at` after the user's last login timestamp (`auth.users.last_sign_in_at`), `is_active = true`, US scope. |
| `{{job_N_title}}`, `{{job_N_company}}`, `{{job_N_score}}` (N = 1..5) | Top 5 rows of the user's ranked feed at digest build time: deterministic `_feed_match_score` of the latest saved résumé against cached `requirement_concepts`. Scores are the same numbers the in-app feed shows. |
| `{{weeks_since_scan}}` | Whole weeks between now and the latest `resume_analyses.created_at`. |
| `{{unsubscribe_url}}` | Resend-generated unsubscribe link (see Resend notes). |
| `{{physical_address}}` | Company mailing address constant, required by CAN-SPAM. Must be filled in before any send. |

Rule: if a merge value cannot be computed for a recipient, the batch job drops
that recipient from that send. No email ships with a blank or placeholder
value.

---

## Resend notes

- **Transactional vs broadcast.** Email 1 is transactional (triggered by the
  scan event, send via the Emails API from the backend). Emails 2 through 5
  and 7 are lifecycle sends with per-user merge data and per-user timing, so
  they also go through the Emails API from a daily batch job, not Broadcasts
  (Broadcasts fit one-blast-to-audience, not per-user day offsets). Email 6
  (weekly digest) could be a Broadcast if we accepted identical content, but
  the per-user job list means it is also an Emails API batch (Resend batch
  endpoint, up to 100 per call).
- **Audiences.** Maintain one Resend Audience ("Product emails") mirroring
  opted-in scanned users, mainly so Resend tracks unsubscribes centrally.
  Sync unsubscribes back to our DB (webhook `contact.updated` /
  `email.complained`) and treat our DB flag as the source of truth for the
  batch jobs.
- **Unsubscribe headers.** Everything except email 1 is marketing under
  CAN-SPAM. Set `List-Unsubscribe` (https URL) and
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers on every
  lifecycle/digest send so Gmail and Yahoo render one-click unsubscribe.
  Resend supports custom headers on the Emails API; use the Resend
  unsubscribe URL or our own endpoint that flips the suppression flag.
- **Domain.** Send from a subdomain (e.g. `mail.resunova.io`) with SPF, DKIM,
  and DMARC verified in Resend before any volume. From name: "Parth from
  Resunova" for emails 1, 5, 7; "Resunova" for 2, 3, 4, 6.
- **Complaint handling.** Wire the `email.bounced` and `email.complained`
  webhooks to the suppression flag on day one.

---

## Email 1: Day 0 welcome

**Subject A:** Your résumé scored {{resume_score}}. Here is the one fix to start with
**Subject B:** Your scan results, plus the fastest fix on the list

**Preview text:** Your full report is saved. One change matters more than the rest.

**Body:**

Hi {{first_name}},

Thanks for running your résumé through Resunova. Your report is saved to your account, so nothing you saw is lost.

Quick recap of what the scan gave you:

- An overall score of {{resume_score}}, built from 8 categories (things like measurable results, ATS compatibility, and language quality)
- Bullet-by-bullet fixes, each with a suggested rewrite you can apply in one click
- A validation layer that rejects fabricated feedback. If the scanner flags a bullet for missing numbers, it is because the numbers are actually missing, not because a template said so.

If you do one thing this week, do this: open your report and apply the top fix. It is the issue with the biggest effect on your score, and applying the suggested rewrite takes under a minute. Then hit "Update score" to see the new number.

Small honest edits beat a full rewrite. Start with one.

**CTA:** Apply your top fix → https://resunova.io/?view=analyze

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 2: Day 2 nudge

**Subject A:** One fix is still waiting on your résumé
**Subject B:** Your scan flagged this: {{top_issue_category}}

**Preview text:** {{top_issue}}

**Body:**

Hi {{first_name}},

Two days ago your scan flagged this as the top issue on your résumé:

"{{top_issue}}"

It is still sitting unapplied in your report.

Why this one matters more than the rest: the scanner ranks issues by how much they drag your overall score, and this one is at the top of that list. It falls under {{top_issue_category}}, which recruiters and ATS parsers both weigh heavily.

You do not have to figure out the fix yourself. Your report already contains a suggested rewrite next to each flagged bullet. Applying it is one click, and you can edit the text inline before you commit. If the suggestion adds a placeholder like [X%], swap in your real number. The scanner will never invent one for you, and neither should your résumé.

After you apply it, hit "Update score" and the new score is saved as your latest résumé, which is also what the jobs feed ranks against.

One fix, about a minute, honest improvement.

**CTA:** Open your report and apply it → https://resunova.io/?view=analyze

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 3: Day 7 jobs feed intro

**Subject A:** {{match_count}} live jobs currently match your résumé
**Subject B:** Your résumé, ranked against 247,000 live US postings

**Preview text:** Fresh postings from company career sites, scored against your actual résumé.

**Body:**

Hi {{first_name}},

Since you scanned your résumé, we have been able to do something with it beyond scoring: rank real openings against it.

Right now, {{match_count}} live jobs match your résumé.

How the feed works:

- We pull postings daily from company career sites (Greenhouse, Workday, Lever, Amazon, and many more), 247,000 live US postings in total.
- Each posting's requirements are extracted once, then matched against your résumé with a deterministic scorer. Same résumé plus same posting always equals the same score. No black box.
- Postings carry H-1B sponsor data where available, so if sponsorship matters to you, you can filter for employers with a real filing history.
- When you find one worth applying to, the built-in tracker keeps your pipeline in one place: saved, applied, interviewing, offer.

The feed reranks whenever you improve your résumé, so the fix work you did this week already changed what surfaces at the top.

**CTA:** See your matches → https://resunova.io/?view=jobs

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 4: Day 14 interview prep intro

**Subject A:** Interview questions built from your résumé, not a generic list
**Subject B:** Practice for {{target_role}} interviews with your own material

**Preview text:** Questions from your résumé and target job, with STAR answer drafts.

**Body:**

Hi {{first_name}},

Most interview prep lists are generic: the same 50 questions for everyone. Yours should not be, because the interviewer has your résumé in front of them.

Resunova's interview prep reads your résumé and your target job, then generates:

- Questions an interviewer would actually ask about your specific experience ("Walk me through the migration you led at...")
- Behavioral questions with STAR answer drafts built from your own bullets, so you practice with real stories instead of inventing them under pressure
- Role-aware technical rounds. This part is deliberate: software engineers get data structures and algorithms questions, analysts get SQL only, and business, nursing, and similar roles get no coding section at all. If you are prepping for {{target_role}}, you only see what that interview will actually contain.

Even if you do not have an interview scheduled yet, running one prep session now means your story bank is ready when the first call comes. Scrambling the night before is optional.

**CTA:** Start a practice session → https://resunova.io/interview-prep/

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 5: Day 30 re-engagement

**Subject A:** Your résumé score is {{weeks_since_scan}} weeks old
**Subject B:** {{new_jobs_count}} new {{target_role}} postings since your last visit

**Preview text:** The market moved. Your résumé has not.

**Body:**

Hi {{first_name}},

Your last résumé scan was {{weeks_since_scan}} weeks ago. Since your last visit, {{new_jobs_count}} new {{target_role}} postings have gone live in the feed, and your résumé has not changed to meet any of them.

That matters more than it sounds. Job postings shift their required skills faster than most people update their résumés, and a score from a month ago reflects a market from a month ago.

Two things worth ten minutes:

1. Rescan your résumé. If you edited it anywhere else (a new project, a promotion, a certification), the scan will pick it up, rescore all 8 categories, and rerank your job matches against the current corpus.
2. Skim your top matches. The feed pulls from 247,000 live US postings daily, so the top of your list today is not the top of your list from last month.

If you already landed somewhere, congratulations, genuinely. Reply and tell me where, and I will stop nudging you.

**CTA:** Rescan and see what changed → https://resunova.io/?view=analyze

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 6: Weekly digest (recurring template)

**Subject A:** Your week: 5 matches, résumé at {{resume_score}}
**Subject B:** Weekly report: top match {{job_1_score}} ({{job_1_company}})

**Preview text:** Top 5 matches, your current score, one improvement tip.

**Body:**

Hi {{first_name}},

Your weekly report from Resunova.

Top matches this week (scored against your saved résumé):

1. {{job_1_title}} at {{job_1_company}}: {{job_1_score}} match
2. {{job_2_title}} at {{job_2_company}}: {{job_2_score}} match
3. {{job_3_title}} at {{job_3_company}}: {{job_3_score}} match
4. {{job_4_title}} at {{job_4_company}}: {{job_4_score}} match
5. {{job_5_title}} at {{job_5_company}}: {{job_5_score}} match

Your résumé score: {{resume_score}}

One tip this week: your top open issue is still "{{top_issue}}". Fixing it raises your score and can flip some near-miss postings into matches, since the feed reranks whenever your saved résumé changes.

Scores here are the same deterministic numbers you see in the app: your résumé matched against each posting's extracted requirements. No estimates, no inflation for the email.

**CTA:** Open your full feed → https://resunova.io/?view=jobs

Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}

---

## Email 7: Day 60 win-back

**Subject A:** Did you land somewhere?
**Subject B:** Quick question before I stop emailing you

**Preview text:** One question, one click, and I will leave you alone either way.

**Body:**

Hi {{first_name}},

Parth here, founder of Resunova. You scanned your résumé with us about two months ago and have not been back, which usually means one of two things.

Either you landed a job (in which case, congratulations, that is the whole point), or the tool did not earn a second visit, and I would honestly like to know which.

So, one question: did you land somewhere?

If yes: hit pause below and these emails stop. If you have 30 seconds, reply and tell me where you ended up. I read every reply.

If you are still searching: your account is exactly as you left it. Your last scan, your report, and a jobs feed that has kept refreshing daily while you were away. Rescanning takes about a minute.

Either way, thanks for trying the thing I built.

**CTA:** Still searching? Pick up where you left off → https://resunova.io/?view=analyze

Landed? Pause my emails with one click: {{unsubscribe_url}}

Parth
Founder, Resunova

{{unsubscribe_url}} | Resunova, {{physical_address}}
