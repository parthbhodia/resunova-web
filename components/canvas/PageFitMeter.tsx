"use client";
/**
 * How full page one is, in the toolbar.
 *
 * "Will this still fit on one page" is asked on essentially every edit, and
 * the answer used to require downloading the PDF and counting. The dashed rule
 * on the canvas answers it only once you have already crossed the line and
 * only if that part of the page is in view; this answers it continuously and
 * warns while there is still room to act.
 *
 * Colour is semantic, not the accent: green/amber/red here mean "state of the
 * document", and must not read as "interactive".
 */
import Tooltip from "@mui/material/Tooltip";
import type { PageFit } from "./PageBoundaryRule";

export default function PageFitMeter({ fit }: { fit: PageFit }) {
  const { fillPct, overflowPx } = fit;
  // Nothing measured yet — say nothing rather than flash "0%".
  if (!fillPct) return null;

  const over = overflowPx > 0;
  const tight = !over && fillPct > 92;
  const color = over ? "var(--red, #dc2626)" : tight ? "var(--amber, #b45309)" : "var(--green, #047857)";

  return (
    <Tooltip title={over
      ? `Content runs ${overflowPx}px past page one and will export as two pages`
      : `Page one is ${fillPct}% full`}>
      <span
        aria-label={over ? `Two pages, ${overflowPx} pixels over` : `Page one ${fillPct} percent full`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
          padding: "3px 10px 3px 8px", borderRadius: 999,
          border: `1px solid ${over ? color : "var(--border)"}`,
          background: "var(--surface2)",
          fontSize: 11, fontVariantNumeric: "tabular-nums",
          color: over ? color : "var(--muted)", whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 46, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
          <span style={{
            display: "block", height: "100%",
            width: `${Math.min(100, fillPct)}%`, background: color,
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
        </span>
        {over ? `2 pages · ${overflowPx}px over` : `page 1 · ${fillPct}%`}
      </span>
    </Tooltip>
  );
}
