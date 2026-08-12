/**
 * What an EMPTY gap-fix response is allowed to mean to the user.
 *
 * `/api/suggest-gap-fix` returns 200 + `{suggestions: [], emptyReason}` for
 * four different situations, and the UI used to render every one of them as
 * "Nothing honest to write — your résumé doesn't have work this can be written
 * from." That sentence is a verdict about the candidate, and two of the four
 * reasons are OUR failures:
 *
 *   no_llm_output   the provider chain died and returned a 200 anyway. This
 *                   feature went dark twice this way while telling users their
 *                   experience could not support a requirement.
 *   all_filtered    the model DID write rewrites and our validators dropped
 *                   every one. Production logs show this firing on a
 *                   candidate's strongest match.
 *
 * Both must surface as retryable errors — a fresh pass varies enough to
 * genuinely succeed — and neither may ever reach the empty state, whose copy
 * is about the honest outcomes:
 *
 *   none_proposed   one model pass came back empty. One sample, not a finding.
 *   not_evidenced   the server refused before calling the model (the gap needs
 *                   terms the résumé never mentions). Final, not retryable,
 *                   but still not a verdict on the person's experience.
 *
 * Kept as a pure map so the routing is testable: the branch lived inline in a
 * 6,000-line component, where a mutation deleting it turned zero tests red.
 */
export function gapFixEmptyError(emptyReason: string | undefined): string | null {
  if (emptyReason === "no_llm_output") {
    return "Couldn't reach the writer just now. Try again in a moment.";
  }
  if (emptyReason === "all_filtered") {
    return "We wrote suggestions for this, but none of them passed our accuracy checks. Try again — a fresh pass usually will.";
  }
  return null;
}
