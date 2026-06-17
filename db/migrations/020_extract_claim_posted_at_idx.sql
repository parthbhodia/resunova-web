-- Migration 020: faster claim index (fixes claim_extraction_batch timeouts)
-- claim_extraction_batch filters `extraction_claimed_at IS NULL OR < cutoff`,
-- an OR on the leading column of the 018 index (extraction_claimed_at, posted_at).
-- That OR defeats a clean index seek, so on the 200k-row table the claim
-- full-scans all ~90k unextracted rows and sorts them every call — which blows
-- past Supabase's statement_timeout under worker contention (error 57014).
--
-- This partial index leads with posted_at desc. ~99% of unextracted rows have
-- extraction_claimed_at NULL, so the planner scans recent rows in posted_at
-- order, applies the claimed_at OR as a cheap inline filter, and hits LIMIT
-- after ~batch_size rows. Claim goes from full-scan to a short index scan.
-- Run in Supabase SQL Editor → New query
-- NULLS LAST is REQUIRED: the RPC orders by `posted_at desc nulls last`. A plain
-- `posted_at desc` index is NULLS FIRST, which the planner can't use for that
-- ordering, so it falls back to a full disk sort of ~90k rows (8s+, times out).
-- Matching NULLS LAST lets the claim scan the index directly (~2ms).
create index if not exists job_postings_extract_claim_posted_idx
  on public.job_postings (posted_at desc nulls last)
  where requirement_concepts is null and jd_text is not null;
