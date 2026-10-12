/**
 * Build the request the daily refresh sends to `/api/seo/jobs`.
 *
 * WHY THIS EXISTS, AND WHEN TO DELETE IT. The deployed endpoint memoizes its
 * answer in ONE module-level slot keyed on the query params alone —
 * `f"{max_age_days}:{max_postings}"` — with no timestamp and no TTL. This
 * script sent the same two values on every run, so after the first request of a
 * Railway process's life it could never miss: the process returned that one
 * payload for the rest of its life. Measured, not inferred — eighteen minutes
 * after a sweep that retired 86,151 postings and added 3,638, the refresh
 * fetched the endpoint, got back the identical 983 jobs it got the day before,
 * logged "nothing to add", and went green. That is the dangerous shape: the
 * failure is indistinguishable from a healthy steady state.
 *
 * The real fix is server-side (`_CACHE_TTL_SECONDS` in resume_gui/routes/seo.py)
 * and is already merged, but it cannot take effect until Railway deploys, and
 * Railway has not deployed since 2026-08-19. So until then we vary the key
 * ourselves: alternating the window by UTC day guarantees that today's request
 * cannot match whatever key yesterday's request left in that single slot.
 *
 * DELETE THIS whole module (and go back to a constant `max_age_days=30`) once
 * the deployed endpoint carries `_CACHE_TTL_SECONDS`. The check is one command:
 * request the endpoint twice more than 15 minutes apart and compare
 * `generatedAt` — a TTL-carrying build returns a newer one, the current build
 * returns the same string forever.
 */

/** How many postings the published snapshot may carry. Also half the cache key. */
export const SEO_JOBS_MAX_POSTINGS = 1000;

/**
 * The two windows we alternate between, newest-first.
 *
 * WHY 30 AND 31 RATHER THAN 29 AND 30, and this is the load-bearing half: the
 * endpoint orders by `posted_at desc` and takes `limit`, so a WIDER window is a
 * superset that yields the IDENTICAL newest-N whenever the narrower one already
 * holds at least N rows — and it holds ~88x that (88,315 eligible in 30 days,
 * 3,194 in the last 24 hours alone; the whole published set comes from the last
 * eleven hours). Measured against prod: the newest-1000 under 30 days and under
 * 31 days are the same 1000 rows.
 *
 * The margin is enormous today, but it is not a permanent property — if
 * discovery stalls again the corpus drains on a timer. That is exactly why the
 * pair is 30/31: on a drained corpus the wider window ADDS a day of older
 * postings rather than removing one, so alternating can never be the thing that
 * retires a page `jobsSnapshotPolicy` exists to protect. Picking 29 would make
 * alternate days publish a strictly smaller set.
 *
 * Both values must stay inside the endpoint's own 1..90 clamp, or the server
 * substitutes its default and the alternation silently stops alternating.
 */
export const SEO_JOBS_WINDOW_DAYS = [30, 31];

const MS_PER_DAY = 86_400_000;

/**
 * Which window this run asks for. Keyed on the UTC day so that consecutive
 * daily refreshes differ while every build inside one day agrees — a rebuild
 * hours after the refresh should republish the same set, not thrash it.
 *
 * Epoch days, not the day of the month: `getUTCDate() % 2` repeats across a
 * month boundary (Jan 31 and Feb 1 are both odd), which would hand two
 * consecutive days the same cache key and reinstate the bug for that day.
 */
export function jobsWindowDays(now = new Date()) {
  const epochDay = Math.floor(now.getTime() / MS_PER_DAY);
  return SEO_JOBS_WINDOW_DAYS[epochDay % SEO_JOBS_WINDOW_DAYS.length];
}

/** The full URL the refresh fetches. */
export function seoJobsUrl(apiBase, now = new Date()) {
  const base = String(apiBase).replace(/\/$/, "");
  return `${base}/api/seo/jobs?max_age_days=${jobsWindowDays(now)}&max_postings=${SEO_JOBS_MAX_POSTINGS}`;
}
