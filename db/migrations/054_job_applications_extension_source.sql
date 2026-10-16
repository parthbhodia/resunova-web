-- Migration 054: job_applications gains the 'extension' source
--
-- The Chrome extension autofills forms but never submits them. When the user
-- fills a form we record the job so it shows up in the Application Tracker
-- dashboard tab alongside everything else they are tracking.
--
-- Deliberate: recording happens on FILL, not on submit. The extension cannot
-- reliably observe submission (each ATS confirms differently), and writing
-- status='applied' on a fill would put a fact in the dashboard that is not
-- true. A fill lands as 'saved'; the user promotes it to 'applied' when they
-- actually submit, either from the tracker or the extension panel.
--
-- Always on, no opt-in toggle. Disclosed in the privacy policy. This DOES
-- remove the previous property that Resunova does not record where you apply,
-- and that is now a behavioural record of job-search intent. That was a
-- deliberate product decision, not an oversight.

-- ── allow the new source ────────────────────────────────────────────────────
-- The original constraint was declared inline, so Postgres auto-named it
-- job_applications_source_check.
alter table public.job_applications
  drop constraint if exists job_applications_source_check;

alter table public.job_applications
  add constraint job_applications_source_check
  check (source in ('feed', 'manual', 'extension'));

-- ── stop duplicate rows for off-feed jobs ───────────────────────────────────
-- The existing unique index covers (user_id, posting_id) but only where
-- posting_id is not null. An extension row whose URL did not match a
-- job_postings row has posting_id NULL and is therefore exempt, so repeatedly
-- filling the same off-feed job would insert a new row every time.
--
-- Case-insensitive because ATS URLs differ in host casing between the page and
-- the posting row.
create unique index if not exists job_applications_user_source_url_idx
  on public.job_applications (user_id, lower(url))
  where posting_id is null and source = 'extension';

-- Dashboard queries filter by user and order by recency; extension rows now
-- join that set, so make sure the existing index still serves them.
create index if not exists job_applications_user_source_idx
  on public.job_applications (user_id, source, updated_at desc);
