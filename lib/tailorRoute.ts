/**
 * Where "tailor a résumé to a job" goes.
 *
 * There were FOURTEEN hardcoded `/?view=builder&flow=tailor` strings across
 * the app. That is not fourteen oversights, it is one structural problem: each
 * call site invented its own URL, so the redesign could ship behind a new
 * route and still be unreachable from twelve of the fourteen ways in. A user
 * reasonably concluded the work had been reverted, because on every path they
 * took it had.
 *
 * Patching the fourteen fixes today and guarantees a fifteenth. One function
 * fixes the class — the same argument as `apiFetch()` for the auth header.
 *
 * ⚠️ A bare `/?view=builder` is NOT a different destination: `HomePageClient`
 * reads `params.get("flow") || "tailor"`, so omitting the flow lands on the
 * tailor workflow anyway. Those links were reaching the classic surface too.
 */

/** The route that mounts the work-queue redesign. */
export const TAILOR_ROUTE = "/tailor-2/";

export interface TailorHrefOptions {
  /**
   * Consume a sessionStorage prefill on arrival (Boost, Analyze, a saved
   * version). The receiving effect strips it from the URL once used.
   */
  intentJob?: boolean;
  /** Pre-load a stored résumé folder. */
  base?: string;
  /** Arrived from Analyze, which changes which résumé the builder starts from. */
  fromAnalyze?: boolean;
}

/**
 * Build a link into the tailor flow.
 *
 * `flow=tailor` is kept explicit even though the route only serves that flow:
 * ResumeBuilder still reads it, and a URL that says what it does survives
 * being pasted into a bug report.
 */
export function tailorHref(opts: TailorHrefOptions = {}): string {
  const sp = new URLSearchParams({ flow: "tailor" });
  if (opts.intentJob) sp.set("intent", "job");
  if (opts.base) sp.set("base", opts.base);
  if (opts.fromAnalyze) sp.set("fromAnalyze", "1");
  return `${TAILOR_ROUTE}?${sp.toString()}`;
}
