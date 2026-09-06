/**
 * Decide whether a freshly fetched jobs payload may replace the published one.
 *
 * WHY THIS EXISTS. Every job in this snapshot becomes a static page —
 * app/jobs/[id] generates its routes from it with `dynamicParams = false` — and
 * every one of those URLs is listed in the sitemap. So a snapshot that shrinks
 * does not merely show fewer jobs: it DELETES pages Google has indexed, and
 * each deleted URL starts serving the 404 page to whoever arrives from search.
 *
 * And shrinking is the EXPECTED failure here, not an exotic one. The endpoint
 * returns postings inside a rolling 30-day window, so whenever the discovery
 * pipeline stops, the corpus behind it drains toward zero on a timer. A build
 * that ran during that drain would quietly retire a thousand indexed pages and
 * report success.
 *
 * The rule is therefore: stale beats deleted. A snapshot that cannot be
 * refreshed keeps serving the pages it already published, loudly, until someone
 * fixes the upstream.
 */

/** Never publish a set this small — below it, something upstream is wrong. */
export const MIN_JOBS = 200;

/**
 * Largest share of the published set a single refresh may retire. Jobs do
 * genuinely expire, so some churn is correct; losing half of them in one
 * refresh is an upstream failure, not a hiring cycle.
 */
export const MAX_SHRINK_RATIO = 0.5;

/** A row is publishable only if it can render a page AND link out. */
export function usableJobs(payloadJobs) {
  if (!Array.isArray(payloadJobs)) return [];
  return payloadJobs.filter(
    (job) => job?.id && job?.title && job?.company && job?.description && job?.url,
  );
}

/**
 * @returns {{accept: boolean, reason: string}} — `reason` is always populated so
 * the caller can log why a build kept the old snapshot. A refusal that cannot
 * explain itself trains readers to ignore it.
 */
export function decideSnapshot({ incomingCount, previousCount, force = false }) {
  if (incomingCount === 0) {
    return { accept: false, reason: "endpoint returned no usable jobs" };
  }
  // A deliberate reset (e.g. the corpus legitimately shrank and someone checked).
  if (force) {
    return { accept: true, reason: `forced (${incomingCount} jobs)` };
  }
  // Nothing published yet — anything beats an empty site.
  if (previousCount === 0) {
    return { accept: true, reason: `first snapshot (${incomingCount} jobs)` };
  }
  if (incomingCount < MIN_JOBS) {
    return {
      accept: false,
      reason: `only ${incomingCount} jobs returned, below the floor of ${MIN_JOBS} — keeping ${previousCount} published pages`,
    };
  }
  if (incomingCount < previousCount * MAX_SHRINK_RATIO) {
    return {
      accept: false,
      reason: `${incomingCount} jobs would retire more than half of the ${previousCount} published pages — keeping the current snapshot`,
    };
  }
  return { accept: true, reason: `${incomingCount} jobs (was ${previousCount})` };
}
