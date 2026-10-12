/**
 * What the Usage & limits panel is allowed to claim.
 *
 * The endpoints report numbers; this decides what the rows may say about them.
 * Same split as `analysis/percentile.py` on the API side — the counter counts,
 * and a separate pure layer decides what a count is allowed to assert.
 *
 * ⚠️ THE GROUPING IS THE HONESTY. The reference design this was comped against
 * showed seven metered rows with gauges. Resunova enforces ONE through the
 * access gate (`RESUME_SCAN`, three routes) and one more inside its handler
 * (interview prep). `AI_REWRITE` across ten routes, `RESUME_EXPORT` on two,
 * `JD_TAILOR`, and both interview-prep gate entries are `enforced=False`.
 * Drawing seven gauges would advertise scarcity this product does not
 * implement, so everything else says Unlimited — which is true today and is
 * better news than invented scarcity.
 */

import {
  FREE_INTERVIEW_DAILY_LIMIT,
  FREE_SCAN_DAILY_LIMIT,
  PRO_INTERVIEW_DAILY_LIMIT,
  PRO_SCAN_DAILY_LIMIT,
} from "./planLimits";

/**
 * One account's standing on one metered action.
 *
 * `unknown` is its own member and not folded into `unlimited`: both carry no
 * usable count, and reading one as the other is the difference between "scan
 * freely" and "we could not find out". That conflation is exactly what the
 * nav's `catch {}` used to ship.
 */
export type MeterReading =
  | { kind: "metered"; used: number; limit: number; resetAt: string | null }
  | { kind: "unlimited"; plan: string | null }
  | { kind: "unknown" };

export type UsageMeter =
  | { kind: "metered"; used: number; limit: number; atLimit: boolean; fillPct: number }
  | { kind: "unlimited" }
  /** Not on this plan; Pro has it. */
  | { kind: "pro_only" }
  /** Was Pro-only, and this account is Pro. */
  | { kind: "included" }
  | { kind: "unknown" };

export type UsageRow = {
  key: string;
  name: string;
  desc: string;
  meter: UsageMeter;
  /** What upgrading would change, where that is true and not already true. */
  remedy?: string;
};

export type UsageGroup = { label: string; caption?: string; rows: UsageRow[] };

