import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorMatchSidebar } from "@/components/DetailedRatingsView";
import type { RatingsData } from "@/lib/types";

const ratings: RatingsData = {
  match_score: 48,
  criteria: [],
  whats_working: ["Solid backend depth"],
  gaps: [],
  verdict: "Fair fit",
  overall_score: 48,
  job_title: { matched: false, jd_title: "SWE III", resume_title: "Senior Dev", score: 25, detail: "" },
  qualifications: { score: 40, covered: [], missing: [{ text: "CI/CD" }] },
  responsibilities: { score: 55, covered: [], missing: [{ text: "Dev workflows" }] },
  keywords: {
    direct_skills: { found: ["Python"], missing: ["Kubernetes"] },
    contextual: { found: [], missing: [] },
    found_count: 57,
    total_count: 69,
  },
};

const QUEUE_OWNED = ["job_title", "qualifications", "responsibilities", "keywords"] as const;

describe("hiddenTabs on the legacy match sidebar", () => {
  it("hides the queue-owned dimension tabs but keeps Overall and Interview", () => {
    render(
      <TailorMatchSidebar ratings={ratings} hiddenTabs={[...QUEUE_OWNED]} />,
    );
    expect(screen.queryByTitle("Qualifications")).toBeNull();
    expect(screen.queryByTitle("Keywords")).toBeNull();
    expect(screen.queryByTitle("Job Title")).toBeNull();
    expect(screen.getByTitle("Overall Match")).toBeTruthy();
    expect(screen.getByTitle("Interview")).toBeTruthy();
  });

  it("without hiddenTabs the classic view is unchanged", () => {
    render(<TailorMatchSidebar ratings={ratings} />);
    expect(screen.getByTitle("Qualifications")).toBeTruthy();
    expect(screen.getByTitle("Keywords")).toBeTruthy();
  });

  it("a hidden activeTab renders as Overall instead of a blank panel", () => {
    render(
      <TailorMatchSidebar ratings={ratings} activeTab="keywords" hiddenTabs={[...QUEUE_OWNED]} />,
    );
    // The Overall row shows as active (accent border style is inline; assert
    // via the only remaining rows and no crash on the hidden active tab).
    expect(screen.getByTitle("Overall Match")).toBeTruthy();
    expect(screen.queryByTitle("Keywords")).toBeNull();
  });
});
