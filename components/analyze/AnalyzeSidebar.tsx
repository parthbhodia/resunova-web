// Presentational sidebar pieces for the Analyze flow, extracted from
// AnalyzeResume.tsx (Slice 3 of docs/ANALYZE_REFACTOR_PLAN.md).
//
// SCOPE: only the genuinely presentational rail — the pinned header
// (Recent-Analyses label OR score ring + tenure) and the pre-result
// history list (skeleton / empty / rows). Neither owns state; the one fetch in
// here is `ScoreStandingLine`, a self-contained child that renders nothing
// until it has an answer. The RESULT-state "Improvement Plan"
// panel (category selection, save-version, bullet fix cards) stays in
// AnalyzeResume because it is wired into the edit/rescore state machine; that
// interactive extraction is Slice 4 and is gated on live browser verification.
// This move is behavior-preserving — the JSX is copied verbatim, its former
// closure references become props.

import React from "react";
import ScoreRing from "../ScoreRing";
import { Skeleton } from "@/components/ui/skeleton";
import { FS, FW } from "@/lib/typography";
import type { AnalysisResult } from "./analyzeTypes";
import { scoreColor, scoreLabel, formatExperienceTenureChip } from "./analyzeViewHelpers";
import {
  computeScoreProgress,
  formatScoreProgress,
  scoreProgressTone,
  type ScoreProgressEntry,
} from "./scoreProgress";
import ScoreStandingLine from "./ScoreStandingLine";

/** Pinned (non-scrolling) sidebar header. Before an analysis: a "Recent
 * Analyses" label. After: the overall score ring + label + tenure chip, plus
 * the edit-at-score entry point (M2): editing must be discoverable exactly
 * where the score is judged. */
export function AnalyzeSidebarPinned({
  result,
  onEditResume,
  hasEditedVersion = false,
  history = [],
}: {
  result: AnalysisResult | null;
  onEditResume?: () => void;
  hasEditedVersion?: boolean;
  /** Past runs, for the progress line under the ring. Safe to omit. */
  history?: readonly ScoreProgressEntry[];
}) {
  const progress = computeScoreProgress(history);
  if (!result) {
    return (
      <>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontFamily: "var(--font-sans), Inter, system-ui, sans-serif" }}>
          Recent Analyses
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.45 }}>
          Saves scores and extracted résumé text to your account (not the original PDF file).
        </div>
      </>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#78909c", textTransform: "uppercase", letterSpacing: 1.15, marginBottom: 10, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Improvement Plan
      </div>
      <ScoreRing score={result.overallScore} size={96} label="" />
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: scoreColor(result.overallScore) }}>
        {scoreLabel(result.overallScore)}
      </div>
      {/* ONE line of context under the ring, never two.
          The arc wins when there is one: "up 12 since Jun 10" is about this
          person's own work, which beats any comparison against strangers. With
          only one scan on record there is no arc yet — and that is exactly the
          visit where a bare number means least, and exactly the cohort that
          scans once and never returns, so the percentile takes the slot.
          Deliberately quiet either way: a second bold figure here would compete
          with the ring for the same glance, and the ring is the reading. */}
      {progress ? (
        <div
          style={{
            marginTop: 4,
            fontSize: FS.caption,
            fontWeight: FW.semibold,
            color: scoreProgressTone(progress),
            textAlign: "center",
            lineHeight: 1.45,
          }}
        >
          {formatScoreProgress(progress)}
        </div>
      ) : (
        <ScoreStandingLine score={result.overallScore} />
      )}
      {onEditResume && (
        <button
          type="button"
          onClick={onEditResume}
          style={{
            marginTop: 10,
            padding: "7px 16px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--accent-bg)",
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          ✎ {hasEditedVersion ? "Keep editing" : "Edit résumé"}
        </button>
      )}
      {hasEditedVersion && (
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
          Your edited résumé is saved
        </div>
      )}
      {formatExperienceTenureChip(result.experienceSummary) && (
        <div
          title="Parsed from experience section date ranges (internships included). Overlapping roles are merged."
          style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            textAlign: "center",
            lineHeight: 1.45,
            padding: "4px 8px",
            borderRadius: 8,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            maxWidth: "100%",
          }}
        >
          {formatExperienceTenureChip(result.experienceSummary)}
        </div>
      )}
    </div>
  );
}

/** Pre-result scrolling rail: loading skeleton, empty state, or the history
 * rows (prebuilt by the caller and passed through). */
export function AnalyzeHistoryRail({
  loading,
  empty,
  rows,
}: {
  loading: boolean;
  empty: boolean;
  rows: React.ReactNode;
}) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <Skeleton className="h-[11px] rounded w-3/4" />
              <Skeleton className="h-[10px] rounded w-[55%]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <div style={{ fontSize: 13, color: "var(--dim)", textAlign: "center", paddingTop: 24, lineHeight: 1.7 }}>
        No analyses yet.<br />
        <span style={{ fontSize: 12 }}>Upload a PDF above<br />to get started.</span>
      </div>
    );
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{rows}</div>;
}
