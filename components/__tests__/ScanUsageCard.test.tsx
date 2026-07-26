import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ScanUsageCard from "@/components/ScanUsageCard";

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));
vi.mock("@/lib/utils", () => ({ apiUrl: (p: string) => p }));

function jsonRes(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
});

describe("ScanUsageCard — maps each /api/scan-limit-status branch", () => {
  it("anonymous / not-enforced → free 3-scans copy", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: false, unlimited: false }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/3 résumé scans per day/)).toBeInTheDocument());
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("institution user → unlimited / university branch", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true, plan: "institution" }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/university account/)).toBeInTheDocument());
    expect(screen.getByText("University")).toBeInTheDocument();
  });

  it("Pro subscriber gets a Pro badge, not Free and not UMBC", async () => {
    // The regression this guards: a paying subscriber saw a "Free" badge next
    // to an Upgrade button, because pro_subscription had no branch server-side
    // and every unlimited user was labelled UMBC client-side.
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true, plan: "pro" }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.getByText(/included with Pro/)).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("UMBC")).not.toBeInTheDocument();
  });

  it("unlimited with no named plan is still not shown as Free", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText("Unlimited")).toBeInTheDocument());
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("free enforced → progressbar + remaining-today copy", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonRes({ enforced: true, unlimited: false, limit: 2, used: 1, remaining: 1, resetAt: null }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/1 of 2 scans remaining today/)).toBeInTheDocument());
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "2");
  });

  it("quota exhausted → 0 remaining copy", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonRes({ enforced: true, unlimited: false, limit: 3, used: 3, remaining: 0 }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/0 of 3 scans remaining today/)).toBeInTheDocument());
  });

  it("sends the bearer token when a session exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ enforced: false, unlimited: false }));
    global.fetch = fetchMock;
    render(<ScanUsageCard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    // apiFetch hands fetch a Headers instance, not a plain object.
    expect(new Headers(opts.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("sends no Authorization header when signed out", async () => {
    // Anonymous use is deliberate: sending an empty or bogus bearer would make
    // the backend treat a guest as a failed auth rather than as a guest.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ enforced: false, unlimited: false }));
    global.fetch = fetchMock;
    render(<ScanUsageCard />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, opts] = fetchMock.mock.calls[0];
    expect(new Headers(opts?.headers).has("Authorization")).toBe(false);
  });
});
