/**
 * Deterministic (no-LLM) reconciliation of a saved Analyze result after preview
 * edits, so a reopened edited version is self-consistent. Mirrors the honesty
 * validators' evidence rules and the analyzeScoreEstimate resolution model:
 *
 *  - A HIDDEN bullet's analysis entry is dropped (the bullet no longer exists).
 *  - An EDITED (material override) bullet resolves its non-quantification
 *    categories (the user rewrote it); quantification only resolves when the
 *    edit actually adds a numeral — the exact rule the backend validators use.
 *  - A fully-resolved bullet's entry is dropped; a partially-resolved one keeps
 *    the surviving category (quantification) with its text updated.
 *  - topIssues drop any `items[]` that quoted a now-hidden/fully-resolved bullet,
 *    and a bullet-scoped issue is dropped only when its items empty out — never a
 *    structural / ATS / formatting issue (risk-guarded per the design spec).
 *  - categoryRationales for a category that reconciled to a healthy score are
 *    cleared (a stale "why it's low" note next to a green category is worse than
 *    none). No rationale text is ever fabricated.
 *
 * We only ever RESOLVE/REMOVE issues we already knew about; we never invent new
 * ones for text the user typed — that is the correct behavior for a free,
 * LLM-free save.
 */
import { normalizeForMatch } from "@/lib/resumeBulletMatch";

export interface ReconcileBullet {
  originalBullet: string;
  score: number;
  issues: string[];
  improvedBullet: string;
  categoryRewrites?: Partial<Record<string, string>>;
  primaryCategory?: string;
  issueCategories?: string[];
}

export interface ReconcileTopIssue {
  issue: string;
  severity: "low" | "medium" | "high";
  whyItMatters: string;
  suggestion: string;
  category?: string;
  items?: string[];
  source?: string;
}

/** Numeral tokens (incl. $1.2M / 40% / 100,000) present in `text`. */
function numeralTokens(text: string): Set<string> {
  return new Set(text.match(/\d[\d,.]*%?/g) ?? []);
}
const PLACEHOLDER_RE = /\[[^\]]*\]/;
/** The edit adds a NEW numeral (or an [X%]/[$Y] placeholder) not in the original. */
function addsNumeral(original: string, applied: string): boolean {
  if (PLACEHOLDER_RE.test(applied)) return true;
  const before = numeralTokens(original);
  for (const tok of numeralTokens(applied)) {
    if (!before.has(tok)) return true;
  }
  return false;
}

function bulletCategories(b: ReconcileBullet): string[] {
  if (b.issueCategories && b.issueCategories.length) return b.issueCategories;
  return b.primaryCategory ? [b.primaryCategory] : [];
}

export interface ReconcileResult {
  bulletAnalysis: ReconcileBullet[];
  topIssues: ReconcileTopIssue[];
  categoryRationales: Record<string, string> | undefined;
  /** Normalized ORIGINAL texts that reconciled to fully-resolved or hidden. */
  resolvedOriginals: string[];
}

export function reconcileAnalysisForSave(input: {
  bulletAnalysis: ReconcileBullet[];
  topIssues: ReconcileTopIssue[];
  categoryRationales?: Record<string, string> | undefined;
  /** Applied bullet rewrites keyed by bulletAnalysis index. */
  lineOverrides: Record<number, string>;
  /** Normalized rendered text of hidden bullets. */
  hiddenNorms: Set<string>;
  /** Projected per-category scores from the deterministic estimate (may be empty). */
  projectedCategories?: Record<string, number>;
  /** A category is treated as "healthy" (rationale cleared) at/above this score. */
  healthyScore?: number;
}): ReconcileResult {
  const {
    bulletAnalysis,
    topIssues,
    categoryRationales,
    lineOverrides,
    hiddenNorms,
    projectedCategories = {},
    healthyScore = 70,
  } = input;

  // ── bulletAnalysis: drop hidden, resolve edited ─────────────────────────────
  const resolvedOriginals = new Set<string>();
  const outBullets: ReconcileBullet[] = [];
  bulletAnalysis.forEach((e, idx) => {
    const origNorm = normalizeForMatch(e.originalBullet);
    if (origNorm && hiddenNorms.has(origNorm)) {
      resolvedOriginals.add(origNorm); // gone from the résumé
      return;
    }
    const override = (lineOverrides[idx] ?? "").trim();
    const material = !!override && normalizeForMatch(override) !== origNorm;
    if (!material) {
      outBullets.push(e); // untouched — keep verbatim
      return;
    }
    // Material rewrite: non-quantification categories are resolved by the edit;
    // quantification survives only if the edit added no new numeral.
    const cats = bulletCategories(e);
    const quantFlagged = cats.includes("quantification");
    const quantSurvives = quantFlagged && !addsNumeral(e.originalBullet, override);
    if (!quantSurvives) {
      resolvedOriginals.add(origNorm); // fully resolved → drop the flag
      return;
    }
    // Partially resolved: only the quantification requirement remains.
    outBullets.push({
      ...e,
      originalBullet: override,
      primaryCategory: "quantification",
      issueCategories: ["quantification"],
    });
  });

  // ── topIssues: prune items that referenced resolved/hidden bullets ──────────
  const isResolvedText = (t: string): boolean => {
    const n = normalizeForMatch(t);
    return !!n && (hiddenNorms.has(n) || resolvedOriginals.has(n));
  };
  const outIssues: ReconcileTopIssue[] = [];
  for (const it of topIssues) {
    if (!it.items || it.items.length === 0) {
      outIssues.push(it); // not bullet-scoped (structural / ATS / formatting) — keep
      continue;
    }
    const keptItems = it.items.filter((item) => !isResolvedText(item));
    if (keptItems.length === 0) {
      // Every quoted bullet is fixed/hidden AND the issue was bullet-scoped → drop.
      continue;
    }
    outIssues.push(keptItems.length === it.items.length ? it : { ...it, items: keptItems });
  }

  // ── categoryRationales: clear stale low-score notes for healthy categories ──
  let outRationales: Record<string, string> | undefined = categoryRationales;
  if (categoryRationales && Object.keys(categoryRationales).length) {
    const next: Record<string, string> = {};
    for (const [cat, text] of Object.entries(categoryRationales)) {
      const projected = projectedCategories[cat];
      if (typeof projected === "number" && projected >= healthyScore) continue; // drop stale note
      next[cat] = text;
    }
    outRationales = next;
  }

  return {
    bulletAnalysis: outBullets,
    topIssues: outIssues,
    categoryRationales: outRationales,
    resolvedOriginals: [...resolvedOriginals],
  };
}
