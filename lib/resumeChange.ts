/**
 * "The résumé the Jobs section ranks against just changed."
 *
 * WHY THIS EXISTS. The server always scores a job against the user's latest
 * saved scan, and its caches are keyed by that scan, so the server was never
 * the stale part. The browser was. The job pane loaded once per posting and
 * kept that payload for as long as it stayed open (plus a 120-second cache
 * keyed by the posting alone), and Optimize kept the result it had built. So
 * after "Update résumé" the feed on the left re-ranked while the pane on the
 * right kept showing, and optimizing from, the previous résumé.
 *
 * Every place that saves a new working résumé calls `notifyResumeChanged()`:
 * the upload in Jobs, Optimize's "Use as my résumé", and a saved scan in
 * Analyze. Everything that shows a résumé-dependent number listens. A new
 * call site that saves a scan and forgets this brings the bug back, which is
 * why the three callers are pinned by a test.
 *
 * Plain module state, not React: the listeners include module-level caches
 * that live outside any component.
 */

import { invalidateJobDetail } from "@/lib/jobsApi";

let epoch = 0;
const listeners = new Set<() => void>();

/** Say the working résumé changed. Clears every cached job detail first. */
export function notifyResumeChanged(): void {
  epoch += 1;
  invalidateJobDetail();
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // One broken listener must not stop the others from refreshing.
    }
  }
}

export function subscribeResumeChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How many times the résumé has changed in this tab. Only equality matters. */
export function resumeEpoch(): number {
  return epoch;
}