export type UsagePanel = {
  /** "Free" when nothing names a plan — metered with no plan IS the free tier. */
  planName: string;
  groups: UsageGroup[];
  /**
   * Whether to offer the upgrade.
   *
   * ONE predicate, shared with the reset note, so a Pro / university / admin
   * account cannot be shown a dead CTA next to a row that says Unlimited —
   * the same rule the nav rail's quota pill and Upgrade action already share.
   */
  showUpgrade: boolean;
  /** Only when something actually resets. */
  resetNote: string | null;
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Normalize either limit-status endpoint. They share a response shape on
 * purpose, so one mapper serves both rather than two that can drift.
 */
export function meterFromStatus(body: unknown): MeterReading {
  if (!body || typeof body !== "object") return { kind: "unknown" };
  const b = body as Record<string, unknown>;
  const plan = typeof b.plan === "string" && b.plan.trim() ? b.plan : null;

  if (b.unlimited === true) return { kind: "unlimited", plan };
  // Not enforced for this caller at all — nothing metered, nothing to show.
  if (b.enforced !== true) return { kind: "unlimited", plan };

  const limit = num(b.limit);
  if (limit == null || limit <= 0) return { kind: "unknown" };
  const used = num(b.used) ?? (num(b.remaining) != null ? limit - (num(b.remaining) as number) : null);
  if (used == null) return { kind: "unknown" };

  return {
    kind: "metered",
    used: Math.max(0, used),
    limit,
    resetAt: typeof b.resetAt === "string" ? b.resetAt : null,
  };
}

/**
 * ⚠️ NO "OVER LIMIT" STATE, because ours is unreachable: the access gate
 * refuses the request AT the limit, so a 4-of-3 cannot be produced. The
 * reference drew that condition in red; inventing it here would be drawing
 * something the backend makes impossible.
 *
 * What this does NOT do is fake the number. If a payload ever did say 4 of 3 —
 * a policy change, a contract break — the count renders as 4 of 3, because
 * clamping it would hide a real defect. Only the BAR is capped, since a bar
 * cannot be more than full.
 */
function toMeter(reading: MeterReading): UsageMeter {
  if (reading.kind === "unknown") return { kind: "unknown" };
  if (reading.kind === "unlimited") return { kind: "unlimited" };
  const { used, limit } = reading;
  return {
    kind: "metered",
    used,
    limit,
    atLimit: used >= limit,
    fillPct: Math.min(100, Math.round((used / limit) * 100)),
  };
}

function planNameFor(scans: MeterReading, prep: MeterReading): string {
  for (const r of [scans, prep]) {
    const plan = r.kind === "unlimited" ? r.plan : null;
    if (plan === "pro") return "Pro";
    if (plan === "institution") return "University";
    if (plan === "admin") return "Admin";
  }
  // A metered reading carries no plan on the free tier — the API omits it —
  // so metered-and-unnamed IS free, not unknown.
  if (scans.kind === "metered" || prep.kind === "metered") return "Free";
  if (scans.kind === "unlimited" || prep.kind === "unlimited") return "Unlimited";
  return "Free";
}

function isPro(planName: string): boolean {
  return planName === "Pro" || planName === "Admin";
}

export function buildUsagePanel(scans: MeterReading, prep: MeterReading): UsagePanel {
  const planName = planNameFor(scans, prep);
  const scanMeter = toMeter(scans);
  const prepMeter = toMeter(prep);

  const metered: UsageRow[] = [
    {
      key: "resume_scan",
      name: "Résumé scans",
      desc:
        "A full report: score, keyword coverage and per-bullet fixes. Re-opening a saved report is free.",
      meter: scanMeter,
      remedy:
        scanMeter.kind === "metered" && scanMeter.limit < PRO_SCAN_DAILY_LIMIT
          ? `Pro raises this to ${PRO_SCAN_DAILY_LIMIT} a day`
          : undefined,
    },
    {
      key: "interview_prep",
      name: "Interview prep",
      desc:
        "Question sets built from your résumé and a posting. Re-opening a saved kit is free.",
      meter: prepMeter,
      remedy:
        prepMeter.kind === "metered" && prepMeter.limit < PRO_INTERVIEW_DAILY_LIMIT
          ? `Pro raises this to ${PRO_INTERVIEW_DAILY_LIMIT} a day`
          : undefined,
    },
  ];

  /**
   * Stated, not omitted. On the free plan four of the things a competitor
   * meters are uncapped here, and saying so plainly is a stronger argument
   * than a gauge nobody can fill.
   */
  const unlimited: UsageRow[] = [
    {
      key: "tailor",
      name: "Tailor to a job",
      desc: "Paste a posting, see what's missing, and weave the gaps into your own bullets.",
      meter: { kind: "unlimited" },
    },
    {
      key: "rewrites",
      name: "AI bullet rewrites",
      desc: "Every suggested rewrite on the Analyze and Tailor pages.",
      meter: { kind: "unlimited" },
    },
    {
      key: "exports",
      name: "PDF & DOCX exports",
      desc: "Download any résumé or cover letter, as many times as you like.",
      meter: { kind: "unlimited" },
    },
    {
      key: "templates",
      name: "Templates & builder",
      desc: "Every template, and the builder itself. No account needed for the builder.",
      meter: { kind: "unlimited" },
    },
  ];

  const proOnly: UsageRow[] = [
    {
      key: "contacts",
      name: "Hiring contacts",
      desc: "The recruiter or HR address attached to a posting, where we have one.",
      // POLICY_V1 SPONSOR_CONTACTS: anon denied, free denied-with-upgrade,
      // Pro allowed. So on Pro this is not a locked row, it is an included one.
      meter: isPro(planName) ? { kind: "included" } : { kind: "pro_only" },
    },
  ];

  const anythingMetered = scanMeter.kind === "metered" || prepMeter.kind === "metered";

  const resetAt =
    (scans.kind === "metered" ? scans.resetAt : null) ??
    (prep.kind === "metered" ? prep.resetAt : null);

  const groups: UsageGroup[] = [
    { label: "Metered", caption: anythingMetered ? "resets daily" : undefined, rows: metered },
    { label: "Included, with no limit", rows: unlimited },
    { label: isPro(planName) ? "Included with Pro" : "On Pro", rows: proOnly },
  ];

  return {
    planName,
    groups,
    showUpgrade: anythingMetered && !isPro(planName) && planName !== "University",
    resetNote: anythingMetered ? (resetAt ? "Counters reset at midnight UTC." : "Counters reset daily.") : null,
  };
}

/** Free-tier caps, for any surface that wants to name them without a round trip. */
export const FREE_CAPS = {
  scans: FREE_SCAN_DAILY_LIMIT,
  prep: FREE_INTERVIEW_DAILY_LIMIT,
};
