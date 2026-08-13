-- 043: resumes.folder uniqueness is per-user, not global.
--
-- ⚠️ APPLIED DIRECTLY to prod (eiumlptnsmowvkxucprl) on 2026-08-13. This file
-- is the schema-of-record so a from-scratch build matches prod.
--
-- WHY: `folder` carried a global UNIQUE from the original schema, but the app
-- generates DETERMINISTIC folder names — `tailor_match_{company}_{role}` — so
-- any two users tailoring the same job collided: the second user's
-- select-then-insert (scoped to their user_id by RLS and by the query) saw no
-- row, the insert hit the other user's row on the global unique, and every
-- save for that job returned 409 forever. Retry could never succeed.
--
-- Field case, 2026-08-13: a run with empty company/role produced the
-- degenerate folder `tailor_match_co_role`, which another account had owned
-- since 2026-07-08 — "Couldn't save this match" on every attempt.
--
-- Global uniqueness was never load-bearing: storage paths are user-namespaced
-- (`<user_id>/<folder>.pdf|tex|json`), every api/web read of `resumes` by
-- folder also filters user_id, and share links resolve by their own shortid.
--
-- Pre-checked before applying: 0 duplicate (user_id, folder) pairs,
-- 0 NULL user_id rows, 180 rows total.

alter table public.resumes drop constraint if exists resumes_folder_key;

alter table public.resumes
  add constraint resumes_user_folder_key unique (user_id, folder);
