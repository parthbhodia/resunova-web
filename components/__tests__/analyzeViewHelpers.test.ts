import { describe, expect, it } from "vitest";
import {
  scoreColor,
  scoreLabel,
  severityColor,
  severityBg,
  guessIssueCategory,
  issueCategoryOf,
  formatExperienceTenureChip,
  flaggedBulletFixChip,
  getBulletsForCategory,
} from "@/components/analyze/analyzeViewHelpers";
import type { AnalysisResult } from "@/components/analyze/analyzeTypes";

// Characterization tests locking the behavior of the pure helpers extracted from
// AnalyzeResume in Slice 1 of the refactor (docs/ANALYZE_REFACTOR_PLAN.md).

describe("scoreColor / scoreLabel", () => {
  it("scoreColor thresholds", () => {
    expect(scoreColor(null)).toBe("var(--border)");
    expect(scoreColor(80)).toBe("var(--green)");
    expect(scoreColor(79)).toBe("var(--yellow)");
    expect(scoreColor(60)).toBe("var(--yellow)");
    expect(scoreColor(59)).toBe("var(--red)");
  });
  it("scoreLabel thresholds", () => {
    expect(scoreLabel(85)).toBe("Excellent");
    expect(scoreLabel(84)).toBe("Strong");
    expect(scoreLabel(70)).toBe("Strong");
    expect(scoreLabel(69)).toBe("Good");
    expect(scoreLabel(55)).toBe("Good");
    expect(scoreLabel(54)).toBe("Needs Work");
  });
});

describe("severity colors", () => {
  it("maps severity to color + bg", () => {
    expect(severityColor("high")).toBe("var(--red)");
    expect(severityColor("medium")).toBe("#f59e0b");
    expect(severityColor("low")).toBe("var(--accent)");
    expect(severityBg("high")).toBe("rgba(248,113,113,0.12)");
    expect(severityBg("low")).toBe("rgba(99,102,241,0.12)");
  });
});

describe("guessIssueCategory / issueCategoryOf", () => {
  it("maps issue text to a category by keyword", () => {
    expect(guessIssueCategory("Bullets are missing metrics")).toBe("quantification");
    expect(guessIssueCategory("Too much passive voice")).toBe("languageQuality");
    expect(guessIssueCategory("Not ATS friendly for scanning")).toBe("atsCompatibility");
    expect(guessIssueCategory("Responsible for daily tasks")).toBe("achievementQuality");
    expect(guessIssueCategory("nothing recognizable here zzz")).toBeNull();
  });
  it("issueCategoryOf trusts an explicit backend category over the heuristic", () => {
    const issue = {
      issue: "missing metrics everywhere",   // heuristic would say quantification
      severity: "high" as const,
      whyItMatters: "",
      suggestion: "",
      category: "readability" as keyof AnalysisResult["categoryScores"],
    };
    expect(issueCategoryOf(issue)).toBe("readability");
  });
  it("issueCategoryOf falls back to the heuristic when no category is set", () => {
    const issue = {
      issue: "Bullets lack quantification",
      severity: "low" as const,
      whyItMatters: "",
      suggestion: "",
    };
    expect(issueCategoryOf(issue)).toBe("quantification");
  });
});

describe("formatExperienceTenureChip", () => {
  const base = { totalMonths: 0, totalYearsLabel: "3 yrs", roleCount: 0, datedRoleCount: 0, roles: [] };
  it("returns null with no summary or no roles", () => {
    expect(formatExperienceTenureChip(undefined)).toBeNull();
    expect(formatExperienceTenureChip({ ...base })).toBeNull();
  });
  it("labels undated roles", () => {
    expect(formatExperienceTenureChip({ ...base, roleCount: 1, datedRoleCount: 0 }))
      .toBe("1 role · dates not parsed");
    expect(formatExperienceTenureChip({ ...base, roleCount: 3, datedRoleCount: 0 }))
      .toBe("3 roles · dates not parsed");
  });
  it("shows tenure label when roles are dated", () => {
    expect(formatExperienceTenureChip({ ...base, totalYearsLabel: "5 yrs", roleCount: 2, datedRoleCount: 2 }))
      .toBe("5 yrs · 2 roles");
  });
});

describe("flaggedBulletFixChip", () => {
  it("prioritizes proofreading for micro-edits", () => {
    expect(flaggedBulletFixChip("achievementQuality", true)).toBe("Proofreading");
  });
  it("falls back to Fix with no category", () => {
    expect(flaggedBulletFixChip(null, false)).toBe("Fix");
  });
  it("uses the category label", () => {
    expect(flaggedBulletFixChip("quantification", false)).toBe("Quantification");
  });
});

describe("getBulletsForCategory", () => {
  it("filters bullets to those belonging to the category", () => {
    const bullets: AnalysisResult["bulletAnalysis"] = [
      { originalBullet: "a", score: 40, issues: [], improvedBullet: "", primaryCategory: "quantification", issueCategories: ["quantification"] },
      { originalBullet: "b", score: 90, issues: [], improvedBullet: "", primaryCategory: "readability", issueCategories: ["readability"] },
    ];
    const out = getBulletsForCategory("quantification", bullets);
    expect(out).toHaveLength(1);
    expect(out[0].originalBullet).toBe("a");
  });
});
