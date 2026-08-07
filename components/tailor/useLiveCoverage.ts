"use client";

/**
 * Recount requirement coverage whenever the résumé text changes.
 *
 * Kept as a hook rather than folded into TailorQueuePanel so the fallback rule
 * lives in one place: when there are no concepts, the request fails, or there
 * is nothing to score, callers get the last scan's counts back unchanged and
 * the tile keeps saying something true.
 */
import { useEffect, useRef, useState } from "react";
import {
  COVERAGE_DEBOUNCE_MS,
  fetchLiveCoverage,
  type LiveCoverage,
} from "@/lib/tailorLiveCoverage";
import type { UnmatchedRequirement } from "@/lib/tailorRequirementQueue";

const NO_UNMATCHED: readonly UnmatchedRequirement[] = [];

export interface CoverageView {
  found: number;
  total: number;
  /** True only when these numbers came from a recount of the current text. */
  live: boolean;
  /** Requirements the pending edits newly satisfy, for the delta line. */
  gained: number;
  /** Requirements the edits dropped. Reported, never hidden. */
  lost: number;
  /** The unmatched requirements themselves, so the queue can show a row per
   *  one. Empty when no recount has landed — the caller then keeps the
   *  rater-derived queue it already had. */
  unmatched: readonly UnmatchedRequirement[];
}

export function useLiveCoverage(
  concepts: readonly unknown[] | undefined,
  resumeText: string,
  fallback: { found: number; total: number },
): CoverageView {
  const [live, setLive] = useState<LiveCoverage | null>(null);
  // Keep the last good recount visible while the next one is in flight, so the
  // number does not flicker back to the stale scan on every keystroke.
  const lastGood = useRef<LiveCoverage | null>(null);

  const canScore = Boolean(concepts?.length) && resumeText.trim().length > 0;

  useEffect(() => {
    if (!canScore) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      void fetchLiveCoverage(concepts ?? [], resumeText, ctrl.signal).then((r) => {
        if (ctrl.signal.aborted) return;
        if (r) lastGood.current = r;
        // Only ever set from the async result: setting synchronously in the
        // effect body would cascade a render on every text change.
        setLive(r ?? lastGood.current);
      });
    }, COVERAGE_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [canScore, concepts, resumeText]);

  // Derived, not reset in an effect: when the inputs go away the previous
  // recount stops applying immediately rather than after an extra render.
  if (!canScore || !live) {
    return {
      ...fallback,
      live: false,
      gained: 0,
      lost: 0,
      unmatched: NO_UNMATCHED,
    };
  }
  return {
    found: live.matched,
    total: live.total,
    live: true,
    gained: live.gained.length,
    lost: live.lost.length,
    unmatched: live.unmatched,
  };
}
