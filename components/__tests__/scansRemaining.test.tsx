import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ScansRemainingPill,
  ScansRemainingRow,
  ScansTabBadge,
  scansTabAriaLabel,
} from "@/components/app-shell/ScansRemainingPill";
import {
  scansStateFromStatus,
  resetScansRemaining,
  setScansRemaining,
} from "@/components/app-shell/useScansRemaining";

const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: mockGetSession, onAuthStateChange: mockOnAuthStateChange },
  }),
}));
vi.mock("@/lib/utils", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils")>()),
  apiUrl: (p: string) => p,
}));

function jsonRes(body: unknown, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body } as Response;
}

const FREE = { enforced: true, unlimited: false, limit: 3, used: 1, remaining: 2 };

beforeEach(() => {
  resetScansRemaining();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "tok", user: { id: "u1" } } },
  });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: () => {} } },
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

/* ── the distinction the whole change exists for ──────────────── */

describe("unlimited and unreadable are different states", () => {
  it("an unlimited plan renders nothing", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonRes({ enforced: true, unlimited: true, plan: "admin" }),
    );
    const { container } = render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText("Scans unavailable")).not.toBeInTheDocument();
  });

  it("a failed lookup renders the unavailable chip, NOT the unlimited silence", async () => {
    // This is the regression: before, `catch {}` made this case render exactly
    // what an admin account renders, so a dead backend was invisible.
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("Scans unavailable")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("a non-2xx also surfaces as unavailable", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ error: "boom" }, { ok: false, status: 500 }));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("Scans unavailable")).toBeInTheDocument());
  });

  it("a 401 is signed-out, not an outage — stays silent", async () => {
    // An expired token during sign-out must not cry wolf.
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ error: "auth" }, { ok: false, status: 401 }));
    const { container } = render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("Retry re-asks and paints the count once the backend recovers", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(jsonRes(FREE));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("Scans unavailable")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument());
    expect(screen.queryByText("Scans unavailable")).not.toBeInTheDocument();
  });
});

/* ── the metered rendering it already had ─────────────────────── */

describe("metered rendering", () => {
  it("renders the count expanded", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument());
  });

  it("renders the bare number in the icon rail", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(<ScansRemainingPill collapsed />);
    await waitFor(() =>
      expect(screen.getByLabelText("2 of 3 scans left today")).toHaveTextContent("2"),
    );
  });

  it("zero remaining says so instead of showing '0 of 3'", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ ...FREE, used: 3, remaining: 0 }));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("No scans left today")).toBeInTheDocument());
  });

  it("a guest allowance is fetched but NOT shown in the nav", async () => {
    // The endpoint answers a signed-out visitor with their per-IP free scan,
    // and Analyze displays it. The nav does not: there is no account to budget
    // for yet. One request serves both; only the rendering differs.
    mockGetSession.mockResolvedValue({ data: { session: null } });
    global.fetch = vi.fn().mockResolvedValue(
      jsonRes({ enforced: true, unlimited: false, anonymous: true, limit: 1, used: 0, remaining: 1 }),
    );
    const { container } = render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("the guest allowance is hidden on every nav surface, not just the pill", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    global.fetch = vi.fn().mockResolvedValue(
      jsonRes({ enforced: true, unlimited: false, anonymous: true, limit: 1, used: 0, remaining: 1 }),
    );
    const { container } = render(
      <>
        <ScansTabBadge />
        <ScansRemainingRow />
      </>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(scansTabAriaLabel({
      kind: "metered", remaining: 1, limit: 1, resetAt: null, anonymous: true,
    })).toBe("More");
  });
});

/* ── mobile parity ────────────────────────────────────────────── */

