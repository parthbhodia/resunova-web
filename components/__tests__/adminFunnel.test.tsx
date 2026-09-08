import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FunnelPanel from "@/components/FunnelPanel";
import { sankeyLayout, linkRole, nodeRole, rateLabel, type FunnelResponse } from "@/lib/adminFunnel";

const apiFetch = vi.fn();
vi.mock("@/lib/apiClient", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

// The real payload, measured 2026-09-08 with staff excluded.
const PAYLOAD: FunnelResponse = {
  since: null,
  staffExcluded: 3,
  minDenominator: 30,
  stages: [
    { key: "signed_up", label: "Signed up", count: 91, reached: 91, offPath: 0, offPathLabel: null, drop: 0, pctOfSignup: 100, pctOfPrev: null },
    { key: "scanned", label: "Scanned a résumé", count: 65, reached: 65, offPath: 0, offPathLabel: null, drop: 26, pctOfSignup: 71, pctOfPrev: 71 },
    { key: "tailored", label: "Tailored to a job", count: 17, reached: 22, offPath: 5, offPathLabel: "tailored without a saved scan", drop: 48, pctOfSignup: 19, pctOfPrev: 26 },
    // pctOfPrev is SUPPRESSED here: its denominator is a 17-person stage.
    { key: "applied", label: "Applied to a job", count: 0, reached: 2, offPath: 2, offPathLabel: "applied without tailoring", drop: 17, pctOfSignup: 0, pctOfPrev: null },
  ],
  billing: { reachedCheckout: 1, subscribed: 0 },
  repeat: { scannedMoreThanOnce: 27 },
  sankey: {
    total: 91,
    nodes: [
      { key: "signed_up", label: "Signed up", value: 91, depth: 0, terminal: false },
      { key: "scanned", label: "Scanned a résumé", value: 65, depth: 1, terminal: false },
      { key: "no_scan", label: "Never scanned", value: 26, depth: 1, terminal: false },
      { key: "tailored", label: "Tailored to a job", value: 22, depth: 2, terminal: false },
      { key: "stopped_after_scan", label: "Stopped after scanning", value: 46, depth: 2, terminal: true },
      { key: "stopped_after_signup", label: "Stopped after signing up", value: 21, depth: 2, terminal: true },
      { key: "applied", label: "Applied to a job", value: 2, depth: 3, terminal: false },
      { key: "stopped_after_tailor", label: "Stopped after tailoring", value: 22, depth: 3, terminal: true },
    ],
    links: [
      { source: "signed_up", target: "scanned", value: 65 },
      { source: "signed_up", target: "no_scan", value: 26 },
      { source: "scanned", target: "stopped_after_scan", value: 46 },
      { source: "scanned", target: "tailored", value: 17 },
      { source: "no_scan", target: "tailored", value: 5 },
      { source: "no_scan", target: "stopped_after_signup", value: 21 },
      { source: "tailored", target: "stopped_after_tailor", value: 22 },
      { source: "scanned", target: "applied", value: 2 },
    ],
  },
};

function ok(body: unknown = PAYLOAD) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(ok());
});

describe("rule 1 — a null rate means SUPPRESSED, never zero", () => {
  it("renders no percentage where the backend suppressed one", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    const applied = document.querySelector('[data-funnel-stage="applied"]')!;
    expect(applied.querySelector("[data-funnel-pct-prev]")).toBeNull();
    expect(applied.textContent).not.toMatch(/0% of previous/);
  });

  it("still renders the rate the backend did publish", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    const tailored = document.querySelector('[data-funnel-stage="tailored"]')!;
    expect(tailored.querySelector("[data-funnel-pct-signup]")?.textContent).toContain("19%");
    expect(tailored.querySelector("[data-funnel-pct-prev]")?.textContent).toContain("26%");
  });

  it("rateLabel keeps zero and drops null", () => {
    expect(rateLabel(0)).toBe("0%");
    expect(rateLabel(null)).toBeNull();
    expect(rateLabel(undefined)).toBeNull();
  });

  it("never suppresses a count", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    // "17 tailored and never applied" is the actionable fact; only rates gate.
    expect(document.querySelector('[data-funnel-stage="tailored"]')!.textContent).toContain("17");
    expect(document.querySelector('[data-funnel-stage="applied"]')!.textContent).toContain("0");
  });
});

