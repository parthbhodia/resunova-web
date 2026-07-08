/**
 * Bakes the user's applied Analyze-preview edits (bullet rewrites + summary
 * override) into the extracted text and the structured résumé, producing the
 * payload for POST /api/analyze-rescore.
 *
 * Matching is by normalized ORIGINAL bullet text — never by bulletMap index.
 * `lineOverrides` is keyed by bulletAnalysis index (a sparse weakest-only
 * subset), while bulletMap enumerates every structured bullet, so the two
 * index spaces do not line up (see CLAUDE.md invariant on bulletMap).
 */
import { normalizeForMatch } from "@/lib/resumeBulletMatch";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

interface RescoreBulletSource {
  originalBullet?: string;
}

export interface AppliedEditsPatch {
  patchedText: string;
  patchedStructured: StructuredResume | null;
  /** Distinct edits that landed in the text and/or the structured doc. */
  appliedCount: number;
}

interface ReplacementPair {
  origNorm: string;
  text: string;
  hit: boolean;
}

const LEADING_MARKER_RE = /^(\s*[•*·◦▪\-–—>▸→]+\s*)/u;

function stripMarker(line: string): { prefix: string; body: string } {
  const m = line.match(LEADING_MARKER_RE);
  if (!m) return { prefix: "", body: line };
  return { prefix: m[1], body: line.slice(m[1].length) };
}

function patchBulletArray(bullets: string[], pairs: ReplacementPair[]): string[] {
  return bullets.map((b) => {
    const norm = normalizeForMatch(b);
    if (!norm) return b;
    const pair = pairs.find((p) => p.origNorm === norm);
    if (!pair) return b;
    pair.hit = true;
    return pair.text;
  });
}

export function patchAppliedEditsIntoResume(opts: {
  extractedText: string;
  structuredResume: StructuredResume | null;
  analysisBullets: RescoreBulletSource[];
  lineOverrides: Record<number, string>;
  summaryOverride?: string;
  /** Rendered TEXT of bullets the user hid in the preview (no marker).
   *  Resolved from `hiddenPaths` via `hiddenBulletTextsFromStructured`. */
  hiddenBulletTexts?: string[];
}): AppliedEditsPatch {
  const { extractedText, structuredResume, analysisBullets, lineOverrides } = opts;
  const summaryOverride = (opts.summaryOverride ?? "").trim();

  const hiddenNorms = new Set<string>();
  for (const t of opts.hiddenBulletTexts ?? []) {
    const norm = normalizeForMatch(t ?? "");
    if (norm) hiddenNorms.add(norm);
  }
  const isHidden = (line: string): boolean =>
    hiddenNorms.size > 0 && hiddenNorms.has(normalizeForMatch(line));

  const pairs: ReplacementPair[] = [];
  for (const [key, replacement] of Object.entries(lineOverrides)) {
    const idx = Number(key);
    const orig = (analysisBullets[idx]?.originalBullet ?? "").trim();
    const text = (replacement ?? "").trim();
    if (!orig || !text) continue;
    const origNorm = normalizeForMatch(orig);
    if (!origNorm || origNorm === normalizeForMatch(text)) continue;
    pairs.push({ origNorm, text, hit: false });
  }

  // ── Patch the structured résumé (deep copy) ────────────────────────────────
  let patchedStructured: StructuredResume | null = null;
  const originalSummary = (structuredResume?.summary ?? "").trim();
  if (structuredResume) {
    patchedStructured = JSON.parse(JSON.stringify(structuredResume)) as StructuredResume;
    // Drop hidden bullets first (by normalized text), then rewrite survivors.
    const dropHidden = (bullets: string[]): string[] =>
      hiddenNorms.size ? bullets.filter((b) => !isHidden(b)) : bullets;
    if (pairs.length || hiddenNorms.size) {
      patchedStructured.experience = (patchedStructured.experience ?? []).map((exp) => ({
        ...exp,
        bullets: patchBulletArray(dropHidden(exp.bullets ?? []), pairs),
      }));
      patchedStructured.projects = (patchedStructured.projects ?? []).map((proj) => ({
        ...proj,
        bullets: patchBulletArray(dropHidden(proj.bullets ?? []), pairs),
      }));
      patchedStructured.education = (patchedStructured.education ?? []).map((edu) => ({
        ...edu,
        bullets: patchBulletArray(dropHidden(edu.bullets ?? []), pairs),
      }));
    }
    if (summaryOverride) patchedStructured.summary = summaryOverride;
  }

  // ── Patch the flat extracted text line-by-line ─────────────────────────────
  let summaryApplied = false;
  let textHiddenCount = 0;
  const lines: string[] = [];
  for (const line of extractedText.split("\n")) {
    const { prefix, body } = stripMarker(line);
    const norm = normalizeForMatch(body);
    if (!norm) {
      lines.push(line);
      continue;
    }
    if (isHidden(body)) {
      textHiddenCount += 1;
      continue; // drop the hidden bullet line from the flat text
    }
    const pair = pairs.find((p) => p.origNorm === norm);
    if (pair) {
      pair.hit = true;
      lines.push(prefix + pair.text);
      continue;
    }
    if (
      summaryOverride &&
      originalSummary &&
      !summaryApplied &&
      normalizeForMatch(body) === normalizeForMatch(originalSummary)
    ) {
      summaryApplied = true;
      lines.push(prefix + summaryOverride);
      continue;
    }
    lines.push(line);
  }
  let patchedText = lines.join("\n");
  // Multi-line summary fallback: exact substring replace on the raw text.
  if (summaryOverride && originalSummary && !summaryApplied && patchedText.includes(originalSummary)) {
    patchedText = patchedText.replace(originalSummary, summaryOverride);
    summaryApplied = true;
  }

  // A hidden bullet counts as an applied edit if it landed in the structured
  // doc or the flat text — so "Update score" is enabled after hiding even with
  // no rewrite/summary edit.
  const hidingApplied = hiddenNorms.size > 0 && (textHiddenCount > 0 || !!patchedStructured);
  const appliedCount =
    pairs.filter((p) => p.hit).length +
    (summaryOverride && (summaryApplied || patchedStructured) ? 1 : 0) +
    (hidingApplied ? Math.max(textHiddenCount, hiddenNorms.size) : 0);

  return { patchedText, patchedStructured, appliedCount };
}
