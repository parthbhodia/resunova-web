import type { RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";

/**
 * The rater's per-dimension sub-scores, for the quiet breakdown row under the
 * quality grade (founder-asked 2026-08-14: the previous design scored per
 * dimension "for users to make it easy").
 *
 * Display-only orientation. The old dimension CHIPS were removed for being a
 * second filter taxonomy over one list; this is the number set they carried,
 * without the controls. Keywords are deliberately ABSENT: the deterministic
 * keyword coverage IS the ATS match block above, and repeating it here under
 * the LLM grade would blend the two provenances the card exists to separate.
 */
export function gradeDimensions(
  ratings: RatingsData | null | undefined,
): Array<{ label: string; score: number }> {
  if (!ratings || !isDetailedRatings(ratings)) return [];
  const out: Array<{ label: string; score: number }> = [];
  const push = (label: string, score: unknown) => {
    if (typeof score === "number" && Number.isFinite(score)) out.push({ label, score });
  };
  push("Qualifications", ratings.qualifications?.score);
  push("Responsibilities", ratings.responsibilities?.score);
  push("Title", ratings.job_title?.score);
  return out;
}
