import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dayBars, isEmptyUsage, sumDays, type ExtensionUsageResponse } from "@/lib/adminExtensionUsage";

const apiFetch = vi.fn();
vi.mock("@/lib/apiClient", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "archived"];
const STATUS_LABEL: Record<string, string> = {
  saved: "Saved (filled, not confirmed)",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

function days(n: number, hits: Record<number, number> = {}) {
  return Array.from({ length: n }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, count: hits[i] ?? 0 }));
}

// The shape of the live payload with staff included: one account, 23 forms all
// still at 'saved', a handful of opt-in events.
function payload(over: Partial<ExtensionUsageResponse> = {}): ExtensionUsageResponse {
  const base: ExtensionUsageResponse = {
    windowDays: 30,
    includeStaff: true,
    staffExcluded: 0,
    minDenominator: 30,
    accounts: { everConnected: 1, connectedNow: 1, seenInWindow: 1, sessionsTotal: 13, choseAccept: 1 },
    tracker: {
      recordedTotal: 23,
      recordedInWindow: 21,
      accounts: 1,
      byStatus: STATUSES.map((k) => ({ key: k, label: STATUS_LABEL[k], count: k === "saved" ? 23 : 0 })),
      reachedApplied: 0,
      appliedPct: null,
      byDay: days(30, { 11: 14, 19: 1 }),
    },
    events: {
      total: 12,
      accounts: 1,
      byName: [
        { key: "panel_action", label: "Job page card actions", count: 6, accounts: 1 },
        { key: "fill_used", label: "Filled a form", count: 2, accounts: 1 },
      ],
      fills: {
        count: 2, accounts: 1, filled: 20, skipped: 6, requiredTotal: 40, requiredOpen: 32,
        requiredOpenPct: null, undone: 0, undoPct: null,
      },
      bySite: [{ key: "greenhouse", label: "Greenhouse", count: 2, accounts: 1 }],
      attach: [
        { key: "attached", label: "Attached", count: 2, accounts: 1 },
        { key: "failed", label: "Failed", count: 0, accounts: 0 },
      ],
      attachedPct: null,
      problems: [],
      panel: [{ key: "shown", label: "Card shown", count: 5, accounts: 1 }],
      fillsByDay: days(30, { 13: 1, 19: 1 }),
    },
  };
  return { ...base, ...over };
}

function ok(body: unknown = payload()) {
  return { ok: true, status: 200, json: async () => body };
}

// The panel keeps its last window, its staff switch and a payload cache at module
// level so they survive the RouterView unmount. That is the behaviour, and it is
// also why every test needs a fresh copy: otherwise one test's staff switch or
// cached payload decides the next test's first request.
let ExtensionUsagePanel: typeof import("@/components/ExtensionUsagePanel").default;

beforeEach(async () => {
  cleanup();
  vi.resetModules();
  ExtensionUsagePanel = (await import("@/components/ExtensionUsagePanel")).default;
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(ok());
});

const urlOf = (i = 0) => String(apiFetch.mock.calls[i]?.[0]);

describe("what the panel asks for", () => {
  it("defaults to thirty days with staff left out", async () => {
    render(<ExtensionUsagePanel />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(urlOf()).toBe("/api/admin/extension-usage?days=30");
  });

  it("asks for staff only when the switch is on", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    fireEvent.click(document.querySelector("[data-ext-include-staff]") as HTMLInputElement);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/admin/extension-usage?days=30&include_staff=1"));
  });

  it("changing the window refetches with that window", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    fireEvent.change(document.querySelector("[data-ext-window]") as HTMLSelectElement, { target: { value: "90" } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/admin/extension-usage?days=90"));
  });
});

describe("a fill is not an application", () => {
  it("shows all six statuses, zeros included, with the plain-language label for saved", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Saved (filled, not confirmed)");
    for (const label of Object.values(STATUS_LABEL)) expect(screen.getByText(label)).toBeTruthy();
  });

  it("says in the card caption that a fill is saved, not applied", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect(document.body.textContent).toMatch(/A fill is saved, not applied/);
  });

  it("counts applied-or-later separately from the 23 recorded forms", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    const tracker = document.querySelector("[data-ext-tracker]") as HTMLElement;
    expect(tracker.textContent).toMatch(/Recorded, all time23/);
    expect(tracker.textContent).toMatch(/Applied or later0/);
  });
});