describe("mobile surfaces carry the same reading", () => {
  it("the More-tab badge shows the count", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(<ScansTabBadge />);
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("the More-tab badge shows '!' when the quota is unreadable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("down"));
    render(<ScansTabBadge />);
    await waitFor(() => expect(screen.getByText("!")).toBeInTheDocument());
  });

  it("the More-tab badge is absent on an unlimited plan", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true, plan: "pro" }));
    const { container } = render(<ScansTabBadge />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("the sheet row renders the count", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(<ScansRemainingRow />);
    await waitFor(() => expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument());
  });

  it("the sheet row offers a retry when unreadable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("down"));
    render(<ScansRemainingRow />);
    await waitFor(() => expect(screen.getByText("Scans unavailable")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("the badge is not visual-only — the tab label carries the count", () => {
    // A number with no accessible name is invisible to a screen reader, which
    // is the same "nobody sees it" problem in a different form.
    expect(scansTabAriaLabel({ kind: "metered", remaining: 2, limit: 3, resetAt: null, anonymous: false }))
      .toBe("More · 2 of 3 scans left today");
    expect(scansTabAriaLabel({ kind: "metered", remaining: 0, limit: 3, resetAt: null, anonymous: false }))
      .toBe("More · no scans left today");
    expect(scansTabAriaLabel({ kind: "error" })).toBe("More · scan quota unavailable");
    expect(scansTabAriaLabel({ kind: "unlimited", plan: "admin" })).toBe("More");
  });

  it("two mounted surfaces share ONE request", async () => {
    // Sidebar and bottom nav are both in the DOM at all times; CSS picks which
    // is visible. Independent fetches would double the load and could disagree.
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(
      <>
        <ScansRemainingPill collapsed={false} />
        <ScansRemainingRow />
      </>,
    );
    await waitFor(() => expect(screen.getAllByText("2 of 3 scans left")).toHaveLength(2));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

/* ── one store for three consumers ────────────────────────────── */

describe("write-through, so surfaces cannot hold different numbers", () => {
  it("a post-scan count updates the nav without a refetch", async () => {
    // The scan response already carries the new remaining count. Re-asking the
    // server for a number we were just handed would waste a round trip AND
    // leave the nav badge stale until it landed.
    const fetchMock = vi.fn().mockResolvedValue(jsonRes(FREE));
    global.fetch = fetchMock;
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument());

    act(() => setScansRemaining(1));
    await waitFor(() => expect(screen.getByText("1 of 3 scans left")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("every mounted surface moves together", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(
      <>
        <ScansRemainingPill collapsed={false} />
        <ScansRemainingRow />
      </>,
    );
    await waitFor(() => expect(screen.getAllByText("2 of 3 scans left")).toHaveLength(2));
    act(() => setScansRemaining(0));
    await waitFor(() => expect(screen.getAllByText("No scans left today")).toHaveLength(2));
  });

  it("never invents a count on an unlimited plan or an outage", async () => {
    // Lowering a number we do not have would turn "unlimited" into a quota and
    // "we could not find out" into a claim.
    global.fetch = vi.fn().mockResolvedValue(jsonRes({ enforced: true, unlimited: true, plan: "admin" }));
    const { container } = render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    act(() => setScansRemaining(2));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("ignores a null count rather than blanking the badge", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonRes(FREE));
    render(<ScansRemainingPill collapsed={false} />);
    await waitFor(() => expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument());
    act(() => setScansRemaining(null));
    expect(screen.getByText("2 of 3 scans left")).toBeInTheDocument();
  });
});

/* ── the mapper ───────────────────────────────────────────────── */

describe("scansStateFromStatus", () => {
  it("unlimited wins over everything else", () => {
    expect(scansStateFromStatus({ enforced: true, unlimited: true, plan: "institution" }))
      .toEqual({ kind: "unlimited", plan: "institution" });
  });

  it("not enforced is idle, not an error", () => {
    expect(scansStateFromStatus({ enforced: false, unlimited: false })).toEqual({ kind: "idle" });
  });

  it("enforced with no numbers is an error, not a silent pass", () => {
    // The backend only omits limit/remaining when it also sets unlimited, so a
    // payload with neither is a contract break — surface it.
    expect(scansStateFromStatus({ enforced: true, unlimited: false })).toEqual({ kind: "error" });
  });

  it("carries the anonymous flag through, so the nav can exclude guests", () => {
    const state = scansStateFromStatus({
      enforced: true, unlimited: false, anonymous: true, limit: 1, used: 0, remaining: 1,
    });
    expect(state).toMatchObject({ kind: "metered", anonymous: true });
  });

  it("a full metered payload maps through", () => {
    expect(scansStateFromStatus({ ...FREE, resetAt: "2026-08-11T00:00:00Z" })).toEqual({
      kind: "metered",
      remaining: 2,
      limit: 3,
      resetAt: "2026-08-11T00:00:00Z",
      anonymous: false,
    });
  });
});
