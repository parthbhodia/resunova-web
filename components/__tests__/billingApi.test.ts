import { describe, expect, it } from "vitest";
import { PLAN_PRICE_LABELS, describeBillingStatus, type BillingStatus } from "@/lib/billingApi";

function status(over: Partial<BillingStatus>): BillingStatus {
  return {
    plan: "pro",
    status: "active",
    priceKey: "pro_monthly",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2026-08-01T00:00:00+00:00",
    trialEnd: null,
    portalAvailable: true,
    checkoutEnabled: true,
    scan: null,
    ...over,
  };
}

describe("describeBillingStatus", () => {
  it("null / free → Free plan", () => {
    expect(describeBillingStatus(null)).toBe("Free plan");
    expect(describeBillingStatus(status({ plan: "free", status: null }))).toBe("Free plan");
  });

  it("active pro shows a renewal date", () => {
    expect(describeBillingStatus(status({}))).toMatch(/^Pro — renews /);
  });

  it("cancel at period end shows an end date, not renewal", () => {
    expect(describeBillingStatus(status({ cancelAtPeriodEnd: true }))).toMatch(/^Pro — ends /);
  });

  it("past_due surfaces the payment issue", () => {
    expect(describeBillingStatus(status({ status: "past_due" }))).toContain("payment issue");
  });

  it("trialing labels the trial", () => {
    expect(describeBillingStatus(status({ status: "trialing" }))).toContain("Pro trial");
  });

  it("invalid period end still renders a label without crashing", () => {
    expect(describeBillingStatus(status({ currentPeriodEnd: "not-a-date" }))).toBe("Pro");
  });
});

describe("PLAN_PRICE_LABELS", () => {
  it("covers exactly the three live price keys", () => {
    expect(Object.keys(PLAN_PRICE_LABELS).sort()).toEqual(["pro_monthly", "pro_quarterly", "pro_weekly"]);
  });

  /** The weekly rate is above the monthly one on purpose. If someone "fixes"
   *  that by dropping weekly, the chip claiming "Monthly is $19, saves 12%"
   *  becomes a lie, so pin the relationship rather than the prose. */
  it("prices weekly above the monthly run rate", () => {
    const weekly = Number(PLAN_PRICE_LABELS.pro_weekly.price.replace("$", ""));
    const monthly = Number(PLAN_PRICE_LABELS.pro_monthly.price.replace("$", ""));
    expect(weekly * (52 / 12)).toBeGreaterThan(monthly);
    expect(PLAN_PRICE_LABELS.pro_weekly.nudgeTo).toBe("pro_monthly");
  });

  /** Only the longest period may omit a nudge: no longer period exists to
   *  point at, so its value claim has to stand on its own. */
  it("nudges every period except the longest", () => {
    expect(PLAN_PRICE_LABELS.pro_weekly.nudgeTo).toBeDefined();
    expect(PLAN_PRICE_LABELS.pro_monthly.nudgeTo).toBeDefined();
    expect(PLAN_PRICE_LABELS.pro_quarterly.nudgeTo).toBeUndefined();
    expect(PLAN_PRICE_LABELS.pro_quarterly.note).toBeTruthy();
  });

  /** Every nudge must name a real key. A typo here is silent: the chip simply
   *  never renders and the reader loses the only value comparison. */
  it("points every nudge at a key that exists", () => {
    for (const [key, label] of Object.entries(PLAN_PRICE_LABELS)) {
      if (label.nudgeTo === undefined) continue;
      expect(Object.keys(PLAN_PRICE_LABELS)).toContain(label.nudgeTo);
      expect(label.nudgeLabel, `${key} needs nudge copy`).toBeTruthy();
      expect(label.nudgeTo).not.toBe(key);
    }
  });
});
