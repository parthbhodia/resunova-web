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
        borderRadius: 14,
        padding: "16px 17px 14px",
        background: "var(--card)",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Mockup v7 drops the coloured dot that used to sit beside the eyebrow. The
 * figure below is now colour-coded, so the dot was a second, smaller copy of
 * the same signal.
 */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: FS.micro,
        fontWeight: FW.bold,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * The tile's figure, meter and one-line footer.
 *
 * v7 makes the number the loudest thing in the rail: 34px, tinted by band, over
 * a thin meter. The raw counts move to the right of the footer, where they stay
 * checkable without competing with the percentage.
 */
function HeroTile({
  eyebrow,
  value,
  suffix,
  ratio,
  color,
  target,
  footLeft,
  footLeftFlag,
  footRight,
}: {
  eyebrow: React.ReactNode;
  value: React.ReactNode;
  suffix: string;
  /** 0..1, or null when there is nothing to measure. */
  ratio: number | null;
  color: string;
  /** 0..1 marker on the meter, e.g. the grade worth aiming at. */
  target?: number;
  footLeft?: React.ReactNode;
  footLeftFlag?: boolean;
  footRight?: React.ReactNode;
}) {
  return (
    <Tile>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 34,
            fontWeight: FW.extrabold,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color,
          }}
        >
          {value}
          <span style={{ fontSize: FS.small, fontWeight: FW.semibold, color: "var(--muted)" }}>{suffix}</span>
        </span>
      </div>
      {ratio !== null ? (
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--surface-2, rgba(127,127,127,0.14))",
            overflow: "hidden",
            marginTop: 11,
            position: "relative",
          }}
        >
          <span
            className="tq-meter"
            style={{
              display: "block",
              height: "100%",
              width: "100%",
              borderRadius: 999,
              transform: `scaleX(${Math.min(1, Math.max(0, ratio))})`,
              background: color,
            }}
          />
          {target !== undefined ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: -2,
                bottom: -2,
                left: `${Math.min(100, Math.max(0, target * 100))}%`,
                width: 2,
                background: "var(--text)",
                opacity: 0.35,
              }}
            />
          ) : null}
        </div>
      ) : null}
      {footLeft || footRight ? (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 9,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: FS.small,
              color: footLeftFlag ? "var(--amber-ink, #b45309)" : "var(--muted)",
              fontWeight: footLeftFlag ? FW.semibold : FW.normal,
            }}
          >
            {footLeft}
          </span>
          {footRight}
        </div>
      ) : null}
    </Tile>
  );
}

export function TailorScoreboard({
  found,
  total,
  unit = "keywords",
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
  /** What `found`/`total` count. Must match where they came from: the live
   *  recount scores JD requirements, the scan fallback counts rater keywords. */
  unit?: "requirements" | "keywords";
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
  const ratio = total > 0 ? found / total : null;
  const openCount = total > 0 ? total - found : 0;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <HeroTile
          eyebrow={live ? "ATS match · live" : "ATS match"}
          value={ratio === null ? "—" : Math.round(ratio * 100)}
          suffix={ratio === null ? "" : "%"}
          ratio={ratio}
          color={ratio === null ? "var(--text)" : coverageColor(ratio)}
          footLeft={openCount > 0 ? `${openCount} unmatched` : null}
          footLeftFlag={openCount > 0}
          footRight={
            total > 0 ? (
              <span
                role="img"
                aria-label={`${found} of ${total} ${unit} matched`}
                style={{ fontSize: FS.small, fontWeight: FW.bold, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
              >
                {found}/{total}
              </span>
            ) : null
          }
        />
        {/* Kept although the mockup has no line for it.
         *
         * This tile shipped once saying "live · recounted the moment you add a
         * change" while nothing recounted, and the label is the entire reason a
         * user believes the number. The mockup is a visual language, not a
         * decision to stop disclosing where the figure came from, so the
         * provenance stays as one quiet line under the tiles rather than being
         * dropped along with the old caption stack. Tests pin it in BOTH
         * directions, because the cheap way to "fix" an over-promising label is
         * to promise it again. */}
        <HeroTile
          eyebrow="Quality grade"
          value={grade === null ? "—" : grade}
          suffix={grade === null ? "" : "/100"}
          ratio={grade === null ? null : grade / 100}
          color={grade === null ? "var(--text)" : coverageColor(grade / 100)}
          // The bar a strong résumé clears. Drawn on the LLM grade, which is a
          // quality judgement we produce ourselves, and never on the ATS meter,
          // where any "shortlist threshold" number would be folklore we cannot
          // source.
          target={grade === null ? undefined : 0.9}
          footLeft={grade === null ? "Not graded yet" : gradedAtLabel ? `Graded by AI at ${gradedAtLabel}` : "Graded by AI"}
          footRight={
            onRecheck ? (
              <button
                type="button"
                onClick={onRecheck}
                disabled={recheckBusy}
                style={{
                  border: 0,
                  background: "none",
                  color: "var(--muted)",
                  fontSize: FS.small,
                  fontWeight: FW.semibold,
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  whiteSpace: "nowrap",
                  cursor: recheckBusy ? "default" : "pointer",
                  opacity: recheckBusy ? 0.6 : 1,
                }}
              >
                {recheckBusy ? "Re-checking…" : "Re-check"}
              </button>
            ) : null
          }
        />
      </div>
      {/* Provenance for both tiles, on one quiet line under them rather than as
          a caption stack inside each. See the note above the grade tile: the
          mockup drops this, and it is the one thing in the redesign that is not
          safe to drop. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 7,
          fontSize: FS.caption,
        }}
      >
        <span style={{ color: !live && stale ? "var(--amber-ink, #b45309)" : "var(--muted)" }}>
          {live
            ? lost > 0
              ? `Recounted as you edit. ${lost} requirement${lost === 1 ? "" : "s"} no longer covered.`
              : "Recounted as you edit. Free."
            : stale
              ? "Fixes applied · not recounted yet."
              : "Counted from your last scan."}
        </span>
        {stale ? (
          <span style={{ color: "var(--amber-ink, #b45309)" }}>
            Résumé changed since grading. Re-check when you&rsquo;re done editing.
          </span>
        ) : null}
      </div>
    </div>
  );
}

