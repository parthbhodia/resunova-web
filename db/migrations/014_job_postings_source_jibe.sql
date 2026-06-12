-- Migration 014: allow 'jibe' as a job_postings source
-- Jibe (acquired by iCIMS) powers enterprise career portals at
-- careers.<company>.com with a public JSON API at /api/jobs.
-- First seed: Paychex (careers.paychex.com).
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  drop constraint if exists job_postings_source_check;

alter table public.job_postings
  add constraint job_postings_source_check
  check (source in ('greenhouse', 'ashby', 'lever', 'jibe'));
