"use client";

import React from "react";
import { useCachedResource } from "@/lib/clientCache";
import { fetchScoreStanding, formatScoreStanding, scoreStandingDetail } from "@/lib/scoreStanding";
import { FS, FW } from "@/lib/typography";

/**
 * Where this score sits against every résumé we have scored.
 *
 * Self-contained fetch, renders nothing when there is nothing to say — the
 * `FeaturedCompaniesRail` / `TopJobsToast` pattern, so the sidebar does not
 * have to thread a request through the Analyze state machine for one line of
 * context. Cached above the component tree because every view under
 * `RouterView` unmounts on a `?view=` switch.
 *
 * Deliberately NOT tinted green or red. A percentile is a measurement, and
 * colouring it would restate it as a verdict about the person — which is the
 * one thing this line must not become. The score ring above it is already the
 * judgement; this is the reference class that makes the ring mean something.
 */
export default function ScoreStandingLine({ score }: { score: number }) {
  const rounded = Number.isFinite(score) ? Math.round(score) : null;
  const { data } = useCachedResource(
    rounded == null ? null : `score-standing:${rounded}`,
    (signal) => fetchScoreStanding(rounded as number, signal),
    { ttlMs: 5 * 60_000 },
  );

  // Null covers three cases that all render the same: still loading, too small
  // a sample for the API to answer, and a request that failed. None of them is
  // worth a placeholder — an empty slot beats a spinner for a line nobody is
  // waiting on.
  if (!data) return null;

  return (
    <div
      title={scoreStandingDetail(data)}
      style={{
        marginTop: 4,
        fontSize: FS.caption,
        fontWeight: FW.medium,
        color: "var(--muted)",
        textAlign: "center",
        lineHeight: 1.45,
      }}
    >
      {formatScoreStanding(data)}
    </div>
  );
}
