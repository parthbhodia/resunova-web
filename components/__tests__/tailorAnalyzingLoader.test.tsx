import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import TailorAnalyzingLoader from "@/components/TailorAnalyzingLoader";

describe("TailorAnalyzingLoader", () => {
  it("renders the analysing header and all pipeline steps", () => {
    const { getByText, container } = render(<TailorAnalyzingLoader />);
    expect(getByText("Analysing your résumé")).toBeTruthy();
    for (const label of ["Reading your résumé", "Scoring the match", "Finding gaps & keywords", "Preparing your fixes"]) {
      expect(getByText(label)).toBeTruthy();
    }
    // Accessible live region for screen readers.
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });
});
