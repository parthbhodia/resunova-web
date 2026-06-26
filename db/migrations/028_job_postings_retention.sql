-- Migration 028: job_postings retention + IO-relief index assertion
--
-- WHY THIS EXISTS
-- The jobs/staging Supabase project (`uvnncrtulyezsylcxnhw`, a Nano compute
-- instance, 43 Mbps baseline disk IO) had its Disk IO budget pinned at 100%
-- every day. That same project hosts auth (GoTrue) for staging + local, so when
-- the disk is saturated the `auth.flow_state` INSERT during Google sign-in times
-- out and GoTrue returns `500 Error creating flow state`. Prod is a separate
-- project and is unaffected.
--
-- Two IO drivers, both addressed here:
--   1. The recent-feed query (`WHERE is_active AND requirement_concepts IS NOT
--      NULL ORDER BY posted_at DESC NULLS LAST LIMIT N`) full-sorts ~200k rows
--      unless the matching partial index from migration 027 is present. We
--      re-assert it idempotently in case 027 was never applied to this project
--      (the jobs-feed changelog only confirms 012–020 were applied to staging).
--   2. `job_postings` has grown to ~200k rows with no retention. Inactive
--      postings (deactivated by the scan when a board drops them) are dead
--      weight: they bloat the table, every scan/sort reads them, and the TOASTed
--      `jd_text` dominates on-disk size. Deleting them shrinks the working set
--      and cuts IO per scan and per feed sort.
--
-- SAFE TO DELETE — foreign keys preserve user-owned data:
--   * job_applications.posting_id  → ON DELETE SET NULL (company/title/url are
--     denormalized on the tracker row, so the application survives)
--   * referral_contacts.posting_id → ON DELETE SET NULL (company denormalized)
--   * job_post_events.posting_id   → ON DELETE CASCADE (analytics events only)
--
-- HOW TO RUN: open the jobs/staging Supabase project → SQL Editor → run each
-- numbered block separately. Block 1 (CREATE INDEX CONCURRENTLY) must NOT be
-- wrapped in a transaction (the SQL Editor runs it bare, which is correct).

------------------------------------------------------------------------------
-- 1) IO-relief index (idempotent; no-op if migration 027 is already applied).
--    A DESC btree defaults to NULLS FIRST, which does NOT match the feed's
--    NULLS LAST order, so the 012 index (is_active, posted_at desc) can't serve
--    it and Postgres sorts the whole active set. This partial index matches the
--    feed query exactly → index scan, no sort.
------------------------------------------------------------------------------
create index concurrently if not exists job_postings_browse_recent_idx
  on public.job_postings (posted_at desc nulls last)
  where is_active and requirement_concepts is not null;

------------------------------------------------------------------------------
-- 2) Sanity check BEFORE deleting — see how many rows the retention rule drops.
--    Run this on its own first; if the number looks wrong, adjust the window in
--    block 3 instead of deleting.
------------------------------------------------------------------------------
-- select count(*) as will_delete,
--        pg_size_pretty(pg_total_relation_size('public.job_postings')) as table_size
-- from public.job_postings
-- where is_active = false
--   and last_seen_at < now() - interval '30 days';

------------------------------------------------------------------------------
-- 3) Retention delete: stale inactive postings (the scan already marked these
--    is_active = false and hasn't re-seen them in 30 days → gone from the board).
--    >>> TUNE THE WINDOW: change '30 days' to '60 days' / '90 days' to be more
--    conservative. <<<
------------------------------------------------------------------------------
delete from public.job_postings
where is_active = false
  and last_seen_at < now() - interval '30 days';

------------------------------------------------------------------------------
-- 4) OPTIONAL, more aggressive — also drop *active* postings that are very old
--    (boards that never delisted them). Commented out by default because it
--    removes rows from the live feed. Uncomment + tune only if you want it.
------------------------------------------------------------------------------
-- delete from public.job_postings
-- where posted_at is not null
--   and posted_at < now() - interval '180 days';

------------------------------------------------------------------------------
-- 5) Reclaim space for reuse + refresh planner stats so it picks the new index.
--    Run separately (VACUUM cannot run inside a transaction). Plain VACUUM frees
--    rows to the table freelist (reused by future inserts) — enough to stop the
--    bloat from growing. Only run `vacuum full` if you need disk returned to the
--    OS, and run it off-hours: it takes an EXCLUSIVE lock and will block the
--    extraction worker's writes.
------------------------------------------------------------------------------
-- vacuum (analyze) public.job_postings;
-- vacuum full public.job_postings;   -- disk-reclaim only; off-hours; locks table
