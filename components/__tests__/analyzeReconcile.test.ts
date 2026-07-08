import { describe, expect, it } from "vitest";
import { reconcileAnalysisForSave, type ReconcileBullet, type ReconcileTopIssue } from "@/lib/analyzeReconcile";
import { normalizeForMatch } from "@/lib/resumeBulletMatch";

const B1 = "Built scalable frontend UIs in Vue.js for federal platforms.";
const B2 = "Designed a PostgreSQL schema supporting a high-traffic CMS.";
const B3 = "Managed the release process and coordinated across teams.";

function bullets(): ReconcileBullet[] {
  return [
    { originalBullet: B1, score: 52, issues: ["quantification"], improvedBullet: "", primaryCategory: "quantification", issueCategories: ["quantification", "achievementQuality"] },
    { originalBullet: B2, score: 60, issues: ["weak verb"], improvedBullet: "", primaryCategory: "achievementQuality", issueCategories: ["achievementQuality"] },
    { originalBullet: B3, score: 55, issues: ["duty-only"], improvedBullet: "", primaryCategory: "achievementQuality", issueCategories: ["achievementQuality"] },
  ];
}

describe("reconcileAnalysisForSave — bulletAnalysis", () => {
  it("drops a hidden bullet's entry", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: [],
      lineOverrides: {},
      hiddenNorms: new Set([normalizeForMatch(B2)]),
    });
    expect(out.bulletAnalysis.map((b) => b.originalBullet)).toEqual([B1, B3]);
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B2));
  });

  it("drops a fully-resolved edited bullet (material rewrite, non-quant categories)", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: [],
      // index 2 = B3, achievementQuality only → material rewrite resolves it fully
      lineOverrides: { 2: "Led the release process across 4 teams, cutting cycle time." },
      hiddenNorms: new Set(),
    });
    expect(out.bulletAnalysis.map((b) => b.originalBullet)).not.toContain(B3);
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B3));
  });

  it("keeps a quantification bullet flagged when the edit adds NO numeral", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      // index 0 = B1, flagged quantification+achievement; edit changes text but adds no number
      lineOverrides: { 0: "Engineered scalable Vue.js frontends for federal platforms." },
      topIssues: [],
      hiddenNorms: new Set(),
    });
    const b1 = out.bulletAnalysis.find((b) => b.originalBullet.includes("Engineered scalable Vue.js"));
    expect(b1).toBeTruthy();
    expect(b1!.issueCategories).toEqual(["quantification"]);
    expect(b1!.primaryCategory).toBe("quantification");
  });

  it("fully resolves a quantification bullet when the edit adds a numeral", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      lineOverrides: { 0: "Built Vue.js frontends for 12 federal platforms, cutting load 40%." },
      topIssues: [],
      hiddenNorms: new Set(),
    });
    expect(out.bulletAnalysis.find((b) => b.originalBullet.includes("12 federal platforms"))).toBeUndefined();
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B1));
  });

  it("keeps an untouched bullet verbatim", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      lineOverrides: { 0: "Built Vue.js frontends for 12 federal platforms, cutting load 40%." },
      topIssues: [],
      hiddenNorms: new Set(),
    });
    expect(out.bulletAnalysis.some((b) => b.originalBullet === B2)).toBe(true);
  });
});

describe("reconcileAnalysisForSave — topIssues", () => {
  const issues = (): ReconcileTopIssue[] => [
    { issue: "Bullets lack metrics", severity: "high", whyItMatters: "", suggestion: "", category: "quantification", items: [B1, B2] },
    { issue: "Inconsistent section headings", severity: "medium", whyItMatters: "", suggestion: "", category: "sectionStructure" },
  ];

  it("prunes resolved items and drops a bullet-scoped issue when all items resolve", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: issues(),
      lineOverrides: { 0: "Built Vue.js frontends for 12 federal platforms, cutting load 40%." }, // resolves B1
      hiddenNorms: new Set([normalizeForMatch(B2)]), // hides B2
    });
    // Both quoted bullets gone → the metrics issue is dropped…
    expect(out.topIssues.find((i) => i.issue === "Bullets lack metrics")).toBeUndefined();
    // …the structural issue (no items) is kept.
    expect(out.topIssues.find((i) => i.issue === "Inconsistent section headings")).toBeTruthy();
  });

  it("keeps a partially-resolved bullet issue with only the surviving item", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: issues(),
      lineOverrides: {},
      hiddenNorms: new Set([normalizeForMatch(B1)]), // only B1 hidden
    });
    const metrics = out.topIssues.find((i) => i.issue === "Bullets lack metrics");
    expect(metrics).toBeTruthy();
    expect(metrics!.items).toEqual([B2]);
  });

  it("never drops a structural issue that has no items", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: [{ issue: "ATS layout risk", severity: "high", whyItMatters: "", suggestion: "", category: "atsCompatibility" }],
      lineOverrides: { 0: "Built Vue.js frontends for 12 federal platforms." },
      hiddenNorms: new Set([normalizeForMatch(B2), normalizeForMatch(B3)]),
    });
    expect(out.topIssues).toHaveLength(1);
  });
});

describe("reconcileAnalysisForSave — categoryRationales", () => {
  it("clears rationale for a category that reconciled to a healthy score, keeps low ones", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: [],
      categoryRationales: { quantification: "Few bullets have numbers.", readability: "Dense paragraphs." },
      lineOverrides: {},
      hiddenNorms: new Set(),
      projectedCategories: { quantification: 78, readability: 55 },
    });
    expect(out.categoryRationales).toEqual({ readability: "Dense paragraphs." });
  });
});
