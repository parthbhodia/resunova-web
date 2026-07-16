/**
 * Deterministic estimated-score preview for the Analyze edit loop.
 *
 * The real overallScore is an LLM judgment (comprehensive analysis), so it
 * can't be recomputed client-side — but applied fixes CAN be verified
 * deterministically, the same way the backend honesty validators do it:
 * a quantification fix must actually add a numeral; any other fix must
 * materially change the text. Each verified fix recovers part of the gap in
 * the categories that bullet was flagged for (the SAME categorization the
 * banner/badge counts use, via bulletBelongsToCategory), and the overall
 * shifts by the mean category delta — mirroring the backend calibration's
 * mean(categoryScores) design without pretending to reimplement it.
 *
 * This is an ESTIMATE for instant feedback. "Update score" runs the real
 * analysis and persists it; the estimate is never stored anywhere.
 */
import {
  bulletBelongsToCategory,
  CATEGORY_SCORE_KEYS,
  type CategoryAssignmentOptions,
  type CategoryRewriteBullet,
} from "@/lib/analysisCategoryMatch";
import { addsMetricNumeral, isMaterialEdit } from "@/lib/analyzeEditEvidence";

export interface ScoreEstimate {
  current: number;
  projected: number;
  /** Applied fixes that deterministically verified (changed text / added numerals). */
  resolvedCount: number;
  /** Projected per-category scores (rounded), keyed by category — only the
   *  categories present in the input. Used to persist a consistent deterministic
   *  score on save (so overall matches the categories). */
  projectedCategories: Record<string, number>;
}

/** How much of a category's gap toward its ceiling full resolution recovers. */
const RECOVERY = 0.8;
/** A category won't be projected above this without a real re-analysis. */
const CATEGORY_CEILING = 92;
/** Max upward movement per category — fixes improve bullets, not the résumé's whole story. */
const MAX_CATEGORY_LIFT = 20;

export function estimateScoreAfterFixes(opts: {
  overallScore: number | null | undefined;
  categoryScores: Record<string, number | null | undefined> | null | undefined;
  bullets: CategoryRewriteBullet[];
  lineOverrides: Record<number, string>;
  categoryAssignmentOpts?: CategoryAssignmentOptions;
}): ScoreEstimate | null {
  const { overallScore, categoryScores, bullets, lineOverrides, categoryAssignmentOpts } = opts;
  if (typeof overallScore !== "number" || !categoryScores) return null;

  // Verify each applied override deterministically — mirror the honesty
  // validators: a NON-quantification category resolves only on a materially
  // substantive edit (not a near-no-op reword), quantification only on a real
  // new metric numeral (not a bare year or an unfilled placeholder alone).
  const materialIdx = new Set<number>();
  const metricIdx = new Set<number>();
  for (const [key, applied] of Object.entries(lineOverrides)) {
    const idx = Number(key);
    const original = (bullets[idx]?.originalBullet ?? "").trim();
    const text = (applied ?? "").trim();
    if (!original || !text) continue;
    if (isMaterialEdit(original, text)) materialIdx.add(idx);
    if (addsMetricNumeral(original, text)) metricIdx.add(idx);
  }
  const anyResolvedIdx = new Set<number>([...materialIdx, ...metricIdx]);
  if (anyResolvedIdx.size === 0) return null;

  const currentScores: number[] = [];
  const projectedScores: number[] = [];
  const projectedCategories: Record<string, number> = {};
  for (const cat of CATEGORY_SCORE_KEYS) {
    const score = categoryScores[cat];
    if (typeof score !== "number") continue;
    currentScores.push(score);

    const flagged: number[] = [];
    bullets.forEach((b, i) => {
      if (bulletBelongsToCategory(b, cat, bullets, i, categoryAssignmentOpts)) flagged.push(i);
    });
    // A quantification fix only counts when it really adds a metric number; any
    // other category counts only on a materially-substantive rewrite.
    const resolvedSet = cat === "quantification" ? metricIdx : materialIdx;
    const resolved = flagged.filter((i) => resolvedSet.has(i)).length;
    if (!flagged.length || !resolved || score >= CATEGORY_CEILING) {
      projectedScores.push(score);
      projectedCategories[cat] = Math.round(score);
      continue;
    }
    const ceiling = Math.min(CATEGORY_CEILING, score + MAX_CATEGORY_LIFT);
    const projectedCat = score + (ceiling - score) * (resolved / flagged.length) * RECOVERY;
    projectedScores.push(projectedCat);
    projectedCategories[cat] = Math.round(projectedCat);
  }
  if (!currentScores.length) return null;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = mean(projectedScores) - mean(currentScores);
  const projected = Math.round(Math.min(95, Math.max(20, overallScore + delta)));
  if (projected - overallScore < 1) return null;

  return { current: overallScore, projected, resolvedCount: anyResolvedIdx.size, projectedCategories };
}
