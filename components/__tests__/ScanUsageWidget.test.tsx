import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ScanUsageWidget } from "@/components/ScanUsageWidget";

/**
 * Plan-badge and quota-copy mapping for the "Plan & usage" card in Account
 * settings.
 *
 * These branches were previously covered only against `ScanUsageCard`, a
 * component mounted nowhere — so the tested one was dead and the shipping one
 * was untested. That file is gone; the coverage moves here, to the widget that
 * actually renders.
 */

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils")>()),
  apiUrl: (p: string) => p,
}));

function jsonRes(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

/** The widget asks for résumé scans and interview prep; answer by URL. */
function respondWith(scan: unknown, prep: unknown = { enforced: false }) {
  return vi.fn().mockImplementation((url: string) =>
    Promise.resolve(jsonRes(String(url).includes("interview-prep") ? prep : scan)),
  );
}

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("ScanUsageWidget — plan badge", () => {
  it("metered free tier badges Free", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: false, limit: 3, used: 1, remaining: 2 });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText("Free")).toBeInTheDocument());
  });

  it("institution badges University, not Free", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: true, plan: "institution" });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText("University")).toBeInTheDocument());
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("a paying subscriber badges Pro, never Free and never UMBC", async () => {
    // The regression this pins: `unlimited` used to hard-code a UMBC badge, so
    // a Pro subscriber was told they were on a university account.
    global.fetch = respondWith({ enforced: true, unlimited: true, plan: "pro" });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("UMBC")).not.toBeInTheDocument();
  });

  it("admin badges Admin", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: true, plan: "admin" });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
  });

  it("unlimited with no named plan is still not Free", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: true });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText("Unlimited")).toBeInTheDocument());
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });
});

describe("ScanUsageWidget — quota copy", () => {
  it("metered shows remaining-today with a progressbar", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: false, limit: 3, used: 2, remaining: 1 });
    render(<ScanUsageWidget />);
    await waitFor(() =>
      expect(screen.getByText(/1 of 3 résumé scans remaining today/)).toBeInTheDocument(),
    );
    const bar = screen.getAllByRole("progressbar")[0];
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "3");
  });

  it("exhausted quota reads 0 remaining", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: false, limit: 3, used: 3, remaining: 0 });
    render(<ScanUsageWidget />);
    await waitFor(() =>
      expect(screen.getByText(/0 of 3 résumé scans remaining today/)).toBeInTheDocument(),
    );
  });

  it("names the plan the unlimited scans came from", async () => {
    global.fetch = respondWith({ enforced: true, unlimited: true, plan: "pro" });
    render(<ScanUsageWidget />);
    await waitFor(() => expect(screen.getByText(/included with Pro/)).toBeInTheDocument());
  });

  it("sends the bearer token when a session exists", async () => {
    const fetchMock = respondWith({ enforced: false });
    global.fetch = fetchMock;
    render(<ScanUsageWidget />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    expect(new Headers(opts?.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("sends no Authorization header when signed out", async () => {
    // Anonymous use is deliberate: an empty bearer would read as failed auth
    // rather than as a guest.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = respondWith({ enforced: false });
    global.fetch = fetchMock;
    render(<ScanUsageWidget />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    expect(new Headers(opts?.headers).has("Authorization")).toBe(false);
  });
});
