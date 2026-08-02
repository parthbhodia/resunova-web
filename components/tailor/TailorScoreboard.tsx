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
  grade,
  gradedAtLabel,
  stale,
  onRecheck,
  recheckBusy,
}: {
  /** Deterministic requirement/keyword coverage — live, free. */
  found: number;
  total: number;
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
        {/* Deliberately NOT labelled "live". These counts come from
            ratings.keywords on the last scan, and applyGapFixes does not
            rescore — it sets scoreStale and moves the item to covered. So
            after an applied fix this number is a before-picture until the
            user re-checks. The old copy ("live", "recounted the moment you
            add a change") described a behaviour the code has never had.
            When /api/tailor/score-preview lands this becomes a real live
            count and the wording can change with it. */}
        <Eyebrow dot={stale ? "var(--amber-ink, #b45309)" : "var(--green-ink, #16a34a)"}>
          Requirement coverage
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
        <div
          style={{
            fontSize: FS.caption,
            color: stale ? "var(--amber-ink, #b45309)" : "var(--muted)",
            marginTop: 2,
          }}
        >
          {stale
            ? "Fixes applied · score not rechecked yet."
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
