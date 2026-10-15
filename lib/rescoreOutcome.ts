/**
 * Turn an /api/analyze-rescore body into the outcome Analyze already knows
 * how to show. Kept pure so the odd responses can be tested without mounting
 * the tailor page: a null body, an array, a saved row that is not an object,
 * a NaN score, or an id with no readable report.
 */

export interface RescoreOutcome {
  ok: boolean;
  status: number;
  json: Record<string, unknown> & { error?: string };
  fileName: string;
}

export interface SavedRescoreRow {
  result?: unknown;
  score?: number | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasFiniteScore(json: Record<string, unknown>): boolean {
  return [json.overallScore, json.overall_score].some(
    (n) => typeof n === "number" && Number.isFinite(n),
  );
}

export function rescoreBodyHasScore(body: unknown): boolean {
  return isPlainObject(body) && hasFiniteScore(body);
}

export function rescoreAnalysisId(body: unknown): string {
  if (!isPlainObject(body) || typeof body.analysisId !== "string") return "";
  return body.analysisId.trim();
}

export function rescoreBodyToOutcome(
  status: number,
  body: unknown,
  fileName: string,
  saved?: SavedRescoreRow | null,
): RescoreOutcome {
  const data = isPlainObject(body) ? body : {};
  if (status < 200 || status >= 300) {
    const json: Record<string, unknown> & { error?: string } = { ...data };
    if (typeof json.error !== "string" || !json.error.trim()) {
      json.error = "Couldn't run the scan. Try again.";
    }
    return { ok: false, status, json, fileName };
  }

  let json: Record<string, unknown> = data;
  if (!hasFiniteScore(json) && isPlainObject(saved?.result)) {
    const id = typeof data.analysisId === "string" && data.analysisId.trim()
      ? data.analysisId.trim()
      : undefined;
    json = { ...saved.result, ...(id ? { analysisId: id } : {}) };
    // The row's score column is the same number the report shows. Use it only
    // when the saved JSON is already an analysis that simply omitted the field,
    // not when the JSON is an empty object we would render as a blank report.
    const looksLikeAnalysis = json.bulletAnalysis != null
      || json.bullet_analysis != null
      || json.categoryScores != null
      || json.category_scores != null
      || typeof json.extractedText === "string"
      || typeof json.extracted_text === "string";
    if (!hasFiniteScore(json) && typeof saved?.score === "number" && Number.isFinite(saved.score) && looksLikeAnalysis) {
      json = { ...json, overallScore: saved.score };
    }
  }

  if (!hasFiniteScore(json)) {
    return {
      ok: false,
      status,
      json: { error: "The scan ran but couldn't be saved. Try again." },
      fileName,
    };
  }
  return { ok: true, status, json, fileName };
}
