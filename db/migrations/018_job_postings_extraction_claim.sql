-- Migration 018: claim-based parallel extraction for job_postings
-- The extraction sweep was single-flighted (one worker) to avoid two workers
-- grabbing the same `requirement_concepts IS NULL` rows and paying for the same
-- LLM call twice. This replaces that lock with a claim/lease: workers claim
-- disjoint batches via FOR UPDATE SKIP LOCKED, so N parallel workers (or cron
-- invocations) extract with zero overlap. Stale claims (dead worker) re-claim
-- after stale_minutes. This is the unlock for draining a 100k+ backlog in days.
-- Run in Supabase SQL Editor → New query

alter table public.job_postings
  add column if not exists extraction_claimed_at timestamptz;

-- Partial index for the claim scan: only unextracted rows are ever claimed.
create index if not exists job_postings_extract_claim_idx
  on public.job_postings (extraction_claimed_at, posted_at desc)
  where requirement_concepts is null and jd_text is not null;

-- Atomically claim up to batch_size unextracted postings. Concurrent callers
-- skip each other's locked rows (SKIP LOCKED) and get disjoint batches.
create or replace function public.claim_extraction_batch(
  batch_size int,
  stale_minutes int default 30,
  max_age_days int default 0
)
returns table (id uuid, jd_text text)
language sql
as $$
  update public.job_postings p
  set extraction_claimed_at = now()
  from (
    select jp.id
    from public.job_postings jp
    where jp.requirement_concepts is null
      and jp.jd_text is not null
      and (jp.extraction_claimed_at is null
           or jp.extraction_claimed_at < now() - make_interval(mins => stale_minutes))
      and (max_age_days = 0
           or jp.posted_at >= now() - make_interval(days => max_age_days))
    order by jp.posted_at desc nulls last
    limit batch_size
    for update skip locked
  ) sub
  where p.id = sub.id
  returning p.id, p.jd_text;
$$;
