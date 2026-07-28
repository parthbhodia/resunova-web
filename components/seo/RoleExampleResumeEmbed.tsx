"use client";

import { useRef, type CSSProperties } from "react";
import ResumePreview from "@/components/TemplateBuilder/ResumePreview";
import type { TBResumeData } from "@/components/TemplateBuilder/types";
import { useHtmlPdfExport } from "@/hooks/useHtmlPdfExport";

/**
 * Renders a complete example résumé (a real TBResumeData document) on the
 * programmatic role pages, as an actual 8.5in résumé "paper" — the same
 * ResumePreview the Template Builder uses, so what visitors see is exactly
 * what the product produces. Includes a Download-PDF button that goes through
 * the standard WYSIWYG Chromium export, so the PDF matches the preview.
 *
 * The résumé prerenders into the static export (client components SSR their
 * initial HTML), so the full résumé text is crawlable — an SEO win over the
 * old text-fragment card.
 */
export default function RoleExampleResumeEmbed({
  data,
  filename,
}: {
  data: TBResumeData;
  filename: string;
}) {
  const paperRef = useRef<HTMLDivElement | null>(null);
  const { exportPdf, exporting, error } = useHtmlPdfExport();

  return (
    <div>
      <div
        style={{
          overflowX: "auto",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          padding: 14,
        }}
      >
        {/* zoom scales layout height too (unlike transform), so no ghost space.
            On narrow screens the outer container scrolls horizontally like a PDF viewer. */}
        <div style={{ zoom: 0.88 } as CSSProperties}>
          <ResumePreview ref={paperRef} data={data} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            if (paperRef.current) void exportPdf(paperRef.current, filename);
          }}
          disabled={exporting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 10,
            border: "1px solid var(--accent)",
            background: "var(--accent-bg)",
            color: "var(--accent)",
            fontSize: 14,
            fontWeight: 700,
            cursor: exporting ? "default" : "pointer",
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? "Preparing PDF…" : "Download this example as PDF"}
        </button>
        {error && <span style={{ fontSize: 13, color: "var(--red-ink, #dc2626)" }}>{error}</span>}
      </div>
    </div>
  );
}
