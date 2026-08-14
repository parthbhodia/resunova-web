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
    // By the time this reaches a screen, several automatic passes have
    // already run: the server retries with its validators' own reasons, and
    // the client re-requests a retryable empty once more. Say so — "try
    // again, a fresh pass usually will" was a promise the user found false.
    return "We made several attempts at this one and none passed our accuracy checks yet. One more try sometimes clears it, or add it in your own words.";
  }
  return null;
}

/**
 * Retrying is OUR job before it is the user's (founder-directed 2026-08-14:
 * "even if it doesnt pass we should retry on our own till we pass it and not
 * leave on to the users"). A RETRYABLE empty — `failure` non-null, meaning
 * no_llm_output or all_filtered per the map above — earns exactly one more
 * fresh attempt before anything reaches a screen. A verdict empty
 * (`failure` null: none_proposed / not_evidenced) is never re-argued, and a
 * bound exists because some gaps genuinely cannot pass (a credential, a
 * refused tech) and an unbounded loop would spin on them forever.
 *
 * Lives here, not inline in a 6,000-line component, so deleting the retry
 * turns a test red instead of nothing.
 */
export async function withOneRetryOnFailure<T extends { failure: string | null }>(
  attempt: () => Promise<T>,
): Promise<T> {
  let out = await attempt();
  if (out.failure) out = await attempt();
  return out;
}
