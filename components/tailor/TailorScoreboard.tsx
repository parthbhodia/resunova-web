"use client";

/**
 * Two numbers, never blended — and one of them leads.
 *
 * The deterministic ATS match (free, recomputed on every accepted change) and
 * the LLM quality grade (costs a scan, computed on demand) are different
 * things. Rendering them as one "score, provisional until re-check" forces the
 * user to reconcile them; separate treatments with different update rules makes
 * the distinction structural.
 *
 * WHY THE MATCH IS PRIMARY AND THE GRADE IS SECONDARY.
 *
 * They shipped as two equal tiles, which said the two numbers deserve equal
 * attention. They do not, and the queue below is the reason: every row in it is
 * a requirement the MATCH counts, so the match is the number the work moves.
 * The grade is a judgement about the document as a whole that no single row
 * changes and that only a re-check updates. Equal billing invited the user to
 * work on whichever number they liked, and one of them does not answer.
 *
 * Secondary means DEMOTED, NOT DELETED. The grade keeps its own meter, its own
 * target marker and its own dated provenance — it is quieter, not less honest.
 *
 * WHY THE BLOCKER COUNT IS NO LONGER HERE.
 *
 * It has been three things: a free-standing banner above the tiles, then an
 * entry row folded into the match block, and now the work queue's own header.
 * Each move was chasing the same problem — a red sentence sitting in the block
 * that is supposed to orient you.
 *
 * This block answers "where do I stand". The queue answers "what do I do".
 * Putting the failure count in the first one meant the first strong thing on
 * the page was red, and the moment the user actually arrived for (a tailored
 * résumé, ready) was the quietest thing on screen. The count belongs at the top
 * of the work, because that is where the work is. See TailorWorkQueue's header.
 *
 * The placement constraint that survives all three versions: the sentence must
 * not sit adjacent to the "Could get you filtered out" band strip, or the page
 * prints one idea twice in a row. The queue header therefore gives an
 * INSTRUCTION ("Start with the blockers") above a strip that gives a LABEL —
 * two different jobs, no repetition.
 *
 * WHY THIS IS ONE CARD AND NOT TWO.
 *
 * Two bordered cards read as two things to decide between, which is what the
 * hierarchy note above is arguing against — and the demotion was being fought
 * by the frame around it. One card with two rows keeps every disclosure (both
 * provenance lines, the stale note, the target marker, the re-check control)
 * and stops the grade looking like a second option.
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

const CARD: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "var(--card)",
  minWidth: 0,
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        // 11, not 10. Both are ladder steps, but 10px uppercase with 0.07em
        // tracking is under the legibility floor, and this label is what tells
        // the user WHICH of the two numbers they are looking at.
        fontSize: FS.caption,
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
 * The bar under a figure. `target` draws the mark at a value worth aiming at.
 *
 * That marker is only ever passed for the LLM grade. The grade is a judgement
 * we produce, so a bar on it is ours to set; any "shortlist threshold" on the
 * deterministic match would be folklore we cannot source. A test asserts there
 * is exactly one marker on the whole rail.
 */
