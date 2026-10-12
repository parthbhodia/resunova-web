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
  | "app_view";

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

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
