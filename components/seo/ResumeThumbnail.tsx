"use client";

import type { CSSProperties } from "react";
import ResumePreview from "@/components/TemplateBuilder/ResumePreview";
import type { TBResumeData } from "@/components/TemplateBuilder/types";

/**
 * A small, clipped preview of a REAL résumé — the actual product's
 * ResumePreview, zoomed down and cropped to a card-sized window, rather than a
 * fake mock (a row of gray bars). Shows the top portion (header + opening
 * lines) of the résumé, centered.
 */
export default function ResumeThumbnail({
  data,
  height = 208,
  zoom = 0.32,
}: {
  data: TBResumeData;
  height?: number;
  zoom?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        height,
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "#fff",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ zoom, WebkitFontSmoothing: "antialiased" } as CSSProperties}>
        <ResumePreview data={data} />
      </div>
    </div>
  );
}
