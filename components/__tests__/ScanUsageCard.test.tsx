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

  it("institution user → unlimited / UMBC branch", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true }));
    render(<ScanUsageCard />);
    await waitFor(() => expect(screen.getByText(/Unlimited résumé scans/)).toBeInTheDocument());
    expect(screen.getByText("UMBC")).toBeInTheDocument();
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
    expect(opts.headers.Authorization).toBe("Bearer tok");
  });
});
