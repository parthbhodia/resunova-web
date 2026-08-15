import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import TailorAnalyzingLoader, { TAILOR_ANALYZING_TIPS } from "@/components/TailorAnalyzingLoader";

describe("TailorAnalyzingLoader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("describes the work without claiming fake completed stages", () => {
    const { getByText, container } = render(<TailorAnalyzingLoader />);
    expect(getByText("Matching your résumé to this job")).toBeTruthy();
    for (const label of ["Reading your résumé", "Scoring the match", "Finding gaps & keywords"]) {
      expect(getByText(label)).toBeTruthy();
    }
    expect(container.querySelector('[aria-label="applied"]')).toBeNull();
    // Accessible live region for screen readers.
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it("rotates a coach tip below the steps every 5s, never repeating back-to-back", () => {
    // Founder-directed 2026-08-15: this scan runs 30-65s and used to show
    // nothing but static step cards and a seconds counter — the one loader
    // with no tips at all was the one users watch longest.
    vi.useFakeTimers();
    const { container } = render(<TailorAnalyzingLoader />);
    const tipText = () => container.querySelector('[data-testid="loader-tip"]')?.textContent ?? "";
    const first = tipText();
    expect(TAILOR_ANALYZING_TIPS.some((t) => first.includes(t))).toBe(true);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const second = tipText();
    expect(second).not.toBe(first);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // The no-repeat property is what makes "randomly changing" visible: any
    // tick that keeps the same tip reads as the loader being stuck.
    expect(tipText()).not.toBe(second);
  });
});
