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
 * analysis and persists a verified result. The estimate itself is persisted
 * only on saved snapshots — analyses children and the linked resume_versions
 * row — always marked score_source='estimate', never as a verified grade.
 */
import {
  bulletBelongsToCategory,
  CATEGORY_SCORE_KEYS,
  type CategoryAssignmentOptions,
  type CategoryRewriteBullet,
} from "@/lib/analysisCategoryMatch";
import { normalizeForMatch } from "@/lib/resumeBulletMatch";

export interface ScoreEstimate {
  current: number;
  projected: number;
  /** Applied fixes that deterministically verified (changed text / added numerals). */
  resolvedCount: number;
}

/** Numeral tokens (incl. $1.2M / 40% / 100,000) present in `text`. */
function numeralTokens(text: string): Set<string> {
  return new Set(text.match(/\d[\d,.]*%?/g) ?? []);
}

/** AI fill-in placeholders like [X%] / [$Y] count as quantification intent. */
const PLACEHOLDER_RE = /\[[^\]]*\]/;

function addsNumeral(original: string, applied: string): boolean {
  if (PLACEHOLDER_RE.test(applied)) return true;
  const before = numeralTokens(original);
  for (const tok of numeralTokens(applied)) {
    if (!before.has(tok)) return true;
  }
  return false;
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

  // Verify each applied override deterministically.
  const changedIdx = new Set<number>();
  const numeralIdx = new Set<number>();
  for (const [key, applied] of Object.entries(lineOverrides)) {
    const idx = Number(key);
    const original = (bullets[idx]?.originalBullet ?? "").trim();
    const text = (applied ?? "").trim();
    if (!original || !text) continue;
    if (normalizeForMatch(text) === normalizeForMatch(original)) continue;
    changedIdx.add(idx);
    if (addsNumeral(original, text)) numeralIdx.add(idx);
  }
  if (changedIdx.size === 0) return null;

  const currentScores: number[] = [];
  const projectedScores: number[] = [];
  for (const cat of CATEGORY_SCORE_KEYS) {
    const score = categoryScores[cat];
    if (typeof score !== "number") continue;
    currentScores.push(score);

    const flagged: number[] = [];
    bullets.forEach((b, i) => {
      if (bulletBelongsToCategory(b, cat, bullets, i, categoryAssignmentOpts)) flagged.push(i);
    });
    // A quantification fix only counts when it really adds a number — the
    // same evidence rule the backend validators enforce on rewrites.
    const resolvedSet = cat === "quantification" ? numeralIdx : changedIdx;
    const resolved = flagged.filter((i) => resolvedSet.has(i)).length;
    if (!flagged.length || !resolved || score >= CATEGORY_CEILING) {
      projectedScores.push(score);
      continue;
    }
    const ceiling = Math.min(CATEGORY_CEILING, score + MAX_CATEGORY_LIFT);
    projectedScores.push(score + (ceiling - score) * (resolved / flagged.length) * RECOVERY);
  }
  if (!currentScores.length) return null;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const delta = mean(projectedScores) - mean(currentScores);
  const projected = Math.round(Math.min(95, Math.max(20, overallScore + delta)));
  if (projected - overallScore < 1) return null;

  return { current: overallScore, projected, resolvedCount: changedIdx.size };
}
