import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { authEventFor, NEW_ACCOUNT_WINDOW_MS } from "@/lib/authAnalytics";
import { trackEvent } from "@/lib/analytics";
import { appViewTitle } from "@/components/app-shell/nav-config";

const mockGetSession = vi.hoisted(() => vi.fn());
const mockOnAuthStateChange = vi.hoisted(() => vi.fn());
const mockUnsubscribe = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

import AnalyticsAuthEvents from "@/components/AnalyticsAuthEvents";

const NOW = Date.parse("2026-10-19T12:00:00Z");

describe("authEventFor", () => {
  it("calls an account created moments ago a sign_up", () => {
    expect(authEventFor("2026-10-19T11:59:40Z", NOW)).toBe("sign_up");
  });

  it("calls an older account a login", () => {
    expect(authEventFor("2026-10-18T12:00:00Z", NOW)).toBe("login");
  });

  it("treats a missing or unparseable created_at as a login", () => {
    expect(authEventFor(undefined, NOW)).toBe("login");
    expect(authEventFor(null, NOW)).toBe("login");
    expect(authEventFor("not-a-date", NOW)).toBe("login");
  });

  it("uses the documented window on both sides of the boundary", () => {
    expect(NEW_ACCOUNT_WINDOW_MS).toBe(5 * 60 * 1000);
    const inside = new Date(NOW - NEW_ACCOUNT_WINDOW_MS + 1000).toISOString();
    const outside = new Date(NOW - NEW_ACCOUNT_WINDOW_MS - 1000).toISOString();
    expect(authEventFor(inside, NOW)).toBe("sign_up");
    expect(authEventFor(outside, NOW)).toBe("login");
  });
});

describe("trackEvent", () => {
  afterEach(() => {
    delete window.gtag;
  });

  it("forwards to gtag when the tag has loaded", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent("scan_started", { source: "upload" });
    expect(gtag).toHaveBeenCalledWith("event", "scan_started", { source: "upload" });
  });

  it("is a no-op when gtag is absent (blocked or not loaded)", () => {
    expect(() => trackEvent("sign_up")).not.toThrow();
  });
});

describe("appViewTitle", () => {
  it("names the surface instead of reusing the homepage title", () => {
    expect(appViewTitle("analyze", "Free AI Resume Builder")).toBe("Analyze · Resunova");
    expect(appViewTitle("builder", "Free AI Resume Builder")).toBe("Resume Builder · Resunova");
  });

  it("keeps the page's own title for home", () => {
    expect(appViewTitle("home", "Free AI Resume Builder")).toBe("Free AI Resume Builder");
  });
});

describe("AnalyticsAuthEvents", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/?view=analyze");
    mockUnsubscribe.mockReset();
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
  });

  afterEach(() => {
    delete window.gtag;
  });

  function stubAuth(user: { id: string; created_at: string }, fireSignedIn: boolean) {
    mockGetSession.mockResolvedValue({ data: { session: { user } } });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      if (fireSignedIn) cb("SIGNED_IN", { user });
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
  }

  it("reports a new account once, tagged with the surface it came from", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    stubAuth({ id: "new-user", created_at: new Date().toISOString() }, true);

    render(<AnalyticsAuthEvents />);

    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    expect(gtag).toHaveBeenCalledWith("event", "sign_up", { view: "analyze" });
  });

  it("does not count a refresh as a second sign_up", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    stubAuth({ id: "new-user", created_at: new Date().toISOString() }, true);

    const first = render(<AnalyticsAuthEvents />);
    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = render(<AnalyticsAuthEvents />);
    await waitFor(() => expect(mockGetSession).toHaveBeenCalledTimes(2));
    expect(gtag).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it("reports a returning account as a login", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    stubAuth({ id: "returning-user", created_at: "2026-01-04T10:00:00Z" }, true);

    render(<AnalyticsAuthEvents />);

    await waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
    expect(gtag).toHaveBeenCalledWith("event", "login", { view: "analyze" });
  });
});