describe("a suppressed rate is never drawn as a number", () => {
  it("names the threshold instead of showing 0%", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    for (const attr of ["data-ext-applied-rate", "data-ext-open-rate", "data-ext-undo-rate", "data-ext-attach-rate"]) {
      const el = document.querySelector(`[${attr}]`) as HTMLElement;
      expect(el.textContent, attr).toMatch(/^rate shows from 30 /);
      expect(el.textContent, attr).not.toMatch(/%/);
    }
  });

  it("shows the rate once the backend supplies one", async () => {
    const p = payload();
    p.tracker.appliedPct = 10;
    p.events.fills.undoPct = 25;
    apiFetch.mockResolvedValue(ok(p));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect((document.querySelector("[data-ext-applied-rate]") as HTMLElement).textContent).toBe("10%");
    expect((document.querySelector("[data-ext-undo-rate]") as HTMLElement).textContent).toBe("25%");
  });

  it("a real zero rate is still shown as 0%", async () => {
    const p = payload();
    p.tracker.appliedPct = 0;
    apiFetch.mockResolvedValue(ok(p));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect((document.querySelector("[data-ext-applied-rate]") as HTMLElement).textContent).toBe("0%");
  });
});

describe("two populations stay apart", () => {
  it("the usage-counts card says it is different people and is never divided", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Usage counts");
    expect(document.body.textContent).toMatch(/different people from the forms-filled numbers above/);
    expect(document.body.textContent).toMatch(/never divided by each other/);
  });

  it("shows account counts from each source without summing them", async () => {
    const p = payload();
    p.tracker.accounts = 9;
    p.events.accounts = 2;
    p.events.fills.accounts = 2;
    apiFetch.mockResolvedValue(ok(p));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect((document.querySelector("[data-ext-tracker]") as HTMLElement).textContent).toMatch(/9 accounts/);
    expect((document.querySelector("[data-ext-events]") as HTMLElement).textContent).toMatch(/2 accounts/);
    expect(document.body.textContent).not.toMatch(/11 accounts/);
  });

  it("with no usage counts it says so rather than drawing empty charts", async () => {
    const p = payload();
    p.events.total = 0;
    apiFetch.mockResolvedValue(ok(p));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Usage counts");
    expect(document.querySelector("[data-ext-no-events]")).toBeTruthy();
    expect(document.querySelector("[data-ext-events]")).toBeNull();
  });
});

describe("the empty first view", () => {
  function empty(over: Partial<ExtensionUsageResponse> = {}) {
    const p = payload({ includeStaff: false, staffExcluded: 3, ...over });
    p.accounts = { everConnected: 0, connectedNow: 0, seenInWindow: 0, sessionsTotal: 0, choseAccept: 0 };
    p.tracker = { ...p.tracker, recordedTotal: 0, recordedInWindow: 0, accounts: 0, byDay: days(30),
      byStatus: p.tracker.byStatus.map((s) => ({ ...s, count: 0 })) };
    p.events = { ...p.events, total: 0, accounts: 0, fillsByDay: days(30) };
    return p;
  }

  it("explains that staff are left out and points at the switch", async () => {
    apiFetch.mockResolvedValue(ok(empty()));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    const note = document.querySelector("[data-ext-empty-staff]") as HTMLElement;
    expect(note.textContent).toMatch(/3 advisor and admin accounts are left out/);
    expect(note.textContent).toMatch(/Include staff accounts/);
  });

  it("does not show the notice when staff are already included", async () => {
    // staffExcluded stays non-zero so the "anyone to have been excluded" guard
    // cannot rescue this case: only the includeStaff check can.
    apiFetch.mockResolvedValue(ok(empty({ includeStaff: true, staffExcluded: 3 })));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect(document.querySelector("[data-ext-empty-staff]")).toBeNull();
  });

  it("does not show the notice when there is activity", async () => {
    apiFetch.mockResolvedValue(ok(payload({ includeStaff: false, staffExcluded: 3 })));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect(document.querySelector("[data-ext-empty-staff]")).toBeNull();
  });

  it("does not show the notice when there is nobody to have been excluded", async () => {
    apiFetch.mockResolvedValue(ok(empty({ staffExcluded: 0 })));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    expect(document.querySelector("[data-ext-empty-staff]")).toBeNull();
  });
});

