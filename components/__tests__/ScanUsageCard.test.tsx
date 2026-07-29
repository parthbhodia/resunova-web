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
    // Paying Pro is metered at 30/day — still must badge as Pro, never Free/UMBC.
    global.fetch = vi.fn().mockResolvedValue(jsonRes({
      enforced: true, unlimited: false, plan: "pro", limit: 30, used: 4, remaining: 26,
    }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.getByText(/30 résumé scans per day/)).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("UMBC")).not.toBeInTheDocument();
  });

  it("legacy unlimited Pro payload still badges Pro", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true, plan: "pro" }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument());
    expect(screen.getByText(/included with Pro/)).toBeInTheDocument();
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
      .mockResolvedValue(jsonRes({
        enforced: true,
        unlimited: false,
        limit: 2,
        used: 1,
        remaining: 1,
        resetAt: null,
        usedLast7Days: 5,
        dailyUsage: [
          { date: "2026-07-22", count: 0 },
          { date: "2026-07-23", count: 1 },
          { date: "2026-07-24", count: 0 },
          { date: "2026-07-25", count: 1 },
          { date: "2026-07-26", count: 0 },
          { date: "2026-07-27", count: 1 },
          { date: "2026-07-28", count: 2 },
        ],
      }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/1 of 2 scans remaining today/)).toBeInTheDocument());
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "2");
  });

  it("unlimited → shows last-7-day activity when present", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({
      enforced: true,
      unlimited: true,
      plan: "institution",
      usedLast7Days: 9,
      dailyUsage: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-07-${22 + i}`,
        count: i === 6 ? 9 : 0,
      })),
    }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/Unlimited résumé scans/)).toBeInTheDocument());
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText(/9/)).toBeInTheDocument();
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
