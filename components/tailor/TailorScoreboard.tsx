"use client";

/**
 * Two numbers, never blended.
 *
 * The deterministic ATS match (free, recomputed on every accepted change) and
 * the LLM quality grade (costs a scan, computed on demand) are different
 * things. Rendering them as one "score, provisional until re-check" forces the
 * user to reconcile them; two tiles with different update rules makes the
 * distinction structural. The grade tile never moves on its own — it dates
 * itself and grows a stale note once the résumé has changed under it.
 */

import React from "react";
import { FS, FW } from "@/lib/typography";

/**
 * Meter colour by coverage. The bands are a presentation choice about how much
 * of the requirement list is still open, NOT a claim about hiring outcomes, so
 * nothing in the UI reads them out as a verdict.
 */
export function coverageColor(ratio: number): string {
  if (ratio >= 0.9) return "var(--green-ink, #16a34a)";
  if (ratio >= 0.6) return "var(--amber-ink, #b45309)";
  return "var(--red-ink, #b42318)";
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 14px",
        background: "var(--card)",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: FS.micro,
        fontWeight: FW.bold,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}
    >
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />
      {children}
    </div>
  );
}

export function TailorScoreboard({
  found,
  total,
  live = false,
  lost = 0,
  grade,
  gradedAtLabel,
  stale,
  onRecheck,
  recheckBusy,
}: {
  /** Deterministic requirement coverage. */
  found: number;
  total: number;
  /** True only when these counts came from recounting the CURRENT text via
   *  /api/tailor/score-preview. Without it these are the last scan's numbers
   *  and the label must not claim otherwise. */
  live?: boolean;
  /** Requirements the pending edits dropped. Surfaced, never hidden: a rewrite
   *  can genuinely remove a term some other requirement was relying on. */
  lost?: number;
  /** LLM-graded score, or null when never graded this run. */
  grade: number | null;
  /** e.g. "2:41 PM" — when the grade was computed. */
  gradedAtLabel: string | null;
  /** The résumé changed since grading. */
  stale: boolean;
  onRecheck?: () => void;
  recheckBusy?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Tile>
        {/* The label tracks what actually happened. This tile used to say
            "live" and "Recounted the moment you add a change" while nothing
            recounted: found/total came off the last scan, and applying a fix
            only marked the score stale. Now `live` is set exactly when
            /api/tailor/score-preview has recounted the current text, and the
            wording follows it in both directions. */}
        <Eyebrow dot={live ? "var(--green-ink, #16a34a)" : "var(--muted)"}>
          {live ? "ATS match · live" : "ATS match"}
        </Eyebrow>
        <div
          style={{
            fontSize: 26,
            fontWeight: FW.extrabold,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {total > 0 ? `${Math.round((found / total) * 100)}%` : "—"}
          <span style={{ fontSize: FS.bodyLg, color: "var(--muted)", fontWeight: FW.semibold }}>
            {" "}· {found} of {total} keywords
          </span>
        </div>
        {/* A bare percentage does not tell a student whether 83 is good. The
            meter gives the number physical weight and makes the REMAINDER
            visible, which is the part they can still act on.

            Deliberately unmarked: no "shortlist threshold" line. Every number
            of that kind we could draw here (75%, 80%) is a competitor's
            published guidance or folklore, not something measured on this
            corpus, and drawing it would state as fact something nobody here
            can source. The honest urgency is the gap itself. */}
        {total > 0 ? (
          <div
            role="img"
            aria-label={`${found} of ${total} requirements matched`}
            style={{
              display: "flex",
              height: 7,
              borderRadius: 999,
              overflow: "hidden",
              background: "var(--surface-2, rgba(127,127,127,0.14))",
              marginTop: 8,
            }}
          >
            <span
              className="tq-meter"
              style={{
                width: "100%",
                transform: `scaleX(${Math.min(1, Math.max(0, found / total))})`,
                background: coverageColor(found / total),
              }}
            />
          </div>
        ) : null}
        {total > 0 && total - found > 0 ? (
          <div style={{ fontSize: FS.caption, marginTop: 5, color: coverageColor(found / total), fontWeight: FW.semibold }}>
            {total - found} still unmatched
          </div>
        ) : null}
        <div
          style={{
            fontSize: FS.caption,
            marginTop: 2,
            color: !live && stale ? "var(--amber-ink, #b45309)" : "var(--muted)",
          }}
        >
          {live
            ? lost > 0
              // An edit can drop a term another requirement relied on. Saying
              // so is the point of counting honestly rather than only counting
              // gains.
              ? `Recounted as you edit. ${lost} requirement${lost === 1 ? "" : "s"} no longer covered.`
              : "Recounted as you edit. Free."
            : stale
              ? "Fixes applied · not recounted yet."
              : "Counted from your last scan."}
        </div>
      </Tile>

      <Tile>
        <Eyebrow dot="var(--accent)">Quality grade</Eyebrow>
        <div
          style={{
            fontSize: 26,
            fontWeight: FW.extrabold,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
          }}
        >
          {grade === null ? "—" : grade}
          <span style={{ fontSize: FS.bodyLg, color: "var(--muted)", fontWeight: FW.semibold }}> / 100</span>
        </div>
        <div style={{ fontSize: FS.caption, color: "var(--muted)", marginTop: 2 }}>
          {grade === null
            ? "Not graded yet for this run."
            : gradedAtLabel
              ? `Graded by AI at ${gradedAtLabel}.`
              : "Graded by AI."}
        </div>
        {stale ? (
          <div style={{ fontSize: FS.caption, color: "var(--amber-ink, #b45309)", marginTop: 4 }}>
            Résumé changed since grading. Re-check when you&rsquo;re done editing.
          </div>
        ) : null}
        {onRecheck ? (
          <button
            type="button"
            onClick={onRecheck}
            disabled={recheckBusy}
            style={{
              marginTop: 6,
              fontSize: FS.small,
              fontWeight: FW.semibold,
              color: "var(--accent)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "4px 10px",
              cursor: recheckBusy ? "default" : "pointer",
              opacity: recheckBusy ? 0.6 : 1,
            }}
          >
            {recheckBusy ? "Re-checking…" : "Re-check · uses 1 scan"}
          </button>
        ) : null}
      </Tile>
    </div>
  );
}
