import { describe, expect, it } from "vitest";
import {
  buildUsagePanel,
  meterFromStatus,
  type MeterReading,
} from "@/lib/usagePanel";
import {
  PRO_INTERVIEW_DAILY_LIMIT,
  PRO_SCAN_DAILY_LIMIT,
} from "@/lib/planLimits";

const metered = (used: number, limit: number): MeterReading => ({
  kind: "metered",
  used,
  limit,
  resetAt: null,
});
const unlimited = (plan: string | null = null): MeterReading => ({ kind: "unlimited", plan });
const unknown: MeterReading = { kind: "unknown" };

const rowsOf = (p: ReturnType<typeof buildUsagePanel>) => p.groups.flatMap((g) => g.rows);
const row = (p: ReturnType<typeof buildUsagePanel>, key: string) =>
  rowsOf(p).find((r) => r.key === key)!;

describe("meterFromStatus", () => {
  it("reads a metered payload", () => {
    expect(meterFromStatus({ enforced: true, limit: 3, used: 1, remaining: 2 })).toEqual({
      kind: "metered",
      used: 1,
      limit: 3,
      resetAt: null,
    });
  });

  it("derives used from remaining when used is absent", () => {
    const r = meterFromStatus({ enforced: true, limit: 3, remaining: 1 });
    expect(r).toMatchObject({ kind: "metered", used: 2, limit: 3 });
  });

  it("reads an unlimited payload and keeps the plan name", () => {
    expect(meterFromStatus({ enforced: true, unlimited: true, plan: "pro" })).toEqual({
      kind: "unlimited",
      plan: "pro",
    });
  });

  /**
   * ⚠️ `unknown` is NOT folded into `unlimited`. Both carry no usable count,
   * and reading one as the other is the difference between "scan freely" and
   * "we could not find out" — the conflation the nav's `catch {}` used to ship.
   */
  it("reports a numberless enforced payload as unknown, never as unlimited", () => {
    expect(meterFromStatus({ enforced: true }).kind).toBe("unknown");
    expect(meterFromStatus({ enforced: true, limit: 0 }).kind).toBe("unknown");
    expect(meterFromStatus(null).kind).toBe("unknown");
    expect(meterFromStatus("nope").kind).toBe("unknown");
  });
});

describe("the plan name", () => {
  /** Ported from ScanUsageWidget's tests — this is where that mapping lives now. */
  it("metered with no named plan is Free", () => {
    expect(buildUsagePanel(metered(1, 3), metered(0, 2)).planName).toBe("Free");
  });

  it("institution reads University, not Free", () => {
    expect(buildUsagePanel(unlimited("institution"), unlimited("institution")).planName).toBe("University");
  });

  /**
   * The regression this pins: `unlimited` once hard-coded a UMBC badge, so a
   * paying subscriber was told they were on a university account.
   */
  it("a paying subscriber reads Pro, never Free and never UMBC", () => {
    const p = buildUsagePanel(unlimited("pro"), unlimited("pro"));
    expect(p.planName).toBe("Pro");
    expect(p.planName).not.toBe("University");
  });

  it("admin reads Admin", () => {
    expect(buildUsagePanel(unlimited("admin"), unlimited("admin")).planName).toBe("Admin");
  });

  it("unlimited with no named plan is still not Free", () => {
    expect(buildUsagePanel(unlimited(null), unlimited(null)).planName).toBe("Unlimited");
  });
});

