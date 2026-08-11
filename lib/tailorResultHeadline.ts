/**
 * What the top of the tailor results page claims has happened.
 *
 * Extracted from the header's JSX so the claim can be pinned. It is one
 * conditional, but it is the page's first sentence and it makes an assertion
 * about work: "tailored" says we changed the document for this posting. Said
 * before any change is applied, that is the same overclaim as the score tile
 * that once read "live · recounted the moment you add a change" while nothing
 * recounted — and it is the harder one to catch, because it reads like a
 * greeting rather than a number.
 *
 * The peak still gets stated either way. Before the first fix the honest
 * version is that the document is already downloadable, which it is: the queue
 * UI renders a real preview and the download path works from the first render.
 */
export function tailorResultHeadline({
  generating,
  queueUi,
  hasFolder,
  appliedCount,
}: {
  /** A PDF compile is in flight. */
  generating: boolean;
  /** The /tailor-2 work-queue surface rather than the classic results view. */
  queueUi: boolean;
  /** Classic path only: a compiled LaTeX folder exists. */
  hasFolder: boolean;
  /** Fixes applied to the résumé in this run. */
  appliedCount: number;
}): string {
  if (generating) return "Building your PDF…";
  if (queueUi) {
    return appliedCount > 0
      ? "Your tailored résumé is ready"
      : "Your résumé is ready to download";
  }
  // The classic view is untouched: it gates on a compiled artifact, which is
  // its own honest signal there.
  return hasFolder
    ? "Your tailored résumé is ready"
    : "Analysis ready — review gaps & download PDF";
}
