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
  it("covers exactly the two live price keys", () => {
    expect(Object.keys(PLAN_PRICE_LABELS).sort()).toEqual(["pro_monthly", "pro_quarterly"]);
  });
});
