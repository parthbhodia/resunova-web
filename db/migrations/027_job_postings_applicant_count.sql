-- Migration 027: applicant_count — how many of OUR users applied to a posting.
-- First-party metric derived from job_applications (one row per user+posting;
-- applied_at set once a user reaches applied/interviewing/offer). The count is
-- maintained on every application write (create/upsert/patch/delete + the
-- apply_click feed event) by applications._recompute_applicant_count, and read
-- directly by the jobs feed/detail. UI bands it: <25 (incl. null/0) →
-- "Less than 25 applicants", >=25 → the exact number.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings add column if not exists applicant_count int;

-- One-time backfill from existing applications (the write-path keeps it fresh after).
update public.job_postings p set applicant_count = sub.n
from (
  select posting_id, count(*) n from public.job_applications
  where posting_id is not null and applied_at is not null
  group by posting_id
) sub
where p.id = sub.posting_id;
