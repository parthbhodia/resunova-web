/**
 * The admin funnel's shapes and its Sankey geometry.
 *
 * ⚠️ The backend (`services/funnel.py`) has already decided what these numbers
 * are allowed to CLAIM, and this module must not undo any of it:
 *
 *  1. A null `pctOfSignup` / `pctOfPrev` means SUPPRESSED — the denominator was
 *     under `minDenominator`. Render the count alone; never a "0%", never a
 *     fallback. This repo has shipped a 66.7% that was two users out of three.
 *  2. `billing` and `repeat` are NOT stages and NOT Sankey nodes. Upgrading is
 *     triggered by the scan cap rather than by applying, and 27 repeat scanners
 *     drawn under 17 tailored would put a bigger bar below a smaller one.
 *  3. `offPathLabel` is rendered verbatim beside its stage. "5 off path" is a
 *     puzzle; "5 tailored without a saved scan" is a finding.
 *  4. The Sankey is drawn FROM THE LINKS with node values taken as given. A node
 *     value is its inflow, summed server-side, so the diagram conserves by
 *     construction — re-deriving a total here is how a view starts disagreeing
 *     with its own edges.
 */

/** The chain, in the product's own order. Billing is deliberately absent. */
export const FUNNEL_STAGE_KEYS = ["signed_up", "scanned", "tailored", "applied"] as const;

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  reached: number;
  offPath: number;
  offPathLabel: string | null;
  drop: number;
  pctOfSignup: number | null;
  pctOfPrev: number | null;
}

