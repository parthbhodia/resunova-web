-- Migration 022: structured facts extracted from the JD by the local LLM
-- The extraction sweep now pulls salary/work_model/seniority/visa_sponsorship in
-- the SAME call that builds requirement_concepts (no extra LLM cost). These land
-- in first-class columns so the feed can filter/sort on them. Salary lives in
-- *_jd columns kept separate from the ATS-feed salary_min/max (which stay the
-- source of truth) — the UI shows feed salary first, then falls back to *_jd.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists work_model         text,   -- remote | hybrid | onsite
  add column if not exists seniority          text,   -- intern|entry|mid|senior|lead|principal|director|executive
  add column if not exists visa_sponsorship   text,   -- yes | no  (null = unknown/unstated)
  add column if not exists salary_min_jd      numeric,
  add column if not exists salary_max_jd      numeric,
  add column if not exists salary_currency_jd text,
  add column if not exists salary_period_jd   text;   -- year|month|week|day|hour