function Meter({
  ratio,
  color,
  height,
  target,
}: {
  ratio: number;
  color: string;
  height: number;
  target?: number;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: 999,
        background: "var(--surface-2, rgba(127,127,127,0.14))",
        overflow: "hidden",
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
  dimensions,
}: {
  /** Deterministic coverage. Always drives the percentage and the meter; the
   *  raw counts render only when `live`, see the note at the tile. */
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
  /** The rater's per-dimension sub-scores (Qualifications / Responsibilities /
   *  Title). Display-only orientation under the grade they decompose. */
  dimensions?: Array<{ label: string; score: number }>;
}) {
  const ratio = total > 0 ? found / total : null;
  return (
    <div style={{ ...CARD, padding: "15px 16px 13px" }}>
      {/* ── PRIMARY: the deterministic match ───────────────────────────────
       * `data-score` exists for the tests and the browser drive: which block a
       * marker landed in is the whole claim of the hierarchy, and a check that
       * cannot tell them apart cannot fail. It survived the two cards becoming
       * one for exactly that reason. */}
      <div data-score="match">
        <Eyebrow>{live ? "ATS match · live" : "ATS match"}</Eyebrow>
        {/* The count is shown ONLY when `live`, and the two halves of that rule
         * are separate decisions.
         *
         * WHY IT IS EVER HIDDEN (user-directed 2026-08-07: "it is not holding
         * any value"): on the fallback path `found`/`total` are the rater's
         * KEYWORD counts, while the queue below lists what the rater filed as
         * MISSING. Nothing makes those agree, so the tile could read "21
         * unmatched" above a queue offering three rows. A count the user cannot
         * reconcile with the list beneath it is worse than no count.
         *
         * WHY IT COMES BACK WHEN LIVE: a recount scores the JD's extracted
         * requirements, which is the same set the queue is built from — the
         * disagreement is a property of the FALLBACK, not of counting. And a
         * bare "83%" is unfalsifiable: 83% of 6 and 83% of 200 are different
         * situations, and the queue's own count uses a different denominator,
         * so nothing else lets the user tell which they are in.
         *
         * This is also why no `unit` prop is needed. It existed to say WHICH
         * dataset a count came from, after requirements and keywords both
         * shipped labelled "keywords". Gating on `live` leaves exactly one
         * possible source, so the word is a constant.
         *
         * NOT restored: the "N unmatched" flag. Even live it is a worklist
         * claim, and the queue's count is legitimately larger (it merges
         * rater-only rows), so the two can still disagree. `found/total`
         * explains the percentage above it and claims nothing about the work. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: FS.displayLg,
              fontWeight: FW.extrabold,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: ratio === null ? "var(--text)" : coverageColor(ratio),
            }}
          >
            {ratio === null ? "—" : Math.round(ratio * 100)}
            {ratio === null ? null : (
              <span style={{ fontSize: FS.subhead, fontWeight: FW.semibold, color: "var(--muted)" }}>%</span>
            )}
          </span>
          {live && total > 0 ? (
            <span
              role="img"
              aria-label={`${found} of ${total} requirements matched`}
              style={{
                fontSize: FS.bodyLg,
                fontWeight: FW.bold,
                color: "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {found}/{total}
            </span>
          ) : null}
        </div>
        {ratio !== null ? (
          <div style={{ marginTop: 11 }}>
            <Meter ratio={ratio} color={coverageColor(ratio)} height={6} />
          </div>
        ) : null}
        {/* Provenance, kept although the mockup has no line for it.
         *
         * This number shipped once claiming "live · recounted the moment you
         * add a change" while nothing recounted, and that label is the entire
         * reason a user believes the figure. A mockup is a visual language, not
         * a decision to stop disclosing where a number came from. Tests pin it
         * in BOTH directions, because the cheap way to "fix" an over-promising
         * label is to promise it again. */}
        <div
          style={{
            marginTop: 8,
            fontSize: FS.caption,
            color: !live && stale ? "var(--amber-ink, #b45309)" : "var(--muted)",
          }}
        >
          {live
            ? lost > 0
              ? `Recounted as you edit. ${lost} requirement${lost === 1 ? "" : "s"} no longer covered.`
              : "Recounted as you edit. Free."
            : stale
              ? "Fixes applied · not recounted yet."
              : "Counted from your last scan."}
        </div>
      </div>

      {/* ── SECONDARY: the graded judgement ────────────────────────────────
       * Quieter by scale, not by disclosure: it keeps its meter, its target
       * marker, its timestamp and its own stale note. A hairline rather than a
       * second border — the two numbers are one orientation, read top to
       * bottom, not two cards to pick between. */}
      <div
        data-score="grade"
        style={{
          marginTop: 12,
          paddingTop: 11,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <Eyebrow>Quality grade</Eyebrow>
          {onRecheck ? (
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
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
          <span
            style={{
              fontSize: FS.h3,
              fontWeight: FW.extrabold,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              color: grade === null ? "var(--text)" : coverageColor(grade / 100),
            }}
          >
            {grade === null ? "—" : grade}
            {grade === null ? null : (
              <span style={{ fontSize: FS.small, fontWeight: FW.semibold, color: "var(--muted)" }}>/100</span>
            )}
          </span>
          {grade === null ? null : (
            <span style={{ flex: 1, minWidth: 60 }}>
              <Meter ratio={grade / 100} color={coverageColor(grade / 100)} height={4} target={0.9} />
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: FS.caption, color: "var(--muted)" }}>
          {grade === null
            ? "Not graded yet"
            : gradedAtLabel
              // Not "Graded by AI". The differentiator of this product is that
              // the model's output is checked and its false claims deleted, so
              // labelling the number with the thing a sceptical job seeker
              // distrusts argues against ourselves. Naming what the grade is
              // measured AGAINST does the same job and states the position.
              ? `Graded against this posting's requirements, ${gradedAtLabel}`
              : "Graded against this posting's requirements"}
        </div>
        {stale ? (
          <div style={{ marginTop: 3, fontSize: FS.caption, color: "var(--amber-ink, #b45309)" }}>
            Résumé changed since grading. Re-check when you&rsquo;re done editing.
          </div>
        ) : null}
        {/* The grade's own breakdown (founder-asked 2026-08-14: the previous
         * design scored per dimension "for users to make it easy"; chip FORM
         * founder-asked the same day). These are the RATER's sub-scores, so
         * they live inside the grade block — same provenance, one disclosure
         * line covers them. Chip is the VISUAL only: the old dimension CHIPS
         * died for being a second filter taxonomy on one list, and nothing
         * here is pressable, so that mistake cannot regrow from this row.
         * Neutral fill, deliberately not tinted by score — three coloured
         * pills under an already-tinted grade figure is the everything-
         * shouting failure DESIGN.md §3b exists to stop. */}
        {dimensions && dimensions.length > 0 ? (
          <div
            data-testid="grade-dimensions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 9,
            }}
          >
            {dimensions.map((d) => (
              <span
                key={d.label}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "var(--surface-2, rgba(127,127,127,0.08))",
                  fontSize: FS.caption,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {d.label}
                <b style={{ fontWeight: FW.bold, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(d.score)}
                </b>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
