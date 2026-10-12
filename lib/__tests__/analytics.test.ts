import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analyticsReady, trackEvent } from "@/lib/analytics";

declare global {
  interface Window { gtag?: unknown }
}

describe("the analytics seam", () => {
  afterEach(() => { delete window.gtag; });

  it("no-ops when GA is absent — an ad blocker must not break a scan", () => {
    delete window.gtag;
    expect(analyticsReady()).toBe(false);
    expect(() => trackEvent("scan_started")).not.toThrow();
  });

  it("no-ops when gtag is present but not callable", () => {
    window.gtag = { nope: true };
    expect(analyticsReady()).toBe(false);
    expect(() => trackEvent("download")).not.toThrow();
  });

  it("sends the event name and params through to gtag", () => {
    const spy = vi.fn();
    window.gtag = spy;
    trackEvent("sign_up", { method: "google" });
    expect(spy).toHaveBeenCalledWith("event", "sign_up", { method: "google" });
  });

  /**
   * GA4 renders an undefined param as the literal string "undefined" and
   * displays it as a legitimate dimension value, so a score we could not read
   * would show up as a real cohort of users with score "undefined".
   */
  it("drops undefined params instead of sending the string 'undefined'", () => {
    const spy = vi.fn();
    window.gtag = spy;
    trackEvent("scan_completed", { score: undefined, has_jd: false });
    // ⚠️ Asserted on the KEYS, not with toHaveBeenCalledWith. Vitest's deep
    // equality treats { score: undefined, has_jd: false } as equal to
    // { has_jd: false }, so the obvious spelling of this test passes whether
    // or not the guard exists — mutation-verified: removing the guard left it
    // green. The key list is what can actually see the difference.
    const sent = spy.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(sent)).toEqual(["has_jd"]);
    expect("score" in sent).toBe(false);
  });

  it("never lets a throwing gtag escape into the caller's flow", () => {
    window.gtag = () => { throw new Error("CSP blocked"); };
    expect(() => trackEvent("tailor_started")).not.toThrow();
  });
});

describe("the event vocabulary", () => {
  beforeEach(() => { delete window.gtag; });

  /**
   * ⚠️ THE INVARIANT WORTH KEEPING. A scan that came back refused — out of
   * allowance, needs an account, not a résumé — is NOT a completed scan.
   * Reporting it as one would make the funnel read healthiest at exactly the
   * point where users are being turned away, which is the single thing this
   * instrumentation was added to detect. `scan_blocked` exists so that
   * failure has somewhere to go that isn't `scan_completed`.
   */
  it("keeps a blocked scan separable from a completed one", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync("components/AnalyzeResume.tsx", "utf8"),
    );
    // Every not-ok exit from applyAnalyzeOutcome reports scan_blocked...
    expect(src).toContain('trackEvent("scan_blocked", { reason: refusal.remedy, status })');
    expect(src).toContain('reason: "not_a_resume"');
    expect(src).toContain('reason: "error"');
    // ...and scan_completed appears exactly once, on the success path.
    expect(src.match(/trackEvent\("scan_completed"/g)?.length).toBe(1);
  });

  /**
   * The download event lives in the shared export hook rather than on each
   * button, and it sits AFTER the response was read as a blob — so a failed
   * export cannot report a download that never reached the user's disk.
   */
  it("reports a download only once a PDF actually came back", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync("hooks/useHtmlPdfExport.ts", "utf8"),
    );
    const blobAt = src.indexOf("const blob = await resp.blob()");
    const trackAt = src.indexOf('trackEvent("download"');
    const throwAt = src.indexOf("throw new Error(detail");
    expect(blobAt).toBeGreaterThan(-1);
    expect(trackAt).toBeGreaterThan(blobAt);
    expect(trackAt).toBeGreaterThan(throwAt);
  });

  /**
   * One emitter for sign_up/login. Sixteen components already subscribe to
   * onAuthStateChange and every one of them is mounted conditionally, so
   * reporting from any of them would make the signup funnel depend on where
   * the user happened to land.
   */
  it("reports auth from exactly one place", async () => {
    const fs = await import("fs");
    const files = [
      "components/AuthGate.tsx",
      "components/AppShell.tsx",
      "components/GoogleOneTap.tsx",
      "components/JobsFeed.tsx",
      "components/AdvisorDashboard.tsx",
      "components/app-shell/useScansRemaining.ts",
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, `${f} must not report auth events`).not.toContain('trackEvent("login"');
      expect(src, `${f} must not report auth events`).not.toContain('trackEvent("sign_up"');
    }
    const emitter = fs.readFileSync("components/AnalyticsAuthEvents.tsx", "utf8");
    expect(emitter).toContain("classifyAuthEvent");
  });
});
