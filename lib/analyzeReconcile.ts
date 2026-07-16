/**
 * Deterministic (no-LLM) reconciliation of a saved Analyze result after preview
 * edits, so a reopened edited version is self-consistent. Mirrors the honesty
 * validators' evidence rules and the analyzeScoreEstimate resolution model:
 *
 *  - A HIDDEN bullet's analysis entry is dropped (matched to the entry by the
 *    SAME fuzzy linker the preview uses, not exact equality — the LLM's
 *    originalBullet quote can be a truncation of the structured text).
 *  - An EDITED bullet resolves its non-quantification categories only on a
 *    materially-substantive rewrite (not a near-no-op reword); quantification
 *    only when the edit adds a REAL metric numeral (not a bare year/ID or an
 *    unfilled placeholder) — the exact rules the backend validators use.
 *  - A fully-resolved bullet's entry is dropped; a partially-resolved one keeps
 *    only the surviving quantification flag, with its text updated and any stale
 *    rewrite/tags for now-resolved categories cleared.
 *  - topIssues drop any `items[]` that quoted a now-hidden/fully-resolved bullet,
 *    and a bullet-scoped issue is dropped only when its items empty out — never a
 *    structural / ATS / formatting issue.
 *  - categoryRationales are cleared ONLY for a category the edits actually lifted
 *    to a healthy score (never for an untouched already-healthy category).
 *
 * We only ever RESOLVE/REMOVE issues we already knew about; we never invent new
 * ones for text the user typed — correct behavior for a free, LLM-free save.
 */
import { normalizeForMatch, findBulletIndexForLine, type LiveBulletItem } from "@/lib/resumeBulletMatch";
import { addsMetricNumeral, isMaterialEdit } from "@/lib/analyzeEditEvidence";

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

function bulletCategories(b: ReconcileBullet): string[] {
  if (b.issueCategories && b.issueCategories.length) return b.issueCategories;
  return b.primaryCategory ? [b.primaryCategory] : [];
}

/** Tags that describe a quantification/metric weakness — kept on a partially-
 *  resolved (still-needs-a-number) bullet; other stale tags are dropped. */
const QUANT_TAG_RE = /(quantif|metric|numer|measur|impact|%|\bnumbers?\b)/i;

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
  /** Original per-category scores (to tell a lifted category from an already-healthy one). */
  categoryScores?: Record<string, number | null> | undefined;
  /** Applied bullet rewrites keyed by bulletAnalysis index. */
  lineOverrides: Record<number, string>;
  /** Rendered text of hidden bullets (full structured text). */
  hiddenTexts: string[];
  /** Projected per-category scores from the deterministic estimate (may be empty). */
  projectedCategories?: Record<string, number>;
  /** A category is treated as "healthy" (rationale cleared) at/above this score. */
  healthyScore?: number;
}): ReconcileResult {
  const {
    bulletAnalysis,
    topIssues,
    categoryRationales,
    categoryScores = {},
    lineOverrides,
    hiddenTexts,
    projectedCategories = {},
    healthyScore = 70,
  } = input;

  // Link each hidden bullet to its analysis entry the SAME way the preview does
  // (fuzzy), plus an exact-norm set as a fast path.
  const hiddenNorms = new Set<string>();
  const hiddenAnalysisIdx = new Set<number>();
  const linkBullets = bulletAnalysis as unknown as LiveBulletItem[];
  for (const t of hiddenTexts) {
    const n = normalizeForMatch(t);
    if (n) hiddenNorms.add(n);
    const i = findBulletIndexForLine(t, linkBullets);
    if (i >= 0) hiddenAnalysisIdx.add(i);
  }

  // ── bulletAnalysis: drop hidden, resolve edited ─────────────────────────────
  const resolvedOriginals = new Set<string>();
  const outBullets: ReconcileBullet[] = [];
  bulletAnalysis.forEach((e, idx) => {
    const origNorm = normalizeForMatch(e.originalBullet);
    if ((origNorm && hiddenNorms.has(origNorm)) || hiddenAnalysisIdx.has(idx)) {
      if (origNorm) resolvedOriginals.add(origNorm); // gone from the résumé
      return;
    }
    const override = (lineOverrides[idx] ?? "").trim();
    if (!override || normalizeForMatch(override) === origNorm) {
      outBullets.push(e); // untouched — keep verbatim
      return;
    }
    const cats = bulletCategories(e);
    const quantFlagged = cats.includes("quantification");
    const material = isMaterialEdit(e.originalBullet, override);
    const metricAdded = addsMetricNumeral(e.originalBullet, override);
    // Which flagged categories does this edit resolve?
    //   quantification → only when a real metric numeral was added
    //   everything else → only on a materially-substantive rewrite
    const surviving = cats.filter((c) =>
      c === "quantification" ? !metricAdded : !material,
    );
    if (surviving.length === cats.length) {
      // Nothing resolved (near-no-op edit, no new metric) → keep the flag, but
      // reflect the user's edited text so the card matches the résumé.
      outBullets.push({ ...e, originalBullet: override });
      return;
    }
    if (surviving.length === 0) {
      resolvedOriginals.add(origNorm); // fully resolved → drop the flag
      return;
    }
    // Partially resolved: only quantification remains. Update the text and drop
    // stale rewrites/tags for the now-resolved categories.
    outBullets.push({
      ...e,
      originalBullet: override,
      primaryCategory: "quantification",
      issueCategories: ["quantification"],
      improvedBullet: "",
      categoryRewrites: undefined,
      issues: (e.issues ?? []).filter((t) => QUANT_TAG_RE.test(t)),
    });
  });

  // ── topIssues: prune items that referenced resolved/hidden bullets ──────────
  const isResolvedText = (t: string): boolean => {
    const n = normalizeForMatch(t);
    if (n && (hiddenNorms.has(n) || resolvedOriginals.has(n))) return true;
    // Fuzzy fallback: a quoted item that links to a hidden analysis entry.
    const i = findBulletIndexForLine(t, linkBullets);
    return i >= 0 && hiddenAnalysisIdx.has(i);
  };
  const outIssues: ReconcileTopIssue[] = [];
  for (const it of topIssues) {
    if (!it.items || it.items.length === 0) {
      outIssues.push(it); // not bullet-scoped (structural / ATS / formatting) — keep
      continue;
    }
    const keptItems = it.items.filter((item) => !isResolvedText(item));
    if (keptItems.length === 0) {
      continue; // every quoted bullet fixed/hidden AND the issue was bullet-scoped
    }
    outIssues.push(keptItems.length === it.items.length ? it : { ...it, items: keptItems });
  }

  // ── categoryRationales: clear only for categories the edits LIFTED to healthy ─
  let outRationales: Record<string, string> | undefined = categoryRationales;
  if (categoryRationales && Object.keys(categoryRationales).length) {
    const next: Record<string, string> = {};
    for (const [cat, text] of Object.entries(categoryRationales)) {
      const projected = projectedCategories[cat];
      const original = categoryScores[cat];
      const lifted =
        typeof projected === "number" && typeof original === "number" && projected > original;
      if (lifted && projected >= healthyScore) continue; // stale "why it's low" note
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