describe("what the rows are allowed to claim", () => {
  /**
   * ⚠️ THE GROUPING IS THE HONESTY. The reference showed seven metered rows.
   * We enforce two. Every other row must say unlimited rather than draw a
   * gauge for a cap that does not exist.
   */
  it("meters exactly the two actions the policy enforces", () => {
    const p = buildUsagePanel(metered(1, 3), metered(0, 2));
    const meteredKeys = rowsOf(p)
      .filter((r) => r.meter.kind === "metered")
      .map((r) => r.key);
    expect(meteredKeys).toEqual(["resume_scan", "interview_prep"]);
  });

  it("states the uncapped features rather than omitting them", () => {
    const p = buildUsagePanel(metered(1, 3), metered(0, 2));
    for (const key of ["tailor", "rewrites", "exports", "templates"]) {
      expect(row(p, key).meter.kind, key).toBe("unlimited");
    }
  });

  /**
   * ⚠️ NO OVER-LIMIT STATE — the gate refuses AT the limit, so 4-of-3 cannot
   * be produced and drawing it would invent a condition. What we also refuse
   * to do is fake the number: a payload that did say 4 of 3 renders 4 of 3,
   * because clamping would hide a real contract break. Only the BAR is capped.
   */
  it("never invents an over-limit state, and never fakes the count either", () => {
    const p = buildUsagePanel(metered(4, 3), metered(0, 2));
    const m = row(p, "resume_scan").meter;
    expect(m).toMatchObject({ kind: "metered", used: 4, limit: 3, atLimit: true, fillPct: 100 });
    expect(rowsOf(p).every((r) => r.meter.kind !== ("over" as never))).toBe(true);
  });

  it("marks at-limit at exactly the limit, not past it", () => {
    const at = row(buildUsagePanel(metered(3, 3), unknown), "resume_scan").meter;
    const under = row(buildUsagePanel(metered(2, 3), unknown), "resume_scan").meter;
    expect(at).toMatchObject({ atLimit: true });
    expect(under).toMatchObject({ atLimit: false });
  });

  /**
   * POLICY_V1 SPONSOR_CONTACTS: anon denied, free denied-with-upgrade, Pro
   * allowed. So on Pro this is an included row, not a locked one — a paying
   * account must not be shown its own feature as a thing to buy.
   */
  it("flips the Pro-only row to included on a Pro plan", () => {
    expect(row(buildUsagePanel(metered(1, 3), metered(0, 2)), "contacts").meter.kind).toBe("pro_only");
    expect(row(buildUsagePanel(unlimited("pro"), unlimited("pro")), "contacts").meter.kind).toBe("included");
  });

  it("carries an unknown reading through as unknown", () => {
    expect(row(buildUsagePanel(unknown, unknown), "resume_scan").meter.kind).toBe("unknown");
  });
});

describe("the upgrade offer", () => {
  /**
   * ⚠️ ONE PREDICATE. A Pro / university / admin account must never see a dead
   * CTA next to a row that says Unlimited — the same rule the nav rail's quota
   * pill and Upgrade action already share.
   */
  it("is offered on a metered free plan", () => {
    expect(buildUsagePanel(metered(1, 3), metered(0, 2)).showUpgrade).toBe(true);
  });

  it.each([["pro"], ["admin"], ["institution"]])("is never offered on %s", (plan) => {
    expect(buildUsagePanel(unlimited(plan), unlimited(plan)).showUpgrade).toBe(false);
  });

  it("is not offered when we could not read the account", () => {
    expect(buildUsagePanel(unknown, unknown).showUpgrade).toBe(false);
  });

  /** A remedy that is already true is not a remedy. */
  it("names what Pro changes, and only where it would change something", () => {
    const free = buildUsagePanel(metered(1, 3), metered(0, 2));
    expect(row(free, "resume_scan").remedy).toContain(String(PRO_SCAN_DAILY_LIMIT));
    expect(row(free, "interview_prep").remedy).toContain(String(PRO_INTERVIEW_DAILY_LIMIT));

    const pro = buildUsagePanel(metered(1, PRO_SCAN_DAILY_LIMIT), metered(0, PRO_INTERVIEW_DAILY_LIMIT));
    expect(row(pro, "resume_scan").remedy).toBeUndefined();
    expect(row(pro, "interview_prep").remedy).toBeUndefined();
  });

  it("says nothing resets when nothing is metered", () => {
    expect(buildUsagePanel(unlimited("pro"), unlimited("pro")).resetNote).toBeNull();
    expect(buildUsagePanel(metered(1, 3), unknown).resetNote).toMatch(/reset/i);
  });
});
