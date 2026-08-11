/**
 * "Is 72 good?" — the question a score out of 100 cannot answer on its own.
 *
 * A grade with no reference class is not information: the same 72 could be
 * excellent or poor and the reader has no way to tell, so the number lands as
 * a judgement rather than a fact. A percentile gives it a meaning, and unlike a
 * competitor's "3x more interviews" this one is computed from résumés we
 * actually scored and we can show our working (`resume_gui/analysis/percentile.py`).
 *
 * THE HONESTY CONSTRAINTS, since this is a statistic shown to a person about
 * themselves:
 *
 *  1. **The claim is scoped to our own data, in the copy itself.** "of résumés
 *     we've scored" — never "top 20% of résumés", which would imply a universal
 *     benchmark over a self-selected sample of people who came to a résumé
 *     scoring tool.
 *  2. **A low standing is printed, not hidden.** Suppressing unflattering
 *     percentiles while showing flattering ones turns a measurement into a
 *     compliment. Below the median the line carries the median too, so it reads
 *     as a target rather than a verdict.
 *  3. **A malformed or absent payload renders nothing.** `{standing: null}` is
 *     a first-class answer from the API meaning "we don't hold enough scores to
 *     say anything worth printing"; so is a field that fails to parse. Neither
 *     may become "Stronger than NaN%".
 */

import { apiFetch } from "@/lib/apiClient";

export type ScoreStanding = {
  /** Share of the population this score strictly beats, 0-99. */
  percentile: number;
  /** How many people the comparison is against. */
  sampleSize: number;
  /** The population's median score, so a low standing can name its target. */
  median: number;
};

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Parse the API's `standing` object, or null if any field is missing or junk.
 *
 * Strict on purpose: a partially-parsed standing would print a confident
 * sentence around a missing number, which is worse than printing nothing.
 */
export function standingFrom(raw: unknown): ScoreStanding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const percentile = finite(r.percentile);
  const sampleSize = finite(r.sampleSize);
  const median = finite(r.median);
  if (percentile == null || sampleSize == null || median == null) return null;
  if (sampleSize <= 0) return null;
  return { percentile, sampleSize, median };
}

/** `GET /api/score-standing?score=NN`. Resolves null when there is nothing to say. */
export async function fetchScoreStanding(score: number, signal?: AbortSignal): Promise<ScoreStanding | null> {
  const res = await apiFetch(`/api/score-standing?score=${Math.round(score)}`, { signal });
  if (!res.ok) throw new Error(`score-standing failed (${res.status})`);
  const body = (await res.json()) as { standing?: unknown };
  return standingFrom(body?.standing);
}

/**
 * The line under the ring.
 *
 * At or above the median the percentile is the whole message. Below it, the
 * median comes along — that is the actionable half, and it is why the API
 * returns it. The scoping phrase stays in both, because the claim is about our
 * corpus and nothing else.
 */
export function formatScoreStanding(standing: ScoreStanding): string {
  const lead = `Stronger than ${standing.percentile}% of résumés we've scored`;
  if (standing.percentile >= 50) return lead;
  return `${lead} · median is ${Math.round(standing.median)}`;
}

/**
 * The disclosure, one hover away: sample size and — the non-obvious part — that
 * the comparison is against each person's FIRST scan, not their best or their
 * latest. That rule is what keeps the bar from drifting up with engagement, and
 * a reader who wants to know whether to believe the number deserves to see it.
 */
export function scoreStandingDetail(standing: ScoreStanding): string {
  return `Compared with the first scan from each of ${standing.sampleSize} people. Median score ${Math.round(standing.median)}.`;
}
