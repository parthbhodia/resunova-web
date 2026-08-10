"use client";
/**
 * The US-Letter page boundary, drawn on the paper.
 *
 * Content past 1056px (11in at 96dpi) silently becomes page 2 in the exported
 * PDF. Today the only way to discover that is to download the file and count
 * pages — which is a poor way to learn that your résumé is two pages the day
 * before an application closes. This draws the line where the page ends and
 * says how far past it you are.
 *
 * Rendered INSIDE the capture target, so `az-pdf-ignore` is load-bearing:
 * cleanForExport strips that class before the clone goes to Chromium, and
 * without it the rule would print on the résumé. The @media print rule in
 * CANVAS_STYLESHEET is the second line of defence.
 */
import { useEffect, useRef, useState, type RefObject } from "react";

/** 11in at 96dpi. */
export const PAGE_HEIGHT_PX = 1056;

export interface PageFit {
  /** Pixels past the end of page one. 0 when it fits. */
  overflowPx: number;
  /** How full page one is, as a percentage. Can exceed 100. */
  fillPct: number;
}

/**
 * The hook measured the content height and then threw it away, keeping only
 * the overflow. "How full is the page" is the question people actually ask
 * while writing — the overflow only answers it after it is already too late —
 * so the fill percentage comes out too.
 */
export function usePageOverflow(ref: RefObject<HTMLElement | null>, enabled = true): PageFit {
  const [fit, setFit] = useState<PageFit>({ overflowPx: 0, fillPct: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      const overflowPx = h > PAGE_HEIGHT_PX ? Math.round(h - PAGE_HEIGHT_PX) : 0;
      const fillPct = Math.round((h / PAGE_HEIGHT_PX) * 100);
      // Return the PREVIOUS object when nothing changed. React bails out of a
      // re-render only on Object.is equality, so setting a fresh literal here
      // re-rendered the host on every observation — and the host is the whole
      // annotated résumé panel, whose highlight overlays measure and
      // reposition as they render. That fed the next observation, and the
      // Analyze workspace died with React #185, maximum update depth.
      //
      // Rounding does the rest: sub-pixel reflow settles to the same integers,
      // so an oscillation of less than a pixel can no longer drive a render.
      setFit((prev) =>
        prev.overflowPx === overflowPx && prev.fillPct === fillPct
          ? prev
          : { overflowPx, fillPct });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, enabled]);
  return fit;
}

export function PageBoundaryRule({ overflowPx, top = PAGE_HEIGHT_PX }: { overflowPx: number; top?: number }) {
  const over = overflowPx > 0;
  return (
    <div
      className="az-pdf-ignore"
      aria-hidden
      style={{
        position: "absolute", left: 0, right: 0, top,
        borderTop: `1px dashed ${over ? "#dc2626" : "#cbd5e1"}`,
        pointerEvents: "none", zIndex: 4,
      }}
    >
      <span style={{
        position: "absolute", right: 0, top: 4,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
        color: over ? "#dc2626" : "#94a3b8",
        background: "#fff", padding: "1px 6px", borderRadius: 4,
        border: `1px solid ${over ? "#fecaca" : "#e2e8f0"}`,
        whiteSpace: "nowrap",
      }}>
        {over ? `${overflowPx}px past page 1` : "PAGE 1 ENDS"}
      </span>
    </div>
  );
}

/** Ref-free variant for callers that already measure their own content. */
export default PageBoundaryRule;