describe("rule 2 — billing and repeat are not bars and not nodes", () => {
  it("draws exactly the four chain stages", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    expect(document.querySelectorAll("[data-funnel-stage]")).toHaveLength(4);
  });

  it("keeps them in their own strip", async () => {
    render(<FunnelPanel />);
    const aside = await waitFor(() => document.querySelector("[data-funnel-aside]")!);
    expect(aside.textContent).toContain("27");
    expect(aside.textContent).toContain("Reached checkout");
    expect(document.querySelector('[data-funnel-stage="billing"]')).toBeNull();
    expect(document.querySelector('[data-funnel-stage="repeat"]')).toBeNull();
  });

  it("puts neither in the sankey", () => {
    const keys = sankeyLayout(PAYLOAD.sankey).nodes.map((n) => n.key);
    expect(keys).not.toContain("billing");
    expect(keys).not.toContain("repeat");
  });
});

describe("rule 3 — off-path renders beside its stage, verbatim", () => {
  it("names the route rather than printing a bare number", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    const el = document.querySelector('[data-funnel-stage="tailored"] [data-funnel-offpath]');
    expect(el?.textContent).toBe("5 tailored without a saved scan");
  });

  it("draws nothing where there is no off-path", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Scanned a résumé");
    expect(document.querySelector('[data-funnel-stage="scanned"] [data-funnel-offpath]')).toBeNull();
  });
});

describe("rule 4 — the sankey is drawn from the links", () => {
  it("takes node values as given rather than re-deriving them", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    for (const n of PAYLOAD.sankey.nodes) {
      expect(layout.nodes.find((p) => p.key === n.key)!.value).toBe(n.value);
    }
  });

  it("DRAWS the given value, even where the links would sum to something else", () => {
    // On a healthy payload the server's value IS the inflow, so a view that
    // re-derived it would look identical — which is exactly why this fixture
    // makes them disagree. The block must follow the number it reports, or the
    // picture and its own label say different things.
    const divergent = {
      ...PAYLOAD.sankey,
      nodes: PAYLOAD.sankey.nodes.map((n) => (n.key === "tailored" ? { ...n, value: 44 } : n)),
    };
    const layout = sankeyLayout(divergent);
    const tailored = layout.nodes.find((n) => n.key === "tailored")!;
    const scanned = layout.nodes.find((n) => n.key === "scanned")!;
    expect(tailored.value).toBe(44);
    // Expressed as a RATIO rather than against a scale constant: the point is
    // that the block is sized by 44 and not by the 22 its inbound links sum to,
    // and that stays true whatever the band scale works out to be.
    expect(tailored.h / scanned.h).toBeCloseTo(44 / 65, 5);
    expect(tailored.h).toBeGreaterThan((22 / 65) * scanned.h * 1.5);
  });

  it("keeps the scanned→applied edge spanning two columns", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    const spanning = layout.links.find((l) => l.source === "scanned" && l.target === "applied")!;
    expect(spanning).toBeDefined();
    const src = layout.nodes.find((n) => n.key === "scanned")!;
    const dst = layout.nodes.find((n) => n.key === "applied")!;
    // Depth 1 to depth 3: the route two accounts really took.
    expect(dst.depth - src.depth).toBe(2);
    expect(dst.x).toBeGreaterThan(src.x);
  });

  it("draws every link it was given", () => {
    expect(sankeyLayout(PAYLOAD.sankey).links).toHaveLength(PAYLOAD.sankey.links.length);
  });

  it("renders one path per link in the DOM", async () => {
    render(<FunnelPanel />);
    await waitFor(() => expect(document.querySelector("[data-funnel-sankey]")).toBeTruthy());
    expect(document.querySelectorAll("[data-funnel-link]")).toHaveLength(8);
  });

  it("scales node height to value, so the picture follows the data", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    const scanned = layout.nodes.find((n) => n.key === "scanned")!;
    const applied = layout.nodes.find((n) => n.key === "applied")!;
    expect(scanned.h).toBeGreaterThan(applied.h);
  });

  it("survives an empty sankey without throwing", () => {
    expect(sankeyLayout({ total: 0, nodes: [], links: [] }).nodes).toEqual([]);
    expect(sankeyLayout(null).links).toEqual([]);
  });
});

