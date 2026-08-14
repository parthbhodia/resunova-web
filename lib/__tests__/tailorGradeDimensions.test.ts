import { describe, expect, it } from "vitest";
import { gradeDimensions } from "@/lib/tailorGradeDimensions";
import type { RatingsData } from "@/lib/types";

const detailed = {
  match_score: 48,
  overall_score: 48,
  job_title: { matched: false, jd_title: "SWE", resume_title: "Dev", score: 67, detail: "" },
  qualifications: { score: 40, covered: [], missing: [] },
  responsibilities: { score: 55, covered: [], missing: [] },
  keywords: { direct_skills: { found: [], missing: [] }, contextual: { found: [], missing: [] }, found_count: 0, total_count: 0 },
  whats_working: [],
  gaps: [],
  verdict: "",
} as unknown as RatingsData;

describe("gradeDimensions", () => {
  it("derives the rater's three sub-scores", () => {
    expect(gradeDimensions(detailed)).toEqual([
      { label: "Qualifications", score: 40 },
      { label: "Responsibilities", score: 55 },
      { label: "Title", score: 67 },
    ]);
  });

  it("never invents a keywords dimension", () => {
    // The deterministic keyword coverage IS the ATS match block; repeating it
    // under the LLM grade would blend the two provenances the card separates.
    const labels = gradeDimensions(detailed).map((d) => d.label);
    expect(labels).not.toContain("Keywords");
  });

  it("skips a dimension whose score is missing rather than printing NaN", () => {
    const partial = {
      ...detailed,
      responsibilities: { covered: [], missing: [] },
    } as unknown as RatingsData;
    expect(gradeDimensions(partial).map((d) => d.label)).toEqual(["Qualifications", "Title"]);
  });

  it("returns nothing for a non-detailed ratings payload", () => {
    const slim = { match_score: 50, criteria: [], whats_working: [], gaps: [], verdict: "" } as unknown as RatingsData;
    expect(gradeDimensions(slim)).toEqual([]);
    expect(gradeDimensions(null)).toEqual([]);
  });
});
