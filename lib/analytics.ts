/**
 * The one place anything in this app talks to GA4.
 *
 * WHY A SEAM AND NOT `window.gtag(...)` AT EACH CALL SITE
 * ------------------------------------------------------
 * Before this file the tree contained exactly one GA call — `gtag('config')`
 * in app/layout.tsx — so every event GA4 reported was one of its own
 * automatic ones (page_view, session_start, first_visit, scroll). Key events
 * read 0 because nothing had ever been declared. The temptation when fixing
 * that is to sprinkle `window.gtag('event', ...)` wherever a button lives,
 * which gives you a typo'd event name that silently never appears in a report
 * and no single place to read what the product actually measures.
 *
 * So: one typed function, one union of event names, and a rule that a new
 * event is a one-line addition here before it is a call site anywhere.
 *
 * ⚠️ ANALYTICS MUST NEVER BREAK A USER FLOW. Every export swallows its own
 * errors. An ad blocker, a privacy extension, a prerender pass with no
 * `window`, a CSP that drops googletagmanager — all of those are normal and
 * none of them may throw inside a résumé scan or a PDF download.
 */

/**
 * Every event this product reports. GA4 treats `sign_up` and `login` as
 * recommended names (they get first-class reporting), so those two keep
 * Google's spelling rather than a house one.
 *
 * ⚠️ `scan_completed` means A REPORT CAME BACK. A refusal — out of
 * allowance, needs an account — is NOT a completion and gets its own name.
 * Counting a 429 as a completed scan would make the funnel read as healthy at
 * exactly the point where users are being turned away, which is the one thing
 * this instrumentation exists to detect.
 */
export type AnalyticsEventName =
  | "sign_up"
  | "login"
  | "scan_started"
  | "scan_completed"
  | "scan_blocked"
  | "tailor_started"
  | "download"
  | "app_view"
  // The blog's reader prompt. Each carries `post` and `variant`, so a result can
  // be read per post and per offer instead of guessed.
  | "blog_prompt_shown"
  | "blog_prompt_dismissed"
  | "blog_prompt_submitted"
  | "blog_prompt_clicked"
  // Job alerts (the daily jobs email). Each carries `place`: "feed", "empty"
  // or "sidebar", so we can see which ask actually turns people on.
  | "job_alert_ask_shown"
  | "job_alert_ask_dismissed"
  | "job_alert_enabled"
  | "job_alert_disabled"
  // The Apply link on a job. `apply_click` is a click on the real link that
  // leaves for the employer's site; `apply_gated` is a signed-out visitor
  // stopped by the sign-in wall instead. Both carry `place` and `posting_id`.
  // Neither says the person finished applying: we never see the employer's form.
  | "apply_click"
  | "apply_gated";

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

/**
 * Where an Apply link sits. `job_page` is the public /jobs/<id>/ page that
 * search sends people to, which has no account behind it at all.
 */
export type ApplyPlace = "job_detail" | "feed" | "home" | "job_page";

type GtagFn = (command: string, ...args: unknown[]) => void;

function gtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { gtag?: unknown }).gtag;
  return typeof fn === "function" ? (fn as GtagFn) : null;
}

/** True when GA is actually loaded. Exported so tests can assert the no-op path. */
export function analyticsReady(): boolean {
  return gtag() !== null;
}

/**
 * Report one event. Params with `undefined` values are dropped rather than
 * sent as the string "undefined", which is what GA4 would otherwise display
 * as a legitimate dimension value.
 */
export function trackEvent(name: AnalyticsEventName, params?: AnalyticsParams): void {
  try {
    const g = gtag();
    if (!g) return;
    let payload: AnalyticsParams | undefined;
    if (params) {
      payload = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) payload[k] = v;
      }
    }
    g("event", name, payload);
  } catch {
    /* analytics is never load-bearing */
  }
}

/**
 * Report an Apply link click, or a signed-out visitor stopped at the wall.
 * One function so the parameter names cannot drift between the four places an
 * Apply link lives: a report that splits `posting_id` from `postingId` shows
 * the same job as two rows.
 */
export function trackApply(
  name: "apply_click" | "apply_gated",
  place: ApplyPlace,
  job: { id: string; company?: string | null },
): void {
  trackEvent(name, { place, posting_id: job.id, company: job.company ?? undefined });
}
