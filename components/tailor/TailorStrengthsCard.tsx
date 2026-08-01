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

  const rows = [
    ...strengths.map((s) => ({ kind: "strength" as const, text: s })),
    ...facts.map((f) => ({ kind: "fact" as const, text: f.text, sub: f.analysis })),
  ];
  const hiddenCount = rows.length - VISIBLE_WHEN_COLLAPSED;
  const shown = expanded || hiddenCount <= 0 ? rows : rows.slice(0, VISIBLE_WHEN_COLLAPSED);

  return (
    <div
      data-testid="strengths-card"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--card)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: FS.micro,
          fontWeight: FW.bold,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--green-ink, #16a34a)",
          marginBottom: 4,
        }}
      >
        Working in your favor
      </div>
      {verdict?.trim() ? (
        <div style={{ fontSize: FS.body, fontWeight: FW.semibold, marginBottom: rows.length ? 6 : 0 }}>
          {verdict}
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
