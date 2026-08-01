import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DIMENSION_KINDS, TailorDimensionChips } from "@/components/tailor/TailorDimensionChips";
import { findAppliedBulletIndex } from "@/lib/resumeBulletMatch";
import type { RatingsData } from "@/lib/types";

const ratings: RatingsData = {
  match_score: 48,
  criteria: [],
  whats_working: [],
  gaps: [],
  verdict: "Fair fit",
  overall_score: 48,
  job_title: {
    matched: false,
    jd_title: "Software Engineer III",
    resume_title: "Senior Fullstack Developer",
    score: 25,
    detail: "",
  },
  qualifications: {
    score: 40,
    covered: [
      { text: "5+ years production software", context: "Senior full-stack engineer shipping LLM systems", locations: 2 },
    ],
    missing: [{ text: "CI/CD pipeline experience", analysis: "" }],
  },
  responsibilities: { score: 55, covered: [], missing: [{ text: "Improve developer workflows" }] },
  keywords: {
    direct_skills: { found: ["Python"], missing: ["Kubernetes"] },
    contextual: { found: [], missing: ["advertisers"] },
    found_count: 57,
    total_count: 69,
  },
};

describe("TailorDimensionChips", () => {
  it("renders the four dimension chips with real counts", () => {
    render(<TailorDimensionChips ratings={ratings} active={null} onPick={() => undefined} />);
    expect(screen.getByText("Title").parentElement?.textContent).toContain("25%");
    expect(screen.getByText("Qualifications").parentElement?.textContent).toContain("1/2");
    expect(screen.getByText("Keywords").parentElement?.textContent).toContain("57/69");
    // No drawer until a chip is active.
    expect(screen.queryByTestId("dimension-evidence")).toBeNull();
  });

  it("active qualification chip opens evidence with the resume line quoted", () => {
    render(<TailorDimensionChips ratings={ratings} active="qualification" onPick={() => undefined} />);
    const drawer = screen.getByTestId("dimension-evidence");
    expect(drawer.textContent).toContain("you have 1 of 2");
    expect(drawer.textContent).toContain("Senior full-stack engineer shipping LLM systems");
    expect(drawer.textContent).toContain("(2 places)");
    expect(drawer.textContent).toContain("CI/CD pipeline experience");
  });

  it("clicking the active chip releases the filter (second click = All)", () => {
    const onPick = vi.fn();
    render(<TailorDimensionChips ratings={ratings} active="keyword" onPick={onPick} />);
    fireEvent.click(screen.getByText("Keywords"));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it("title is informational: evidence, but no queue kinds to filter to", () => {
    render(<TailorDimensionChips ratings={ratings} active="title" onPick={() => undefined} />);
    expect(screen.getByTestId("dimension-evidence").textContent).toContain("Renaming your headline is optional");
    expect(DIMENSION_KINDS.title).toHaveLength(0);
    expect(DIMENSION_KINDS.keyword).toContain("contextual");
  });
});

describe("findAppliedBulletIndex", () => {
  const overrides = {
    3: "Built the ingestion service, deployed through a CI/CD pipeline.",
    5: "Deployed the LLM gateway on Kubernetes.",
  };

  it("maps a single applied gap to its override line", () => {
    const actions = [{ label: "Kubernetes", appliedText: "Deployed the LLM gateway on Kubernetes." }];
    expect(findAppliedBulletIndex("Kubernetes", actions, overrides)).toBe(5);
  });

  it("in a batch apply, prefers the line that names the gap", () => {
    const actions = [{
      label: "CI/CD pipeline experience, Kubernetes",
      appliedText:
        "Deployed the LLM gateway on Kubernetes.\nBuilt the ingestion service, deployed through a CI/CD pipeline.",
    }];
    expect(findAppliedBulletIndex("Kubernetes", actions, overrides)).toBe(5);
    expect(findAppliedBulletIndex("CI/CD pipeline experience", actions, overrides)).toBe(3);
  });

  it("returns null when nothing matches instead of guessing", () => {
    expect(findAppliedBulletIndex("GraphQL", [{ label: "Kubernetes", appliedText: "x" }], overrides)).toBeNull();
    expect(findAppliedBulletIndex("Kubernetes", [], overrides)).toBeNull();
  });
});
