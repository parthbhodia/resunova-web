"use client";

import type { CSSProperties } from "react";

/**
 * The right-hand half of the auth gate: the destination, half-open.
 *
 * ⚠️ THE HONESTY RULE FOR THIS PANEL, AND THE COMP GOT IT WRONG. A signed-out
 * visitor has no résumé on file, so nothing here may claim to know anything
 * about them. The comp's version read "Your résumé has the Pub/Sub → Dataflow
 * work. Lead with that one." — a personalised insight, on the one surface
 * where we provably know nothing yet. Every line below describes the FEATURE,
 * in the future tense where it refers to their résumé at all.
 *
 * It is a sample and it says so. The fade is doing honest work: it shows there
 * is more behind this without asserting a count we cannot source.
 */

export type GatePreviewCard = {
  tag: string;
  tone: "accent" | "amber" | "green";
  text: string;
  hint?: string;
};

const TONE_BG: Record<GatePreviewCard["tone"], string> = {
  accent: "var(--accent-bg)",
  amber: "var(--amber-bg)",
  green: "var(--green-bg)",
};
// The -ink family is tuned to be read on its own tint, which is exactly this
// case. A bare hue token here would be a fill colour used as text.
const TONE_INK: Record<GatePreviewCard["tone"], string> = {
  accent: "var(--accent-ink)",
  amber: "var(--amber-ink)",
  green: "var(--green-ink)",
};

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "15px 16px",
  marginBottom: 11,
};

export default function GatePreview({
  label,
  cards,
}: {
  label: string;
  cards: GatePreviewCard[];
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        padding: "40px 40px 0",
        background: "var(--surface2)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* aria-hidden on the whole panel: it illustrates the destination, and a
          screen reader walking four sample questions before reaching the
          sign-in form would read them as the page's actual content. The form
          carries every accessible name that matters. */}
      <p
        style={{
          // 11px, not 10 — the detector's functional-text floor applies here
          // too, and being on the DESIGN.md ramp does not exempt a value.
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          // --dim measures 4.26:1 on --surface2 at this size. --muted is the
          // token that passes on a raised surface.
          color: "var(--muted)",
          margin: "0 0 16px",
        }}
      >
        {label}
      </p>

      {cards.map((c, i) => (
        <div key={i} style={cardStyle}>
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "3px 7px",
              borderRadius: 5,
              marginBottom: 8,
              background: TONE_BG[c.tone],
              color: TONE_INK[c.tone],
            }}
          >
            {c.tag}
          </span>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--text)", fontWeight: 600 }}>
            {c.text}
          </p>
          {c.hint ? (
            <p style={{ margin: "7px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--muted)", fontWeight: 400 }}>
              {c.hint}
            </p>
          ) : null}
        </div>
      ))}

      {/* Fades into --surface2. A gradient has no backgroundColor for a DOM
          contrast walk to read, so nothing functional sits on it — the cards
          it covers are a sample and the panel is aria-hidden. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 150,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, transparent, var(--surface2) 78%)",
        }}
      />
    </div>
  );
}
