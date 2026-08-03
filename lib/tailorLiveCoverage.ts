/**
 * Live requirement coverage for the Tailor scoreboard.
 *
 * The tile has said "ATS MATCH · LIVE — Recounted the moment you add a change"
 * while doing nothing of the sort: `found`/`total` came from `ratings.keywords`
 * on the last scan, and applying a fix only set `scoreStale` and optimistically
 * moved the row to covered. A user could apply several fixes, watch every row
 * turn green, and the percentage would not move under a label promising it had.
 *
 * The number cannot be recomputed in the browser. `calculate_weighted_jd_score`
 * is bucket-weighted and renormalized over non-empty buckets, so per-item
 * deltas do not sum. Hence `POST /api/tailor/score-preview`, which is
 * deterministic, stateless and zero-token: we hand back the requirementConcepts
 * the analyze response already gave us, plus the current résumé text.
 *
 * Failure is silent by design. This is a nicety on top of a number that still
 * has a truthful fallback (the last scan's counts); an outage here must not
 * put an error in front of someone editing their résumé.
 */
import { apiFetch } from "@/lib/apiClient";

export interface LiveCoverage {
  /** Weighted score before the pending edits, or null when nothing to score. */
  before: number | null;
  after: number | null;
  matchedBefore: number;
  matched: number;
  total: number;
  gained: Array<{ id: string; canonical: string; importance: string }>;
  lost: Array<{ id: string; canonical: string; importance: string }>;
}

/** Debounce so a Fix-everything pass lands one request, not one per wave. */
export const COVERAGE_DEBOUNCE_MS = 400;

export async function fetchLiveCoverage(
  concepts: readonly unknown[],
  resumeText: string,
  signal?: AbortSignal,
): Promise<LiveCoverage | null> {
  if (!concepts.length || !resumeText.trim()) return null;
  try {
    const resp = await apiFetch("/api/tailor/score-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requirement_concepts: concepts,
        resume_text: resumeText,
      }),
      signal,
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Partial<LiveCoverage> & { reason?: string };
    // "no_concepts" / "no_resume_text" mean there was nothing to score. That is
    // not an error, but it is also not a number worth showing, so fall back to
    // the scan counts rather than rendering a zero the user would misread.
    if (typeof data.total !== "number" || data.total <= 0) return null;
    return {
      before: typeof data.before === "number" ? data.before : null,
      after: typeof data.after === "number" ? data.after : null,
      matchedBefore: data.matchedBefore ?? 0,
      matched: data.matched ?? 0,
      total: data.total,
      gained: data.gained ?? [],
      lost: data.lost ?? [],
    };
  } catch {
    return null; // includes AbortError when a newer edit superseded this one
  }
}
