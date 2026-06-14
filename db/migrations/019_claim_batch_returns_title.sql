-- Migration 019: claim_extraction_batch also returns title
-- role_family classification now weights the job TITLE heavily (the strongest
-- role signal), so the extraction sweep needs the title alongside jd_text to
-- classify by role rather than employer domain. Re-creates the function with
-- title added to the return set (signature otherwise unchanged).
-- Run in Supabase SQL Editor → New query

-- Return-type change requires a drop first (Postgres can't alter OUT params).
drop function if exists public.claim_extraction_batch(int, int, int);
create function public.claim_extraction_batch(
  batch_size int,
  stale_minutes int default 30,
  max_age_days int default 0
)
returns table (id uuid, jd_text text, title text)
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
  returning p.id, p.jd_text, p.title;
$$;
