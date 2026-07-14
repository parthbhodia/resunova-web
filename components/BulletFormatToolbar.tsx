"use client";

import React from "react";
import type { InlineFormat } from "@/lib/inlineMarkdown";

/** Floating Bold / Italic / Normal toolbar shown when the user selects text
 *  inside an editable bullet. Position is a fixed-layout {top, left} the
 *  caller computes from the selection's bounding rect. */
export function BulletFormatToolbar({
  top,
  left,
  onFormat,
}: {
  top: number;
  left: number;
  onFormat: (format: InlineFormat) => void;
}) {
  return (
    <div
      className="az-pdf-ignore"
      role="toolbar"
      aria-label="Bullet text formatting"
      // Keep the contentEditable selection alive — a mousedown here must not
      // steal focus/blur the bullet before onFormat reads the selection.
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 8,
        padding: 3,
        boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
      }}
    >
      <button type="button" onClick={() => onFormat("bold")} title="Bold" style={btnStyle}>
        <b>B</b>
      </button>
      <button type="button" onClick={() => onFormat("italic")} title="Italic" style={btnStyle}>
        <i>I</i>
      </button>
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border, #e2e8f0)", margin: "2px 1px" }} />
      <button type="button" onClick={() => onFormat("clear")} title="Clear formatting" style={{ ...btnStyle, fontWeight: 500 }}>
        Normal
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  font: "inherit",
  fontSize: 12.5,
  minWidth: 26,
  height: 25,
  border: "none",
  borderRadius: 5,
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  padding: "0 7px",
};
