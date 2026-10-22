import { displayPdfUrlForResume } from "@/lib/displayResumePdfUrl";
import type { LibraryItem } from "@/lib/supabase";

export interface ShareTarget {
  /** Path segment for `POST /api/share/{folder}`. */
  folder: string;
  pdfUrl: string;
}

/**
 * What a public share link for a library item points at, or null when the item
 * has no PDF. Builder drafts and cover letters are never shared from here, and
 * an item without a PDF gets no Share button rather than a link to nothing.
 */
export function shareTargetFor(item: LibraryItem): ShareTarget | null {
  if (item.kind === "analyzed") {
    const stored = item.analysis.result && typeof item.analysis.result === "object"
      ? (item.analysis.result as Record<string, unknown>).sourcePdfUrl
      : null;
    const pdf = (item.analysis.sourcePdfUrl ?? (typeof stored === "string" ? stored : ""))?.trim();
    return pdf ? { folder: `analyze-${item.id}`, pdfUrl: pdf } : null;
  }
  if (item.kind === "tailored") {
    const pdf = displayPdfUrlForResume(item.record);
    return pdf ? { folder: item.record.folder, pdfUrl: pdf } : null;
  }
  return null;
}
