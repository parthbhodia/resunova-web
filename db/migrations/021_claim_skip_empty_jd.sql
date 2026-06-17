-- Migration 021: claim_extraction_batch skips empty-jd_text stubs
-- The 018/019 RPC guarded `jd_text is not null`, but an empty string ('') is NOT
-- null. Listing stubs with jd_text='' were therefore claimable yet unextractable
-- (the extractor returns [] for empty input and never persists). Because they sort
-- newest-first, the worker claimed them every cycle, skipped them, and re-claimed
-- after the stale window — extracting 0 while real backlog sat behind them.
-- Require non-empty jd_text in both the RPC and the matching partial index.
-- Run in Supabase SQL Editor → New query

create or replace function public.claim_extraction_batch(
  batch_size int, stale_minutes int default 30, max_age_days int default 0)
returns table (id uuid, jd_text text, title text)
language sql as $$
  update public.job_postings p
  set extraction_claimed_at = now()
  from (
    select jp.id from public.job_postings jp
    where jp.requirement_concepts is null
      and jp.jd_text is not null and jp.jd_text <> ''
      and (jp.extraction_claimed_at is null
           or jp.extraction_claimed_at < now() - make_interval(mins => stale_minutes))
      and (max_age_days = 0 or jp.posted_at >= now() - make_interval(days => max_age_days))
    order by jp.posted_at desc nulls last
    limit batch_size for update skip locked
  ) sub
  where p.id = sub.id
  returning p.id, p.jd_text, p.title;
$$;

drop index if exists job_postings_extract_claim_posted_idx;
create index if not exists job_postings_extract_claim_posted_idx
  on public.job_postings (posted_at desc nulls last)
  where requirement_concepts is null and jd_text is not null and jd_text <> '';
