"use client";

/**
 * "Working in your favor" — the half of the story the queue can't tell.
 *
 * The queue is all gaps; a page of nothing but problems reads as "your resume
 * is bad" and erodes the confidence to actually send it. This card carries the
 * verdict, the strengths the match found, and the read-only fit factors
 * (location / seniority / culture) that used to live in the legacy Overall
 * tab. Purely presentational; nothing here is a fix target.
 */

import React, { useState } from "react";
import { FS, FW } from "@/lib/typography";

const VISIBLE_WHEN_COLLAPSED = 3;

export function TailorStrengthsCard({
  verdict,
  strengths,
  fitFactors,
}: {
  verdict?: string;
  strengths: readonly string[];
  /** Read-only context items (location / seniority / culture). */
  fitFactors?: readonly { text: string; analysis?: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const facts = fitFactors ?? [];
  if (!verdict?.trim() && strengths.length === 0 && facts.length === 0) return null;
  // (leadSentence is defined below the component; see its note for why the
  // verdict is cut rather than rendered whole.)

  const rows = [
    ...strengths.map((s) => ({ kind: "strength" as const, text: s })),
    ...facts.map((f) => ({ kind: "fact" as const, text: f.text, sub: f.analysis })),
  ];
  const hiddenCount = rows.length - VISIBLE_WHEN_COLLAPSED;
  const shown = expanded || hiddenCount <= 0 ? rows : rows.slice(0, VISIBLE_WHEN_COLLAPSED);

  const lead = leadSentence(verdict);

  return (
    <div
      data-testid="strengths-card"
      style={{
        border: "1px solid var(--green-line, rgba(22,163,74,0.24))",
        borderRadius: 14,
        background: "var(--green-bg, rgba(22,163,74,0.08))",
        padding: "15px 17px",
      }}
    >
      {/* Counted, because "3 things" is a claim the card can back and
          "Working in your favor" is a label. The count also stops the card
          reading as boilerplate that appears no matter what the scan found. */}
      <div style={{ fontSize: FS.bodyLg, fontWeight: FW.extrabold, marginBottom: lead ? 5 : 8 }}>
        {rows.length > 0
          ? `${rows.length} thing${rows.length === 1 ? "" : "s"} already working in your favor`
          : "Working in your favor"}
      </div>
      {lead ? (
        <div style={{ fontSize: FS.body, color: "var(--text)", opacity: 0.85, lineHeight: 1.5, marginBottom: rows.length ? 12 : 0 }}>
          {lead}
        </div>
      ) : null}
      {shown.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "16px 1fr",
            gap: 8,
            padding: "3px 0",
            fontSize: FS.small,
          }}
        >
          <span
            aria-hidden
            style={{
              fontWeight: FW.extrabold,
              color: r.kind === "strength" ? "var(--green-ink, #16a34a)" : "var(--muted)",
            }}
          >
            {r.kind === "strength" ? "✓" : "•"}
          </span>
          <div style={{ minWidth: 0 }}>
            {r.text}
            {r.kind === "fact" && r.sub ? (
              <div style={{ color: "var(--muted)", fontSize: FS.caption, marginTop: 1 }}>{r.sub}</div>
            ) : null}
          </div>
        </div>
      ))}
      {hiddenCount > 0 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            background: "none",
            border: 0,
            padding: "4px 0 0",
            fontSize: FS.small,
            fontWeight: FW.semibold,
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          Show {hiddenCount} more
        </button>
      ) : null}
    </div>
  );
}

/**
 * The first sentence of the verdict, and only that.
 *
 * The rater's verdict is reliably two sentences with two different jobs. The
 * first states what the résumé already does well, which is what this card is
 * for. The second is advice — "to further strengthen your application, consider
 * highlighting code reviews, documentation contributions…" — and in the field
 * report those were, word for word, the two blocker rows in the queue directly
 * beneath it. Rendering both puts the work list on screen twice, once as a task
 * and once as a paragraph, and the paragraph is the copy nobody reads.
 *
 * Cut at the first sentence boundary rather than at a character count so the
 * text never ends mid-clause. An abbreviation ("e.g.") could in principle split
 * early; the guard is a minimum length, which costs nothing and keeps a stray
 * "Inc." from reducing the line to two words.
 */
export function leadSentence(text: string | null | undefined): string {
  const clean = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  const first = m?.[0]?.trim() ?? "";
  return first.length >= MIN_LEAD_CHARS ? first : clean;
}

/** Below this, a "sentence" is almost certainly an abbreviation, not the lead. */
const MIN_LEAD_CHARS = 40;
