import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { TailorMatchDetail } from "@/components/DetailedRatingsView";
import type { RatingsData } from "@/lib/types";

const ratings: RatingsData = {
  match_score: 55,
  criteria: [],
  whats_working: ["Strong React/Vue experience"],
  gaps: ["Flask"],
  verdict: "Solid but missing a few named tools.",
  overall_score: 55,
  job_title: { matched: true, jd_title: "Senior Full Stack Software Developer", resume_title: "Senior Full Stack Software Developer", score: 100, detail: "Exact match" },
  qualifications: { score: 44, covered: [{ text: "5+ years", status: "verified_covered" }], missing: [{ text: "Flask", status: "missing" }] },
  responsibilities: { score: 33, covered: [], missing: [{ text: "Mentor", status: "missing" }] },
  keywords: { found_count: 7, total_count: 24, missing: ["Flask"] },
};

describe("TailorMatchDetail — guided stepper", () => {
  it("shows the step position and a labelled Next for the current dimension", () => {
    const { getByText } = render(
      <TailorMatchDetail ratings={ratings} activeTab="job_title" onActiveTabChange={() => {}} />,
    );
    // overall, job_title, qualifications, responsibilities, keywords, interview = 6
    expect(getByText("Step 2 of 6")).toBeTruthy();
    expect(getByText("Next: Qualifications ›")).toBeTruthy();
  });

  it("Next advances to the following dimension", () => {
    const onActiveTabChange = vi.fn();
    const { getByText } = render(
      <TailorMatchDetail ratings={ratings} activeTab="job_title" onActiveTabChange={onActiveTabChange} />,
    );
    fireEvent.click(getByText("Next: Qualifications ›"));
    expect(onActiveTabChange).toHaveBeenCalledWith("qualifications");
  });

  it("Back is hidden on the first step and present later", () => {
    const first = render(
      <TailorMatchDetail ratings={ratings} activeTab="overall" onActiveTabChange={() => {}} />,
    );
    // Back exists in the DOM but is visually hidden on step 1.
    const back1 = first.getByText("‹ Back") as HTMLElement;
    expect(back1.style.visibility).toBe("hidden");
    first.unmount();

    const later = render(
      <TailorMatchDetail ratings={ratings} activeTab="keywords" onActiveTabChange={() => {}} />,
    );
    const back2 = later.getByText("‹ Back") as HTMLElement;
    expect(back2.style.visibility).toBe("visible");
  });

  it("last guided step offers Back to Overview instead of Next", () => {
    const onActiveTabChange = vi.fn();
    const { getByText, queryByText } = render(
      <TailorMatchDetail ratings={ratings} activeTab="interview" onActiveTabChange={onActiveTabChange} />,
    );
    expect(queryByText(/^Next:/)).toBeNull();
    fireEvent.click(getByText("Back to Overview"));
    expect(onActiveTabChange).toHaveBeenCalledWith("overall");
  });
});
