/**
 * Shared deterministic evidence tests for Analyze edits, used by BOTH the live
 * score estimate (analyzeScoreEstimate) and the save reconciliation
 * (analyzeReconcile) so the "Est." chip and the persisted version agree.
 *
 * These mirror the backend honesty validators: a rewrite only resolves a
 * category when the change is materially substantive (not a near-no-op reword),
 * and quantification only resolves when a REAL metric numeral is added (not a
 * bare year or ID).
 */
import { normalizeForMatch } from "@/lib/resumeBulletMatch";

/** Numeral tokens (incl. $1.2M / 40% / 100,000) present in `text`. */
export function numeralTokens(text: string): Set<string> {
  return new Set(text.match(/\d[\d,.]*%?/g) ?? []);
}

/** AI fill-in placeholders like [X%] / [$Y] count as quantification INTENT. */
const PLACEHOLDER_RE = /\[[^\]]*\]/;
/** A bare 4-digit year (1900–2099) with no %/$ — a date, not an impact metric. */
const BARE_YEAR_RE = /^(?:19|20)\d{2}$/;

/**
 * The edit adds a NEW real metric numeral (or an [X%]/[$Y] placeholder) not in
 * the original — a percentage, dollar amount, comma-grouped or suffixed number,
 * or any new numeral that is NOT merely a bare calendar year. Mirrors the
 * backend evidence rule so the quantification flag can't be cleared by adding a
 * year ("in 2024") or an ID.
 */
export function addsMetricNumeral(original: string, applied: string): boolean {
  if (PLACEHOLDER_RE.test(applied) && !PLACEHOLDER_RE.test(original)) return true;
  const before = numeralTokens(original);
  for (const tok of numeralTokens(applied)) {
    if (before.has(tok)) continue;
    // A bare standalone year is a date, not a metric — ignore it (strip any
    // trailing "." / "," the tokenizer swept up: "2024." → "2024").
    const core = tok.replace(/[.,]+$/, "");
    if (BARE_YEAR_RE.test(core)) continue;
    return true;
  }
  return false;
}

function wordSet(text: string): Set<string> {
  return new Set(
    normalizeForMatch(text)
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

/** Jaccard similarity of the two texts' word sets (0..1). */
export function wordJaccard(a: string, b: string): number {
  const sa = wordSet(a);
  const sb = wordSet(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Near-no-op threshold — matches the backend analysis path (>=0.88 = trivial). */
const NEAR_NO_OP_JACCARD = 0.88;

/**
 * A materially-substantive edit (not a near-no-op reword / punctuation / case
 * change). Used to gate NON-quantification category resolution — the same
 * standard the honesty validators apply before crediting a rewrite. A tiny
 * metric-only add (high word overlap) is intentionally NOT "material" here; the
 * quantification path credits it via {@link addsMetricNumeral} instead.
 */
export function isMaterialEdit(original: string, applied: string): boolean {
  if (normalizeForMatch(original) === normalizeForMatch(applied)) return false;
  return wordJaccard(original, applied) < NEAR_NO_OP_JACCARD;
}
