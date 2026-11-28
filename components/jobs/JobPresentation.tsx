/**
 * The presentational pieces of a job posting: a fact row, its chip, and the
 * parsed description.
 *
 * Shared by the in-app job pane (a client component) and the public job page
 * (a server component), so both render a posting the same way. That is why
 * there are no hooks and no "use client" here: either side can render them.
 */

import type { ReactNode } from "react";
import { parseJdBlocks } from "@/lib/jdBlocks";

export function JobChip({ children, tone }: { children: ReactNode; tone?: "green" | "amber" }) {
  const green = tone === "green";
  const amber = tone === "amber";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: 8,
      fontSize: 13, fontWeight: 600, lineHeight: 1.3,
      background: green
        ? "color-mix(in srgb, #16a34a 13%, transparent)"
        : amber
          ? "color-mix(in srgb, #c4793a 14%, transparent)"
          : "var(--surface2)",
      // Text on a tint uses the -ink token (DESIGN.md §2); a raw #16a34a on its
      // own tint is about 3:1.
      color: green ? "var(--green-ink)" : amber ? "var(--amber-ink, #b45309)" : "var(--text)",
      border: green
        ? "1px solid color-mix(in srgb, #16a34a 28%, transparent)"
        : amber
          ? "1px solid color-mix(in srgb, #c4793a 36%, transparent)"
          : "1px solid var(--border)",
    }}>{children}</span>
  );
}

/** A labeled row ("Pay", "Job type", …) in the "Job details" block. */
export function JobFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

/** Renders a description as real headings, paragraphs and bullet lists. */
export function JobDescriptionBlocks({ text }: { text: string }) {
  const blocks = parseJdBlocks(text);
  if (!blocks.length) {
    return <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>No description available for this posting.</p>;
  }
  return (
    <div style={{ fontSize: 14, lineHeight: 1.62, color: "var(--muted)" }}>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: i === 0 ? "0 0 6px" : "18px 0 6px" }}>
              {b.text}
            </h3>
          );
        }
        if (b.type === "list") {
          return (
            <ul key={i} style={{ margin: "0 0 12px", paddingLeft: 20, listStyle: "disc" }}>
              {b.items.map((it, j) => (
                <li key={j} style={{ margin: "0 0 6px", lineHeight: 1.55 }}>{it}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} style={{ margin: "0 0 10px" }}>{b.text}</p>;
      })}
    </div>
  );
}
