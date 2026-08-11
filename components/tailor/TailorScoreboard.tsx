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
 * WHY THE SCORE CARRIES THE WAY INTO THE QUEUE.
 *
 * The open-work count used to be a free-standing banner above the tiles. A
 * percentage the user cannot act on is a verdict, and the count sitting apart
 * from it made the connection theirs to draw. Folding it into the match block
 * makes the score the entry point: here is the number, here is what it is made
 * of, here is the way in. It stays well clear of the queue's own band headers,
 * which is what the banner's placement note was protecting (rendered inside the
 * queue card it sat directly on "Could get you filtered out" and printed that
 * sentence twice in a row).
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

/**
 * The way into the queue, under the number it explains.
 *
 * Renders nothing when there is no open work — a finished queue has its own
 * finish state and does not need a second one here. When blockers exist it
 * keeps the banner's copy verbatim (a count PLUS an ordering: nothing else on
 * the rail ranks the bands); when only smaller gaps remain it drops the red,
 * because "could get you filtered out" is a claim about hard requirements and
 * repeating it for the rest would be the tinting-everything-red failure the
 * queue's own bands exist to avoid.
 */
function QueueEntry({
  blockersOpen,
  otherOpen,
  onEnterQueue,
}: {
  blockersOpen: number;
  otherOpen: number;
  onEnterQueue?: () => void;
}) {
  if (blockersOpen <= 0 && otherOpen <= 0) return null;
  const critical = blockersOpen > 0;
  const headline = critical
    ? `${blockersOpen} gap${blockersOpen === 1 ? "" : "s"} could get you filtered out`
    : `${otherOpen} gap${otherOpen === 1 ? "" : "s"} left to review`;
  const detail = critical
    ? `Hard requirements the posting asks for that your résumé does not evidence yet.${
        otherOpen > 0 ? ` The other ${otherOpen} can wait.` : ""
      }`
    : "Smaller gaps. Worth closing, none of them a hard requirement.";

  const body = (
    <>
      <span
        aria-hidden
        style={{
          flex: "none",
          width: 20,
          height: 20,
          marginTop: 1,
          borderRadius: 6,
          display: "grid",
          placeItems: "center",
          // Tint for the fill, ink for the glyph — never the reverse. `--red-ink`
          // is the opaque TEXT colour and is a LIGHT red in dark mode, so the
          // solid-red-with-white-glyph badge this inherited measured 1.9:1
          // there. Same rule the queue's band strips follow.
          background: critical ? "var(--red-bg, rgba(220,38,38,0.14))" : "var(--surface-2, rgba(127,127,127,0.14))",
          color: critical ? "var(--red-ink, #b42318)" : "var(--muted)",
          fontSize: FS.micro,
          fontWeight: FW.extrabold,
        }}
      >
        {critical ? "!" : "›"}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: FS.body,
            fontWeight: FW.bold,
            color: critical ? "var(--red-ink, #b42318)" : "var(--text)",
          }}
        >
          {headline}
        </span>
        <span
          style={{
            display: "block",
            fontSize: FS.small,
            color: "var(--muted)",
            marginTop: 2,
            lineHeight: 1.45,
          }}
        >
          {detail}
        </span>
      </span>
      {onEnterQueue ? (
        // NOT aria-hidden: this is the only word naming what the control does,
        // and a button whose accessible name is just a count is the same
        // "nobody can see it" bug the scans badge hit. Only the arrow is
        // decoration.
        <span
          style={{
            flex: "none",
            alignSelf: "center",
            fontSize: FS.small,
            fontWeight: FW.semibold,
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          Review <span aria-hidden>→</span>
        </span>
      ) : null}
    </>
  );

  // Longhand only: a `border: 0` reset for the button would also wipe the
  // divider set beside it, and the two orders render differently.
  const frame: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    width: "100%",
    textAlign: "left",
    margin: "12px 0 0",
    padding: "12px 0 0",
    background: "none",
    borderWidth: "1px 0 0",
    borderStyle: "solid",
    borderColor: "var(--border)",
    font: "inherit",
    color: "inherit",
  };

  // Without a handler this is still worth showing, just not pressable — the
  // /tailor-preview harness and any read-only mount land here.
  if (!onEnterQueue) return <div style={frame}>{body}</div>;
  return (
    <button type="button" onClick={onEnterQueue} style={{ ...frame, cursor: "pointer" }}>
      {body}
    </button>
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
  blockersOpen = 0,
  otherOpen = 0,
  onEnterQueue,
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
  /** Open rows in the blocker band, and everything else still open. Both
   *  default to 0 so a caller that does not pass them renders no entry row. */
  blockersOpen?: number;
  otherOpen?: number;
  /** Take the user to the queue. Absent ⇒ the entry row renders unpressable. */
  onEnterQueue?: () => void;
}) {
  const ratio = total > 0 ? found / total : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* ── PRIMARY: the deterministic match, and the way into the queue ────
       * `data-score` exists for the tests and the browser drive: which card a
       * marker landed in is the whole claim of the hierarchy, and a check that
       * cannot tell them apart cannot fail. */}
      <div data-score="match" style={{ ...CARD, padding: "16px 17px 14px" }}>
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
        <QueueEntry blockersOpen={blockersOpen} otherOpen={otherOpen} onEnterQueue={onEnterQueue} />
      </div>

      {/* ── SECONDARY: the graded judgement ────────────────────────────────
       * Quieter by scale, not by disclosure: it keeps its meter, its target
       * marker, its timestamp and its own stale note. */}
      <div data-score="grade" style={{ ...CARD, padding: "11px 14px 12px" }}>
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
      </div>
    </div>
  );
}
