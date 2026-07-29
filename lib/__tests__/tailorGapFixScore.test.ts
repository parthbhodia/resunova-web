import { describe, expect, it } from "vitest";
import {
  GAP_CLOSE_SCORE_BUMP,
  GAP_CLOSE_SCORE_CAP,
  applyOptimisticGapAddressed,
  bumpOptimisticScore,
} from "@/lib/tailorGapFix";
import type { RatingsData } from "@/lib/types";

function ratings(over: Partial<RatingsData> = {}): RatingsData {
  return {
    match_score: 41,
    overall_score: 41,
    criteria: [],
    whats_working: [],
    gaps: [],
    verdict: "",
    job_title: { matched: false, jd_title: "SWE", resume_title: "Dev", score: 35, detail: "" },
    qualifications: {
      score: 40,
      covered: [],
      missing: [
        { text: "LangGraph", context: "not documented", status: "missing" },
      ],
    },
    responsibilities: { score: 50, covered: [], missing: [] },
    keywords: {
      found_count: 2,
      total_count: 5,
      direct_skills: { found: ["Python"], missing: ["LangGraph"] },
      contextual: { found: [], missing: [] },
    },
    ...over,
  } as RatingsData;
}

describe("bumpOptimisticScore", () => {
  it("adds the delta and clamps to the soft cap", () => {
    expect(bumpOptimisticScore(41, 28)).toBe(69);
    expect(bumpOptimisticScore(90, 28)).toBe(GAP_CLOSE_SCORE_CAP);
  });

  it("overall gap-close bump is zero (no fake 66→99 jumps)", () => {
    expect(GAP_CLOSE_SCORE_BUMP).toBe(0);
    expect(bumpOptimisticScore(66, GAP_CLOSE_SCORE_BUMP)).toBe(66);
  });
});

describe("applyOptimisticGapAddressed score honesty", () => {
  it("marks the gap resolved but does NOT inflate overall match score", () => {
    const next = applyOptimisticGapAddressed(ratings(), "LangGraph", "qualification");
    expect(next.match_score).toBe(41);
    expect(next.overall_score).toBe(41);
    expect(next.qualifications?.missing).toEqual([]);
    expect(next.qualifications?.resolved_by_user?.some((i) => i.text === "LangGraph")).toBe(true);
    expect((next.qualifications?.score ?? 0)).toBeGreaterThan(40);
  });

  it("does not keep stacking when the gap is already resolved", () => {
    const once = applyOptimisticGapAddressed(ratings(), "LangGraph", "qualification");
    const twice = applyOptimisticGapAddressed(once, "LangGraph", "qualification");
    expect(twice.match_score).toBe(41);
    expect(twice.overall_score).toBe(41);
  });

  it("still clears keyword missing without inflating overall", () => {
    const r = ratings({
      qualifications: { score: 70, covered: [], missing: [] },
      keywords: {
        found_count: 1,
        total_count: 2,
        direct_skills: { found: [], missing: ["LiteLLM"] },
        contextual: { found: [], missing: [] },
      },
    });
    const next = applyOptimisticGapAddressed(r, "LiteLLM", "keyword");
    expect(next.match_score).toBe(41);
    expect(next.keywords?.direct_skills?.missing ?? []).toEqual([]);
  });
});