describe("flow roles", () => {
  it("marks both skipped-ahead routes off-path and labels them", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    const off = layout.links.filter((l) => l.role === "offpath").map((l) => `${l.source}->${l.target}`);
    expect(off.sort()).toEqual(["no_scan->tailored", "scanned->applied"]);
    for (const l of layout.links.filter((x) => x.role === "offpath")) {
      expect(l.labelX).not.toBeNull();
    }
  });

  it("labels only the off-path strands", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    expect(layout.links.filter((l) => l.labelX !== null)).toHaveLength(2);
  });

  it("treats a terminal target as stopped, never as off-path", () => {
    const layout = sankeyLayout(PAYLOAD.sankey);
    expect(layout.links.find((l) => l.target === "stopped_after_scan")!.role).toBe("stopped");
    expect(layout.links.find((l) => l.target === "stopped_after_signup")!.role).toBe("stopped");
  });

  it("only the chain keys read as progress", () => {
    expect(nodeRole({ key: "scanned" })).toBe("progress");
    expect(nodeRole({ key: "no_scan" })).toBe("stopped");
    expect(nodeRole({ key: "stopped_after_tailor" })).toBe("stopped");
  });

  it("stopped is grey, not red — a measurement, not a judgement", async () => {
    render(<FunnelPanel />);
    await waitFor(() => expect(document.querySelector("[data-funnel-sankey]")).toBeTruthy());
    const stopped = document.querySelector('[data-funnel-link][data-role="stopped"]')!;
    expect(stopped.getAttribute("fill")).toBe("var(--dim)");
    expect(stopped.getAttribute("fill")).not.toMatch(/red/);
  });

  it("adjacent progress hops are neither stopped nor off-path", () => {
    const nodes = PAYLOAD.sankey.nodes;
    const byKey = (k: string) => nodes.find((n) => n.key === k)!;
    expect(linkRole(byKey("signed_up"), byKey("scanned"))).toBe("progress");
    expect(linkRole(byKey("scanned"), byKey("tailored"))).toBe("progress");
  });
});