export interface SankeyNode {
  key: string;
  label: string;
  value: number;
  depth: number;
  terminal: boolean;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface FunnelResponse {
  since: string | null;
  staffExcluded: number;
  minDenominator: number;
  windowDays?: number | null;
  stages: FunnelStage[];
  billing: { reachedCheckout: number; subscribed: number };
  repeat: { scannedMoreThanOnce: number };
  sankey: { total: number; nodes: SankeyNode[]; links: SankeyLink[] };
}

/**
 * How a strand reads, derived from the data rather than hardcoded per key.
 *
 * `offpath` is the finding the bars structurally cannot show: someone entering a
 * progress node without having come through the previous one — either from a
 * non-progress node (tailored without ever scanning) or by spanning a column
 * (scanned, then applied, never tailoring). ⚠️ That spanning edge is a real
 * route two accounts took; collapsing it into the neighbouring column to tidy
 * the picture would move a measured edge.
 */
export type FlowRole = "progress" | "offpath" | "stopped";

export function nodeRole(node: Pick<SankeyNode, "key">): FlowRole {
  return (FUNNEL_STAGE_KEYS as readonly string[]).includes(node.key) ? "progress" : "stopped";
}

export function linkRole(source: SankeyNode, target: SankeyNode): FlowRole {
  if (nodeRole(target) !== "progress") return "stopped";
  if (nodeRole(source) !== "progress" || target.depth - source.depth > 1) return "offpath";
  return "progress";
}

export interface PlacedNode extends SankeyNode {
  role: FlowRole;
  x: number;
  y: number;
  h: number;
}

export interface PlacedLink extends SankeyLink {
  role: FlowRole;
  /** SVG path for the ribbon. */
  d: string;
  /** Where an off-path strand's own label sits; null for every other role. */
  labelX: number | null;
  labelY: number | null;
  sourceLabel: string;
  targetLabel: string;
}

export interface SankeyLayout {
  nodes: PlacedNode[];
  links: PlacedLink[];
  width: number;
  height: number;
  columns: Array<{ label: string; x: number }>;
  blockWidth: number;
}

const COLUMN_LABELS = ["Everyone", "Did they scan?", "Did they tailor?", "Did they apply?"];
// The last column is wider than its block so `applied` — two people tall — can
// carry a label that will not fit inside its own rectangle.
const W = 1270;
const BLOCK = 150;
const PAD_T = 34;
const PAD_B = 12;
const BAND = 400;
const GAP = 16;
const COLS = [0, 290, 590, 880];
/** Clearance between an off-path label and the block it points at. */
const LABEL_GUTTER = 10;

/** A strand nobody could see is a strand nobody can read. */
const MIN_THICKNESS = 2.5;
const MIN_BLOCK_H = 3;

function ribbon(x0: number, y0: number, x1: number, y1: number, th: number): string {
  const mx = (x0 + x1) / 2;
  return (
    `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}` +
    ` L${x1},${y1 + th} C${mx},${y1 + th} ${mx},${y0 + th} ${x0},${y0 + th} Z`
  );
}

/**
 * Place the nodes and route the ribbons.
 *
 * Geometry comes from the values, so a changed number moves the drawing rather
 * than needing new path text. Ribbons leave a node in target order and arrive in
 * source order, which is what keeps them from braiding.
 */
export function sankeyLayout(sankey: FunnelResponse["sankey"] | null | undefined): SankeyLayout {
  const nodes = Array.isArray(sankey?.nodes) ? sankey!.nodes : [];
  const links = Array.isArray(sankey?.links) ? sankey!.links : [];
  const total = Number(sankey?.total) || 0;
  const empty: SankeyLayout = {
    nodes: [],
    links: [],
    width: W,
    height: PAD_T + BAND + PAD_B,
    columns: COLUMN_LABELS.map((label, i) => ({ label, x: COLS[i] })),
    blockWidth: BLOCK,
  };
  if (!nodes.length || !links.length || total <= 0) return empty;

  // ⚠️ The gaps between stacked blocks are part of a column's height, so the
  // scale has to be solved against the band MINUS the worst column's gaps.
  // Scaling on `BAND / total` alone overflows the moment any column holds three
  // blocks — depth 2 holds three (tailored, stopped-after-scan,
  // stopped-after-signup) and its bottom block fell off the canvas.
  const widestGap = Math.max(
    0,
    ...[0, 1, 2, 3].map((d) => {
      const n = nodes.filter((x) => x.depth === d).length;
      return n > 1 ? GAP * (n - 1) : 0;
    }),
  );
  const scale = Math.max(BAND - widestGap, 1) / total;
  const placed = new Map<string, PlacedNode & { outAt: number; inAt: number }>();

  for (let depth = 0; depth < COLS.length; depth += 1) {
    const column = nodes.filter((n) => n.depth === depth);
    if (!column.length) continue;
    const stackH =
      column.reduce((sum, n) => sum + Math.max(n.value * scale, MIN_BLOCK_H), 0) +
      GAP * (column.length - 1);
    let y = PAD_T + (BAND - stackH) / 2;
    for (const n of column) {
      // The value is taken AS GIVEN. It is the node's inflow, summed by the
      // server from the same links drawn below, so the picture cannot disagree
      // with its own edges.
      const h = Math.max(n.value * scale, MIN_BLOCK_H);
      placed.set(n.key, { ...n, role: nodeRole(n), x: COLS[depth], y, h, outAt: y, inAt: y });
      y += h + GAP;
    }
  }

  const order = (key: string) => nodes.findIndex((n) => n.key === key);
  const routed: PlacedLink[] = [];
  for (const link of [...links].sort((a, b) => order(a.target) - order(b.target))) {
    const s = placed.get(link.source);
    const t = placed.get(link.target);
    if (!s || !t) continue;
    const th = Math.max(link.value * scale, MIN_THICKNESS);
    const role = linkRole(s, t);
    const sy = s.outAt;
    const ty = t.inAt;
    s.outAt += th;
    t.inAt += th;
    routed.push({
      ...link,
      role,
      d: ribbon(s.x + BLOCK, sy, t.x, ty, th),
      // Only the off-path strands get a direct label: they are the finding, and
      // they are the thinnest ribbons on the page.
      //
      // ⚠️ Right-anchored in the gap immediately BEFORE the target, not at the
      // ribbon's midpoint. A spanning strand (scanned → applied crosses a whole
      // column) has its midpoint sitting on top of that column's blocks, which
      // is exactly where it collided with "Stopped after scanning" in a browser.
      // The gap before a column is the one strip guaranteed to hold no block.
      labelX: role === "offpath" ? t.x - LABEL_GUTTER : null,
      labelY: role === "offpath" ? (sy + ty) / 2 + th / 2 - 7 : null,
      sourceLabel: s.label,
      targetLabel: t.label,
    });
  }

  return {
    nodes: [...placed.values()].map(({ outAt: _o, inAt: _i, ...n }) => n),
    links: routed,
    width: W,
    height: PAD_T + BAND + PAD_B,
    columns: COLUMN_LABELS.map((label, i) => ({ label, x: COLS[i] })),
    blockWidth: BLOCK,
  };
}

/**
 * A stage's rate, or null when the backend suppressed it.
 *
 * A separate helper so the "null means suppressed, never zero" rule is one
 * decision rather than a `?? 0` waiting to be typed at each call site.
 */
export function rateLabel(pct: number | null | undefined): string | null {
  return typeof pct === "number" && Number.isFinite(pct) ? `${pct}%` : null;
}
