import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { AnalyzeSidebarPinned } from "@/components/analyze/AnalyzeSidebar";
import type { AnalysisResult } from "@/components/analyze/analyzeTypes";

/* M2: the edit affordance must be discoverable at the moment of score. */

const RESULT = {
  overallScore: 72,
  categoryScores: {},
  experienceSummary: undefined,
} as unknown as AnalysisResult;

describe("AnalyzeSidebarPinned — edit at the moment of score", () => {
  it("renders the Edit résumé button beside the score and fires the handler", () => {
    const onEdit = vi.fn();
    const { getByText } = render(
      <AnalyzeSidebarPinned result={RESULT} onEditResume={onEdit} />,
    );
    const btn = getByText(/Edit résumé/);
    fireEvent.click(btn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("switches to concept-free re-entry copy when an edited version exists", () => {
    const { getByText, queryByText } = render(
      <AnalyzeSidebarPinned result={RESULT} onEditResume={vi.fn()} hasEditedVersion />,
    );
    expect(getByText(/Keep editing/)).toBeTruthy();
    expect(getByText("Your edited résumé is saved")).toBeTruthy();
    // no "version" vocabulary anywhere user-visible
    expect(queryByText(/version/i)).toBeNull();
  });

  it("renders no edit affordance without a result (pre-scan rail)", () => {
    const { queryByText } = render(
      <AnalyzeSidebarPinned result={null} onEditResume={vi.fn()} />,
    );
    expect(queryByText(/Edit résumé/)).toBeNull();
  });
});
