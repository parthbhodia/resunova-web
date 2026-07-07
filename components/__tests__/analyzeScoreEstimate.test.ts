import { describe, expect, it } from "vitest";
import { estimateScoreAfterFixes } from "@/lib/analyzeScoreEstimate";
import type { CategoryRewriteBullet } from "@/lib/analysisCategoryMatch";

const bullets: CategoryRewriteBullet[] = [
  {
    originalBullet: "Responsible for maintaining the CMS backend.",
    improvedBullet: "Maintained a CMS backend serving [X] users with 99.9% uptime.",
    score: 45,
    issues: [],
    primaryCategory: "quantification",
    issueCategories: ["quantification", "achievementQuality"],
  },
  {
    originalBullet: "Worked with the team on frontend features.",
    improvedBullet: "Shipped 14 frontend features across 3 quarters.",
    score: 50,
    issues: [],
    primaryCategory: "achievementQuality",
    issueCategories: ["achievementQuality"],
  },
];

const categoryScores: Record<string, number> = {
  readability: 80,
  atsCompatibility: 85,
  jobMatch: 70,
  achievementQuality: 55,
  quantification: 50,
  sectionStructure: 82,
  languageQuality: 78,
  technicalBranding: 75,
};

describe("estimateScoreAfterFixes", () => {
  it("returns null with no applied fixes", () => {
    expect(
      estimateScoreAfterFixes({ overallScore: 70, categoryScores, bullets, lineOverrides: {} }),
    ).toBeNull();
  });

  it("projects an increase when a numeral-adding fix resolves a quantification bullet", () => {
    const est = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: { 0: "Maintained a CMS backend serving 100,000 users with 99.9% uptime." },
    });
    expect(est).not.toBeNull();
    expect(est!.current).toBe(70);
    expect(est!.projected).toBeGreaterThan(70);
    expect(est!.projected).toBeLessThanOrEqual(95);
    expect(est!.resolvedCount).toBe(1);
  });

  it("gives no quantification credit when the applied text adds no numbers", () => {
    const withNumbers = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: { 0: "Maintained a CMS backend serving 100,000 users." },
    })!;
    const withoutNumbers = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: { 0: "Maintained and operated the CMS backend infrastructure daily." },
    });
    // Text changed → some credit possible (achievementQuality), but strictly
    // less than the numeral-adding fix which also lifts quantification.
    const withoutProjected = withoutNumbers?.projected ?? 70;
    expect(withNumbers.projected).toBeGreaterThan(withoutProjected);
  });

  it("treats a bracket placeholder as quantification intent", () => {
    const est = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: { 0: "Maintained a CMS backend serving [X] users, cutting load times [Y%]." },
    });
    expect(est).not.toBeNull();
    expect(est!.projected).toBeGreaterThan(70);
  });

  it("ignores no-op overrides (identical after normalization)", () => {
    expect(
      estimateScoreAfterFixes({
        overallScore: 70,
        categoryScores,
        bullets,
        lineOverrides: { 0: "Responsible for maintaining the CMS backend." },
      }),
    ).toBeNull();
  });

  it("more resolved fixes → higher projection, capped at 95", () => {
    const one = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: { 1: "Shipped 14 frontend features across 3 quarters." },
    })!;
    const both = estimateScoreAfterFixes({
      overallScore: 70,
      categoryScores,
      bullets,
      lineOverrides: {
        0: "Maintained a CMS backend serving 100,000 users with 99.9% uptime.",
        1: "Shipped 14 frontend features across 3 quarters.",
      },
    })!;
    expect(both.projected).toBeGreaterThanOrEqual(one.projected);
    expect(both.projected).toBeLessThanOrEqual(95);
    expect(both.resolvedCount).toBe(2);
  });

  it("returns null when result has no scores", () => {
    expect(
      estimateScoreAfterFixes({
        overallScore: null,
        categoryScores,
        bullets,
        lineOverrides: { 0: "Changed text with 42 numbers." },
      }),
    ).toBeNull();
    expect(
      estimateScoreAfterFixes({
        overallScore: 70,
        categoryScores: null,
        bullets,
        lineOverrides: { 0: "Changed text with 42 numbers." },
      }),
    ).toBeNull();
  });
});
