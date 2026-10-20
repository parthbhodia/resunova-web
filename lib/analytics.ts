/**
 * GA4 event helpers.
 *
 * `app/layout.tsx` installs `gtag()` and calls `gtag('config', GA_ID)`, which
 * sends exactly one automatic `page_view` per document load. This app is a
 * single page at `/` with the surface chosen by `?view=`, so a client-side
 * navigation fires no `page_view` at all and every surface inherits the
 * homepage's title. The practical result was no measurable conversion: GA
 * could see that a page loaded and nothing about what the visitor did next.
 *
 * These helpers add the missing events. They deliberately do NOT replace the
 * automatic `page_view`; taking that over means sending `send_page_view:
 * false` and owning a router listener, which is a bigger change than the one
 * this PR is making.
 */

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    /** Installed by the inline gtag bootstrap in app/layout.tsx. */
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Queue a GA4 event. Safe to call anywhere: no-ops on the server, and no-ops
 * when the tag is blocked (ad blockers) or has not loaded yet. `gtag` itself
 * only pushes onto `dataLayer`, so an early call is not lost.
 */
export function trackEvent(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}
