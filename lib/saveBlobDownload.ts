/**
 * Save a Blob as a file download.
 *
 * The builder, Analyze export, HTML PDF export, and cover-letter export all
 * did this inline. One helper keeps the object URL from leaking and fails
 * with a message the caller can show.
 */

export function saveBlobAsDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") {
    throw new Error("File download is only available in the browser.");
  }
  const name = filename.trim() || "download";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = (header ?? "").match(/filename="([^"]+)"/);
  const name = match?.[1]?.trim();
  return name || fallback;
}

export async function downloadResponseAsFile(resp: Response, fallbackFilename: string): Promise<void> {
  if (!resp.ok) {
    throw new Error(`Download failed (HTTP ${resp.status}).`);
  }
  const filename = filenameFromContentDisposition(
    resp.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  const blob = await resp.blob();
  saveBlobAsDownload(blob, filename);
}