describe("failure is not an empty panel", () => {
  it("a failed request shows an error and no figures", async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "extension usage unavailable" }) });
    render(<ExtensionUsagePanel />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/extension usage unavailable/);
    expect(screen.queryByText("Connected now")).toBeNull();
    expect(screen.queryByText("Forms filled")).toBeNull();
  });

  it("a network error shows an error too", async () => {
    apiFetch.mockRejectedValue(new Error("network down"));
    render(<ExtensionUsagePanel />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/network down/);
  });

  it("a failed refresh keeps what was already painted rather than blanking it", async () => {
    const first = render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    first.unmount();
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "boom" }) });
    render(<ExtensionUsagePanel />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Forms filled")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("one window's error is not shown while another window is still loading", async () => {
    apiFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: "thirty-day failure" }) });
    render(<ExtensionUsagePanel />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/thirty-day failure/);
    apiFetch.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.change(document.querySelector("[data-ext-window]") as HTMLSelectElement, { target: { value: "90" } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("switching to a window that fails does not leave the old window's numbers under the new label", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "boom" }) });
    fireEvent.change(document.querySelector("[data-ext-window]") as HTMLSelectElement, { target: { value: "7" } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/boom/);
    expect(screen.queryByText("Forms filled")).toBeNull();
  });
});

describe("the day charts", () => {
  it("draws one bar per day of the window, including the empty ones", async () => {
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    const svg = document.querySelectorAll("[data-ext-days]")[0] as SVGElement;
    expect(svg.querySelectorAll("[data-ext-day]").length).toBe(30);
  });

  it("says nothing happened instead of drawing a flat chart", async () => {
    const p = payload();
    p.tracker.byDay = days(30);
    apiFetch.mockResolvedValue(ok(p));
    render(<ExtensionUsagePanel />);
    await screen.findByText("Forms filled");
    // The tracker chart is empty; the events chart still draws.
    expect(document.querySelectorAll("[data-ext-days]").length).toBe(1);
    expect(document.body.textContent).toMatch(/Nothing in this window\./);
  });

  it("dayBars scales to the series maximum with a visible floor for a busy-by-comparison day", () => {
    const bars = dayBars([{ day: "a", count: 0 }, { day: "b", count: 1 }, { day: "c", count: 100 }]);
    expect(bars.map((b) => b.ratio)).toEqual([0, 0.06, 1]);
  });

  it("dayBars of an all-zero series has no bars at all", () => {
    expect(dayBars([{ day: "a", count: 0 }, { day: "b", count: 0 }]).every((b) => b.ratio === 0)).toBe(true);
    expect(sumDays([{ day: "a", count: 0 }])).toBe(0);
  });
});

describe("isEmptyUsage", () => {
  it("is true only when no source has anything", () => {
    const empty = payload();
    empty.accounts = { everConnected: 0, connectedNow: 0, seenInWindow: 0, sessionsTotal: 0, choseAccept: 0 };
    empty.tracker.recordedTotal = 0;
    empty.events.total = 0;
    expect(isEmptyUsage(empty)).toBe(true);
    for (const poke of [
      (p: ExtensionUsageResponse) => { p.accounts.sessionsTotal = 1; },
      (p: ExtensionUsageResponse) => { p.accounts.everConnected = 1; },
      (p: ExtensionUsageResponse) => { p.tracker.recordedTotal = 1; },
      (p: ExtensionUsageResponse) => { p.events.total = 1; },
    ]) {
      const p = structuredClone(empty);
      poke(p);
      expect(isEmptyUsage(p)).toBe(false);
    }
  });
});

describe("the dashboard wiring", () => {
  // AdminAnalyticsPanel fetches a heavy windowed payload on mount, so the tab
  // wiring is pinned from source, with comments stripped so a docstring that
  // mentions the tab cannot satisfy it.
  const src = readFileSync(resolve(__dirname, "../AdminAnalyticsPanel.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  it("has an Extension tab", () => {
    expect(src).toMatch(/\{\s*key:\s*"extension",\s*label:\s*"Extension"\s*\}/);
  });

  it("treats it as a self-fetching tab, so the analytics window picker is hidden", () => {
    const list = src.match(/SELF_FETCHING_TABS:\s*TabKey\[\]\s*=\s*\[([^\]]*)\]/);
    expect(list?.[1]).toMatch(/"extension"/);
  });

  it("renders the panel for that tab", () => {
    expect(src).toMatch(/tab === "extension" && <ExtensionUsagePanel \/>/);
  });
});
