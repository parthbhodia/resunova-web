import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));
vi.mock("@/lib/utils", () => ({ apiUrl: (p: string) => `https://api.test${p}` }));

import { apiFetch, accessToken, refusalFrom, scanLimitFrom, planLabel } from "@/lib/apiClient";

function ok(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

/** The Authorization header actually handed to fetch, or null. */
function sentAuth(call = 0): string | null {
  const [, init] = fetchMock.mock.calls[call];
  return new Headers(init?.headers).get("Authorization");
}

describe("apiFetch", () => {
  it("attaches the session token", async () => {
    await apiFetch("/api/analyze");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/api/analyze");
    expect(sentAuth()).toBe("Bearer tok");
  });

  it("sends no Authorization header when signed out", async () => {
    // Anonymous use is a product decision, not an oversight: one free scan
    // before sign-in. An empty bearer would read as failed auth, not a guest.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await apiFetch("/api/analyze");
    expect(sentAuth()).toBeNull();
  });

  it("stays anonymous rather than throwing when Supabase is unconfigured", async () => {
    // Marketing-only builds set no Supabase env, so getSupabaseClient throws.
    // A page that merely calls the API must still render.
    mockGetSession.mockRejectedValue(new Error("Supabase env vars not set"));
    await expect(apiFetch("/api/jobs/feed")).resolves.toBeTruthy();
    expect(sentAuth()).toBeNull();
  });

  it("preserves method, body and other init options", async () => {
    const signal = new AbortController().signal;
    await apiFetch("/api/x", { method: "POST", body: "{}", keepalive: true, signal });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(init.keepalive).toBe(true);
    expect(init.signal).toBe(signal);
  });

  it("keeps caller-supplied headers alongside the token", async () => {
    await apiFetch("/api/x", { headers: { "Content-Type": "application/json" } });
    const [, init] = fetchMock.mock.calls[0];
    const h = new Headers(init.headers);
    expect(h.get("Content-Type")).toBe("application/json");
    expect(h.get("Authorization")).toBe("Bearer tok");
  });

  it("does not set Content-Type itself", async () => {
    // A FormData body needs the browser to choose the multipart boundary;
    // defaulting the header here would break every résumé upload.
    await apiFetch("/api/upload-resume", { method: "POST", body: new FormData() });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Content-Type")).toBe(false);
  });

  it("lets a caller override the Authorization header", async () => {
    await apiFetch("/api/x", { headers: { Authorization: "Bearer other" } });
    expect(sentAuth()).toBe("Bearer other");
  });

  it("passes an absolute URL through untouched", async () => {
    await apiFetch("https://elsewhere.test/thing");
    expect(fetchMock.mock.calls[0][0]).toBe("https://elsewhere.test/thing");
  });
});

describe("accessToken", () => {
  it("returns the token, or null when signed out", async () => {
    expect(await accessToken()).toBe("tok");
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await accessToken()).toBeNull();
  });
});

describe("refusalFrom", () => {
  it("ignores anything that is not a 401 or 429", () => {
    expect(refusalFrom(200, { error: "x" })).toBeNull();
    expect(refusalFrom(500, { error: "boom" })).toBeNull();
    expect(refusalFrom(422, { error: "not a résumé" })).toBeNull();
  });

  it("uses the explicit remedy when the backend sends one", () => {
    expect(refusalFrom(429, { remedy: "sign_in", error: "Sign in to continue." })?.remedy).toBe("sign_in");
    expect(refusalFrom(401, { remedy: "upgrade" })?.remedy).toBe("upgrade");
  });

  it("carries the quota numbers through", () => {
    const r = refusalFrom(429, {
      error: "Out of scans.", code: "quota_exceeded", remedy: "upgrade",
      limit: 3, used: 3, remaining: 0, resetAt: "2026-07-27T00:00:00Z",
    });
    expect(r).toMatchObject({
      message: "Out of scans.", code: "quota_exceeded", remedy: "upgrade",
      limit: 3, used: 3, remaining: 0, resetAt: "2026-07-27T00:00:00Z",
    });
  });

  it("falls back to the status when no remedy is present", () => {
    // The web half ships before the backend starts sending `remedy`, so the
    // old payloads have to keep routing to the right dialog.
    expect(refusalFrom(401, { error: "authentication required" })?.remedy).toBe("sign_in");
    expect(refusalFrom(429, { code: "daily_scan_limit_reached", limit: 3 })?.remedy).toBe("upgrade");
  });

  it("sends an anonymous visitor to sign-in, not to a paywall", () => {
    // They have not hit a paid ceiling; they have no account. Pitching Pro
    // here asks for money for something signing in gives away.
    expect(refusalFrom(429, {
      code: "daily_scan_limit_reached", reason: "anonymous_daily_ip_limit",
    })?.remedy).toBe("sign_in");
  });

  it("supplies a message when the body has none", () => {
    expect(refusalFrom(401, {})?.message).toMatch(/sign in/i);
    expect(refusalFrom(429, {})?.message).toBeTruthy();
  });

  it("tolerates a non-object body", () => {
    expect(refusalFrom(401, null)?.remedy).toBe("sign_in");
    expect(refusalFrom(429, "gateway timeout")?.remedy).toBe("upgrade");
  });
});

describe("scan limit status", () => {
  it("reads the plan for unlimited tiers", () => {
    const pro = scanLimitFrom({ enforced: true, unlimited: true, plan: "pro" });
    expect(planLabel(pro)).toBe("Pro");
    expect(planLabel(scanLimitFrom({ enforced: true, unlimited: true, plan: "institution" }))).toBe("University");
  });

  it("labels an unlimited tier even when the plan is unnamed", () => {
    // A subscriber previously fell through to the metered branch and was shown
    // a "Free" badge next to an Upgrade button.
    expect(planLabel(scanLimitFrom({ enforced: true, unlimited: true }))).toBe("Unlimited");
  });

  it("has no plan label on the metered free tier", () => {
    expect(planLabel(scanLimitFrom({ enforced: true, unlimited: false, limit: 3, used: 1 }))).toBeNull();
  });

  it("coerces missing numbers to null rather than 0", () => {
    // 0 remaining means "used up"; absent means "unknown". Conflating them
    // would show a guest an exhausted quota.
    const s = scanLimitFrom({ enforced: false });
    expect(s.remaining).toBeNull();
    expect(s.limit).toBeNull();
  });
});
