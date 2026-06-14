-- Migration 020: company_domain on job_postings for logo resolution
-- ATS APIs don't return the company's marketing domain, so we derive a best-
-- guess domain from the company name at scan time ({normalized-name}.com) and
-- store it. The frontend resolves a logo from it (logo service), falling back
-- to a slug-based guess, then a monogram. Stored (not computed client-side) so
-- a future real-domain source can backfill this one column.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists company_domain text;

-- Backfill existing rows from the company name (same normalization the scan
-- uses going forward): lowercase, strip non-alphanumerics, append .com.
update public.job_postings
set company_domain = lower(regexp_replace(company, '[^a-zA-Z0-9]', '', 'g')) || '.com'
where company_domain is null and company is not null and company <> '';