describe("the panel's own contract", () => {
  it("shows an error rather than an empty funnel when the RPC fails", async () => {
    // A COLD mount: the panel's payload cache is module-level and survives the
    // RouterView unmount by design, so the error state is only reachable when
    // nothing has been painted yet. Reset the module to get that state honestly
    // rather than asserting against a cache another test warmed.
    vi.resetModules();
    apiFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "funnel_unavailable" }) });
    const { default: Cold } = await import("@/components/FunnelPanel");
    render(<Cold />);
    // Zeros are indistinguishable from a product nobody uses.
    expect(await screen.findByRole("alert")).toHaveTextContent("funnel_unavailable");
    expect(document.querySelectorAll("[data-funnel-stage]")).toHaveLength(0);
  });

  it("keeps the painted funnel when a same-window REFRESH fails", async () => {
    // The house rule from lib/clientCache: only a COLD failure may replace what
    // is on screen. The refresh that matters is the one on REMOUNT — the host
    // dashboard unmounts this panel on every ?view= switch — so warm the cache,
    // remount, and fail the request.
    vi.resetModules();
    apiFetch.mockResolvedValue(ok());
    const { default: Panel } = await import("@/components/FunnelPanel");
    const first = render(<Panel />);
    await screen.findByText("Tailored to a job");
    first.unmount();

    apiFetch.mockRejectedValue(new Error("network"));
    const before = apiFetch.mock.calls.length;
    render(<Panel />);
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThan(before));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(document.querySelectorAll("[data-funnel-stage]")).toHaveLength(4);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does NOT keep the old numbers when a different window fails", async () => {
    // The mirror of the rule above, and the reason it is scoped to one window:
    // 30-day counts rendered under a "90 days" label are a mislabelled figure,
    // which is worse than an honest error.
    vi.resetModules();
    apiFetch.mockResolvedValue(ok());
    const { default: Panel } = await import("@/components/FunnelPanel");
    render(<Panel />);
    await screen.findByText("Tailored to a job");

    apiFetch.mockRejectedValue(new Error("network"));
    fireEvent.change(document.querySelector("[data-funnel-window]")!, { target: { value: "90" } });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(document.querySelectorAll("[data-funnel-stage]")).toHaveLength(0);
  });

  it("says the staff exclusion out loud", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    expect(document.body.textContent).toMatch(/Advisor and admin accounts are excluded \(3\)/);
  });

  it("sends the signup cohort window when one is picked", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    fireEvent.change(document.querySelector("[data-funnel-window]")!, { target: { value: "90" } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/api/admin/funnel?days=90"));
  });

  it("explains that a bar counts only the full path", async () => {
    render(<FunnelPanel />);
    await screen.findByText("Tailored to a job");
    expect(document.body.textContent).toMatch(/only people who completed every earlier step/i);
  });
});

describe("the drawing fits its canvas", () => {
  it("keeps every column inside the band, gaps included", () => {
    // Found in a browser, not by a unit test: depth 2 holds three blocks
    // (tailored, stopped-after-scan, stopped-after-signup) and the two 16px
    // gaps between them pushed the bottom block off the canvas.
    const layout = sankeyLayout(PAYLOAD.sankey);
    for (const n of layout.nodes) {
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y + n.h).toBeLessThanOrEqual(layout.height);
    }
  });

  it("still fits when a column grows a fourth block", () => {
    const crowded = {
      total: 100,
      nodes: [
        { key: "signed_up", label: "Signed up", value: 100, depth: 0, terminal: false },
        { key: "scanned", label: "a", value: 25, depth: 1, terminal: false },
        { key: "no_scan", label: "b", value: 25, depth: 1, terminal: false },
        { key: "tailored", label: "c", value: 25, depth: 1, terminal: false },
        { key: "stopped_after_scan", label: "d", value: 25, depth: 1, terminal: true },
      ],
      links: [
        { source: "signed_up", target: "scanned", value: 25 },
        { source: "signed_up", target: "no_scan", value: 25 },
        { source: "signed_up", target: "tailored", value: 25 },
        { source: "signed_up", target: "stopped_after_scan", value: 25 },
      ],
    };
    const layout = sankeyLayout(crowded);
    for (const n of layout.nodes) {
      expect(n.y + n.h).toBeLessThanOrEqual(layout.height);
    }
  });
});

describe("off-path labels stay clear of the blocks", () => {
  it("sits in the gap before its target, never over a column", () => {
    // Found in a browser: the scanned→applied strand crosses a whole column, so
    // a midpoint label landed on top of "Stopped after scanning".
    const layout = sankeyLayout(PAYLOAD.sankey);
    const labelled = layout.links.filter((l) => l.labelX !== null);
    expect(labelled).toHaveLength(2);
    for (const l of labelled) {
      // Not inside any column's block strip — the gaps are the only clear air.
      for (const c of layout.columns) {
        const insideBlock = l.labelX! > c.x && l.labelX! < c.x + layout.blockWidth;
        expect(insideBlock).toBe(false);
      }
      // And it belongs to its own target, sitting just before it.
      const target = layout.nodes.find((n) => n.key === l.target)!;
      expect(l.labelX!).toBeLessThan(target.x);
      expect(target.x - l.labelX!).toBeLessThan(40);
    }
  });
});
