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

/**
 * ⚠️ NO TINTED PILL, AND THE REASON IS MEASURED. The comp drew each tag as
 * --*-ink on its matching --*-bg. Those tints are tuned to sit on --surface;
 * this panel is --surface2, and compositing the same alpha over a darker
 * ground takes green to 4.3:1 — under AA for a 10px label, and invisible to
 * a check that reads the token name rather than the rendered pixel. The ink
 * on the panel's own ground clears it comfortably instead.
 */
const TONE_INK: Record<GatePreviewCard["tone"], string> = {
  accent: "var(--accent-ink)",
  amber: "var(--amber-ink)",
  green: "var(--green-ink)",
};

/**
 * ⚠️ A DIVIDED LIST, NOT A STACK OF CARDS. The comp drew each sample as a
 * bordered, rounded --surface card, and the detector was right to flag all
 * four as card-inside-card: they sit inside the gate's own card, so the
 * nesting was three containers deep to show four sentences. These are
 * samples, not things you can press, and chrome implying otherwise is
 * decoration. Spacing and a hairline rule separate them instead, which is the
 * detector's own remedy and reads quieter besides.
 */
const itemStyle: CSSProperties = {
  padding: "14px 0",
  borderTop: "1px solid var(--border)",
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
      data-gate-preview=""
      style={{
        padding: "40px 40px 0",
        // ⚠️ height:100%, or the panel stops at its content and leaves bare
        // --surface below it when the ask column grows (the email form open
        // is the common case). Same shape as the nav rail's h-full bug: a
        // ground that ends mid-column reads as a rendering fault.
        height: "100%",
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
        <div key={i} style={i === 0 ? { ...itemStyle, borderTop: "none", paddingTop: 0 } : itemStyle}>
          <span
            style={{
              display: "inline-block",
              // 11px, not 10: the detector's functional-text floor, and being
              // a small label is not an exemption from it.
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
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
