import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import PricingPlans from "@/components/PricingPlans";
import {
  FREE_SCAN_DAILY_LIMIT,
  PRO_SCAN_DAILY_LIMIT,
  FREE_INTERVIEW_DAILY_LIMIT,
  PRO_INTERVIEW_DAILY_LIMIT,
} from "@/components/UpgradeDialog";

const createCheckoutSession = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/billingApi", () => ({
  PLAN_PRICE_LABELS: {
    pro_weekly: {
      title: "Pro Weekly",
      price: "$4.99",
      cadence: "per week, billed weekly",
      note: "$21.6/mo if you keep it weekly",
      nudgeTo: "pro_monthly",
      nudgeLabel: "Monthly is $19, saves 12%",
    },
    pro_monthly: {
      title: "Pro Monthly",
      price: "$19",
      cadence: "per month, billed monthly",
      note: "$13/mo, save 32%",
      nudgeTo: "pro_quarterly",
      nudgeLabel: "Quarterly is $13/mo, save 32%",
    },
    pro_quarterly: {
      title: "Pro Quarterly",
      price: "$39",
      cadence: "billed every 3 months",
      note: "$13/mo, save 32%",
    },
  },
  createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
}));

beforeEach(() => {
  createCheckoutSession.mockReset();
  createCheckoutSession.mockResolvedValue({ error: "checkout_unavailable" });
});

describe("PricingPlans billing toggle", () => {
  it("starts on monthly and shows that price", () => {
    render(<PricingPlans />);
    expect(screen.getByText("$19")).toBeTruthy();
    expect(screen.queryByText("$39")).toBeNull();
    expect(screen.getByRole("button", { name: "Monthly" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("switches the displayed price and pressed state to quarterly", () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    expect(screen.getByText("$39")).toBeTruthy();
    expect(screen.queryByText("$19")).toBeNull();
    expect(screen.getByRole("button", { name: "Quarterly" }).getAttribute("aria-pressed")).toBe("true");
  });

  /** The toggle exists to pick a Stripe price key. If checkout is always
   *  started with the default the UI is a decoration, and the user is billed
   *  for a plan they did not choose — so assert the ARGUMENT, not the click. */
  it("starts checkout with the selected price key, not the default", async () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro/ }));
    });
    expect(createCheckoutSession).toHaveBeenCalledWith("pro_quarterly");
  });

  it("uses the monthly key when monthly is selected", async () => {
    render(<PricingPlans />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro/ }));
    });
    expect(createCheckoutSession).toHaveBeenCalledWith("pro_monthly");
  });

  /** Every limit on this public page is interpolated from the constants, so a
   *  limit change can never leave a stale number in front of a paying user. */
  it("states the free→Pro deltas from the limit constants", () => {
    render(<PricingPlans />);
    expect(screen.getAllByText(`${FREE_SCAN_DAILY_LIMIT} → ${PRO_SCAN_DAILY_LIMIT} a day`).length).toBe(2);
    expect(
      screen.getByText(`${FREE_INTERVIEW_DAILY_LIMIT} → ${PRO_INTERVIEW_DAILY_LIMIT} a day`),
    ).toBeTruthy();
  });
});

describe("PricingPlans weekly period", () => {
  /** Regression. The cadence line used to be
   *  `selected === "pro_monthly" ? "per month…" : "billed every 3 months"`,
   *  which told a weekly buyer they were billed quarterly directly beneath a
   *  weekly price. Pin the line to the selected label. */
  it("states the selected period's own cadence", () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByText("per week, billed weekly")).toBeTruthy();
    expect(screen.queryByText("billed every 3 months")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    expect(screen.getByText("billed every 3 months")).toBeTruthy();
    expect(screen.queryByText("per week, billed weekly")).toBeNull();
  });

  it("shows the weekly price and is billed the weekly key", async () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByText("$4.99")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weekly" }).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro/ }));
    });
    expect(createCheckoutSession).toHaveBeenCalledWith("pro_weekly");
  });

  /** Weekly is priced above the monthly run rate, so the panel has to admit
   *  it. A reader who sees only "$4.99" reasonably assumes it is the deal. */
  it("points a weekly reader at the cheaper monthly option", () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    fireEvent.click(screen.getByText("Monthly is $19, saves 12%"));
    expect(screen.getByText("$19")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Monthly" }).getAttribute("aria-pressed")).toBe("true");
  });

  /** The longest period has nothing better to point at, so its claim renders
   *  as text and the chip must be absent, not a chip switching to itself. */
  it("shows quarterly's value claim as text, with no nudge chip", () => {
    render(<PricingPlans />);
    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    expect(screen.getByText("$13/mo, save 32%").tagName).toBe("P");
    expect(screen.queryByText("Quarterly is $13/mo, save 32%")).toBeNull();
  });
});
