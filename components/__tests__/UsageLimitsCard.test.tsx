import { readFileSync } from "node:fs";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UsageLimitsCard from "@/components/account/UsageLimitsCard";

/**
 * Render-level claims for the Usage & limits card.
 *
 * ⚠️ The bearer-header cases at the bottom are PORTED from
 * `ScanUsageWidget.test.tsx`, which this card replaces. That file was the only
 * coverage of the plan-badge mapping and of the signed-out no-header rule, and
 * this repo has already shipped the mistake of deleting a tested component
 * while the live one went untested (`ScanUsageCard`). The plan mapping moved to
 * `lib/__tests__/usagePanel.test.ts`; the header rules are here.
 */

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils")>()),
  apiUrl: (p: string) => p,
}));
vi.mock("@/components/UpgradeDialog", () => ({
  useUpgradeDialog: () => ({ openUpgrade: vi.fn() }),
}));

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

/** Scans and interview prep are separate endpoints; answer by URL. */
function respondWith(scan: unknown, prep: unknown = { enforced: true, limit: 2, used: 0, remaining: 2 }) {
  return vi.fn().mockImplementation((url: string) =>
    Promise.resolve(jsonRes(String(url).includes("interview-prep") ? prep : scan)),
  );
}

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

/** Comments stripped: a docstring that QUOTES a defect is not the defect. */
function codeOnly(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("UsageLimitsCard", () => {
  /**
   * ⚠️ DESIGN.md invariant 7. The hue tokens are tuned to be READ on the
   * background, so they are light in dark mode — `#fff` on `--accent` measures
   * 2.53:1 there. This had NO test until a mutation restoring the hardcoded
   * white turned nothing red.
   */
  it("never hardcodes a white foreground on the filled Upgrade button", () => {
    const src = codeOnly("components/account/UsageLimitsCard.tsx");
    expect(src).not.toMatch(/color:\s*["']#f{3,6}["']/i);
    expect(src).toContain("var(--on-fill)");
  });

  it("names the plan it read", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 1, remaining: 2 });
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText("Free")).toBeInTheDocument());
  });

  it("shows the count and an accessible progressbar per metered row", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 2, remaining: 1 });
    render(<UsageLimitsCard />);
    const bar = await waitFor(() =>
      screen.getByRole("progressbar", { name: /Résumé scans: 2 of 3 used today/ }),
    );
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "3");
  });

  /**
   * ⚠️ COLOUR IS NEVER THE ONLY CARRIER. An at-limit row says so in words, so
   * it survives greyscale and colour-blind vision.
   */
  it("says 'All used' in words at the limit, not only in colour", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 3, remaining: 0 });
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText("All used")).toBeInTheDocument());
  });

  it("does not say 'All used' below the limit", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 1, remaining: 2 });
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText("Free")).toBeInTheDocument());
    expect(screen.queryByText("All used")).toBeNull();
  });

  it("states the uncapped features as unlimited rather than hiding them", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 1, remaining: 2 });
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText("Tailor to a job")).toBeInTheDocument());
    expect(screen.getAllByText(/Unlimited/).length).toBeGreaterThanOrEqual(4);
  });

  it("offers the upgrade on a metered plan", async () => {
    global.fetch = respondWith({ enforced: true, limit: 3, used: 1, remaining: 2 });
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeInTheDocument());
  });

  /** A paying account must never be shown a dead CTA. */
  it("offers no upgrade to a Pro account", async () => {
    global.fetch = respondWith(
      { enforced: true, unlimited: true, plan: "pro" },
      { enforced: true, unlimited: true, plan: "pro" },
    );
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Upgrade to Pro" })).toBeNull();
  });

  /**
   * ⚠️ "We asked and could not find out" must not render as "unlimited". And
   * the two endpoints settle independently: one being down must not turn the
   * other row into a non-answer too — the `Promise.all` failure that once took
   * the whole résumé library down with one table.
   */
  it("reports an unreadable row as unchecked, and keeps the other one", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) =>
      String(url).includes("interview-prep")
        ? Promise.reject(new Error("down"))
        : Promise.resolve(jsonRes({ enforced: true, limit: 3, used: 1, remaining: 2 })),
    );
    render(<UsageLimitsCard />);
    await waitFor(() => expect(screen.getByText(/Couldn't check/)).toBeInTheDocument());
    expect(
      screen.getByRole("progressbar", { name: /Résumé scans: 1 of 3 used today/ }),
    ).toBeInTheDocument();
  });

  it("sends the bearer token when a session exists", async () => {
    const fetchMock = respondWith({ enforced: true, limit: 3, used: 0, remaining: 3 });
    global.fetch = fetchMock;
    render(<UsageLimitsCard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    expect(new Headers(opts?.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("sends no Authorization header when signed out", async () => {
    // An empty bearer would read as FAILED auth rather than as a guest.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = respondWith({ enforced: false });
    global.fetch = fetchMock;
    render(<UsageLimitsCard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    expect(new Headers(opts?.headers).has("Authorization")).toBe(false);
  });
});
