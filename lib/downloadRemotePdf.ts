/**
 * Save a remote PDF without leaving the current page.
 * Filename rules stay here. The click-to-download step is shared.
 */

import { saveBlobAsDownload } from "@/lib/saveBlobDownload";

/** Turn a résumé label or upload name into a single PDF filename. */
export function pdfFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() || "resume";
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}

export async function downloadRemotePdf(url: string, filename: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Could not download this PDF.");
  const blob = await resp.blob();
  saveBlobAsDownload(blob, pdfFileName(filename));
}
