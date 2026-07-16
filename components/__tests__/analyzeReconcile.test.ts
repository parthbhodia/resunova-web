import { describe, expect, it } from "vitest";
import { reconcileAnalysisForSave, type ReconcileBullet, type ReconcileTopIssue } from "@/lib/analyzeReconcile";
import { normalizeForMatch } from "@/lib/resumeBulletMatch";

const B1 = "Built scalable frontend UIs in Vue.js for federal platforms.";
const B2 = "Designed a PostgreSQL schema supporting a high-traffic CMS.";
const B3 = "Managed the release process and coordinated across teams.";

function bullets(): ReconcileBullet[] {
  return [
    { originalBullet: B1, score: 52, issues: ["quantification", "weak achievement"], improvedBullet: "AI rewrite of B1", categoryRewrites: { quantification: "q-rewrite", achievementQuality: "a-rewrite" }, primaryCategory: "quantification", issueCategories: ["quantification", "achievementQuality"] },
    { originalBullet: B2, score: 60, issues: ["weak verb"], improvedBullet: "", primaryCategory: "achievementQuality", issueCategories: ["achievementQuality"] },
    { originalBullet: B3, score: 55, issues: ["duty-only"], improvedBullet: "", primaryCategory: "achievementQuality", issueCategories: ["achievementQuality"] },
  ];
}

describe("reconcileAnalysisForSave — bulletAnalysis", () => {
  it("drops a hidden bullet's entry", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: [], lineOverrides: {}, hiddenTexts: [B2],
    });
    expect(out.bulletAnalysis.map((b) => b.originalBullet)).toEqual([B1, B3]);
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B2));
  });

  it("drops a hidden bullet even when the analysis quote is a truncation (fuzzy match)", () => {
    // The analysis entry quotes a SUBSTANTIAL truncation of the full rendered
    // text (the LLM dropped the trailing clause) — the same link the preview
    // makes via findBulletIndexForLine, not an exact normalized match.
    const full = "Managed the release process and coordinated deployments across five product teams.";
    const quote = "Managed the release process and coordinated deployments";
    const analysis: ReconcileBullet[] = [
      { originalBullet: quote, score: 55, issues: ["duty-only"], improvedBullet: "", primaryCategory: "achievementQuality", issueCategories: ["achievementQuality"] },
    ];
    const out = reconcileAnalysisForSave({
      bulletAnalysis: analysis, topIssues: [], lineOverrides: {},
      hiddenTexts: [full],
    });
    expect(out.bulletAnalysis).toHaveLength(0); // phantom flag removed
  });

  it("drops a fully-resolved edited bullet (material non-quant rewrite)", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: [],
      lineOverrides: { 2: "Led the release across four cross-functional teams, cutting cycle time." },
      hiddenTexts: [],
    });
    expect(out.bulletAnalysis.map((b) => b.originalBullet)).not.toContain(B3);
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B3));
  });

  it("does NOT resolve on a near-no-op edit (punctuation / case only)", () => {
    // Identical words, only the trailing period dropped → jaccard 1.0, not material.
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: [],
      lineOverrides: { 2: "Managed the release process and coordinated across teams" },
      hiddenTexts: [],
    });
    const b3 = out.bulletAnalysis.find((b) => normalizeForMatch(b.originalBullet).includes("release process"));
    expect(b3).toBeTruthy(); // flag survives a cosmetic edit
    expect(b3!.issueCategories).toContain("achievementQuality");
  });

  it("keeps a quantification bullet flagged when the edit adds NO real metric", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      // material rewrite that resolves achievement, but no number → quant survives
      lineOverrides: { 0: "Engineered and shipped resilient Vue.js frontends powering federal platforms." },
      topIssues: [], hiddenTexts: [],
    });
    const b1 = out.bulletAnalysis.find((b) => b.originalBullet.includes("Engineered and shipped"));
    expect(b1).toBeTruthy();
    expect(b1!.issueCategories).toEqual(["quantification"]);
    expect(b1!.primaryCategory).toBe("quantification");
    // partial branch clears stale rewrite + non-quant tags/rewrites
    expect(b1!.improvedBullet).toBe("");
    expect(b1!.categoryRewrites).toBeUndefined();
    expect(b1!.issues.every((t) => /quantif/i.test(t))).toBe(true);
  });

  it("does NOT resolve quantification when the only new numeral is a bare year", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      lineOverrides: { 0: "Rebuilt and modernized the Vue.js federal platform frontends in 2024." },
      topIssues: [], hiddenTexts: [],
    });
    const b1 = out.bulletAnalysis.find((b) => b.originalBullet.includes("in 2024"));
    expect(b1).toBeTruthy();
    expect(b1!.issueCategories).toEqual(["quantification"]); // year didn't clear it
  });

  it("fully resolves a quantification bullet when the edit adds a real metric", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      lineOverrides: { 0: "Rebuilt Vue.js frontends for 12 federal platforms, cutting load 40%." },
      topIssues: [], hiddenTexts: [],
    });
    expect(out.bulletAnalysis.find((b) => b.originalBullet.includes("12 federal platforms"))).toBeUndefined();
    expect(out.resolvedOriginals).toContain(normalizeForMatch(B1));
  });
});

describe("reconcileAnalysisForSave — topIssues", () => {
  const issues = (): ReconcileTopIssue[] => [
    { issue: "Bullets lack metrics", severity: "high", whyItMatters: "", suggestion: "", category: "quantification", items: [B1, B2] },
    { issue: "Inconsistent section headings", severity: "medium", whyItMatters: "", suggestion: "", category: "sectionStructure" },
  ];

  it("prunes resolved items and drops a bullet-scoped issue when all items resolve", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: issues(),
      lineOverrides: { 0: "Rebuilt Vue.js frontends for 12 federal platforms, cutting load 40%." },
      hiddenTexts: [B2],
    });
    expect(out.topIssues.find((i) => i.issue === "Bullets lack metrics")).toBeUndefined();
    expect(out.topIssues.find((i) => i.issue === "Inconsistent section headings")).toBeTruthy();
  });

  it("keeps a partially-resolved bullet issue with only the surviving item", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: issues(), lineOverrides: {}, hiddenTexts: [B1],
    });
    const metrics = out.topIssues.find((i) => i.issue === "Bullets lack metrics");
    expect(metrics!.items).toEqual([B2]);
  });

  it("never drops a structural issue that has no items", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(),
      topIssues: [{ issue: "ATS layout risk", severity: "high", whyItMatters: "", suggestion: "", category: "atsCompatibility" }],
      lineOverrides: { 0: "Rebuilt Vue.js frontends for 12 federal platforms." },
      hiddenTexts: [B2, B3],
    });
    expect(out.topIssues).toHaveLength(1);
  });
});

describe("reconcileAnalysisForSave — categoryRationales", () => {
  it("clears rationale ONLY for a category the edits LIFTED to healthy", () => {
    const out = reconcileAnalysisForSave({
      bulletAnalysis: bullets(), topIssues: [],
      categoryRationales: { quantification: "Few numbers.", sectionStructure: "Already fine.", readability: "Dense." },
      categoryScores: { quantification: 45, sectionStructure: 78, readability: 55 },
      lineOverrides: {}, hiddenTexts: [],
      // quantification lifted past healthy; sectionStructure was already 78 (untouched); readability lifted but not healthy
      projectedCategories: { quantification: 80, sectionStructure: 78, readability: 60 },
    });
    // Only quantification is dropped; the untouched-healthy sectionStructure note is KEPT.
    expect(out.categoryRationales).toEqual({ sectionStructure: "Already fine.", readability: "Dense." });
  });
});
