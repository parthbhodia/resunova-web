import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import TailorAnalyzingLoader from "@/components/TailorAnalyzingLoader";

describe("TailorAnalyzingLoader", () => {
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
});
