import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { TailorMatchSidebar } from "@/components/DetailedRatingsView";
import type { RatingsData } from "@/lib/types";

const ratings: RatingsData = {
  match_score: 55,
  criteria: [],
  whats_working: ["Strong React/Vue experience"],
  gaps: ["Flask", "Terraform"],
  verdict: "Solid but missing a few named tools.",
  overall_score: 55,
  job_title: { matched: true, jd_title: "Senior Full Stack Software Developer", resume_title: "Senior Full Stack Software Developer", score: 100, detail: "Exact match" },
  qualifications: {
    score: 44,
    covered: [{ text: "5+ years full-stack", status: "verified_covered" }],
    missing: [{ text: "Flask", status: "missing" }, { text: "Terraform", status: "missing" }],
  },
  responsibilities: {
    score: 33,
    covered: [{ text: "Own data modeling", status: "verified_covered" }],
    missing: [{ text: "Mentor junior engineers", status: "missing" }],
  },
  keywords: { found_count: 7, total_count: 24, missing: ["Flask", "SQLAlchemy"] },
};

describe("TailorMatchSidebar — redesigned score card + grouped nav", () => {
  it("renders the persistent score card with an honest qualitative label (no invented delta/target)", () => {
    const { getByText, container } = render(
      <TailorMatchSidebar ratings={ratings} activeTab="job_title" onActiveTabChange={() => {}} />,
    );
    expect(getByText("Match score")).toBeTruthy();
    expect(getByText("Fair")).toBeTruthy(); // 55 → Fair
    expect(getByText("How well this résumé covers the job")).toBeTruthy();
    // No fabricated "target"/"was" numbers.
    expect(container.textContent).not.toMatch(/target/i);
    expect(container.textContent).not.toMatch(/\bwas\s+\d/i);
    // The score appears (in the ring).
    expect(container.textContent).toContain("55");
  });

  it("groups the dimensions into Beat the ATS / Beat the human", () => {
    const { getByText } = render(
      <TailorMatchSidebar ratings={ratings} activeTab="overall" onActiveTabChange={() => {}} />,
    );
    expect(getByText("Beat the ATS")).toBeTruthy();
    expect(getByText("Beat the human")).toBeTruthy();
    // ATS dimensions present.
    expect(getByText("Job Title")).toBeTruthy();
    expect(getByText("Qualifications")).toBeTruthy();
    expect(getByText("Keywords")).toBeTruthy();
    // Human read present.
    expect(getByText("Interview")).toBeTruthy();
  });

  it("clicking a dimension reports it via onActiveTabChange", () => {
    const onActiveTabChange = vi.fn();
    const { getByTitle } = render(
      <TailorMatchSidebar ratings={ratings} activeTab="overall" onActiveTabChange={onActiveTabChange} />,
    );
    fireEvent.click(getByTitle("Qualifications"));
    expect(onActiveTabChange).toHaveBeenCalledWith("qualifications");
  });

  it("shows a mini icon rail when collapsed (score + tab icons, no full labels)", () => {
    const onActiveTabChange = vi.fn();
    const onCollapsedChange = vi.fn();
    const { queryByText, getByTitle, getByLabelText } = render(
      <TailorMatchSidebar
        ratings={ratings}
        activeTab="overall"
        onActiveTabChange={onActiveTabChange}
        collapsed
        onCollapsedChange={onCollapsedChange}
      />,
    );
    expect(queryByText("Match score")).toBeNull();
    expect(queryByText("Beat the ATS")).toBeNull();
    expect(getByTitle("Qualifications · 1/3")).toBeTruthy();
    fireEvent.click(getByTitle("Qualifications · 1/3"));
    expect(onActiveTabChange).toHaveBeenCalledWith("qualifications");
    fireEvent.click(getByLabelText("Expand match sidebar"));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});
