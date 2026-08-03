/**
 * The confirm step: agree with a sentence, or correct it.
 *
 * The gap-fix API accepts `confirmed_facts` ({where, what, outcome}) and treats
 * them as a provenance source — a numeral traceable to a confirmed fact leaves
 * `risk_level` alone, while one traceable to nothing forces "high". So the
 * point of collecting them is not gatekeeping; it is that a detail the
 * candidate actually supplied stops reading as risky.
 *
 * The design constraint is that the default path costs zero typing. That only
 * works if the draft is READ from the résumé rather than written for the user:
 * the API returns the résumé bullet it targeted (`original`) verbatim plus the
 * section it attributed it to, and the sentence is those two strings in a
 * frame. Nothing here paraphrases, summarises or infers, because a sentence the
 * user is asked to vouch for must be one they actually said.
 */

export interface ConfirmedFact {
  /** Where it happened: employer, project, course. */
  where: string;
  /** What they did. */
  what: string;
  /** What changed as a result. Optional — a number lands harder, but a claim
   *  without one is still a claim. */
  outcome: string;
}

/** The API caps each field; mirror it here so the UI cannot submit something
 *  the server will silently truncate. */
export const FACT_FIELD_MAX = 600;

const clean = (s: unknown): string =>
  typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, FACT_FIELD_MAX) : "";

/**
 * Build the draft the user is asked to agree with.
 *
 * `where` comes from `employer` and NOTHING ELSE. The neighbouring `section`
 * field is a section label ("Work Experience") that the API also falls back to
 * filling with whatever it has, so reading it here produced sentences like
 * "At Adds CI/CD to this bullet, you designed…" — a location the user never
 * worked at, inside a box that tells them nothing was invented. An absent
 * employer leaves `where` empty and the sentence simply starts "You …", which
 * is the honest shape.
 *
 * `what` is the bullet verbatim. Returns null when there is no bullet to quote,
 * because a confirm step with nothing to confirm only wastes a click.
 */
export function draftFactFromSuggestion(
  suggestion: { original?: unknown; employer?: unknown } | null | undefined,
): ConfirmedFact | null {
  const what = clean(suggestion?.original);
  if (!what) return null;
  return { where: clean(suggestion?.employer), what, outcome: "" };
}

/**
 * Render the draft as one sentence.
 *
 * Deliberately dumb: it frames the two strings and does not rewrite them. The
 * trailing period is added only when the bullet does not already end in
 * sentence punctuation, so a quoted bullet never grows a second one.
 */
export function claimSentence(fact: ConfirmedFact): string {
  const what = fact.what.trim();
  if (!what) return "";
  const tail = /[.!?]$/.test(what) ? "" : ".";
  const body = fact.outcome.trim() ? `${what}, and ${fact.outcome.trim()}` : what;
  const bodyTail = /[.!?]$/.test(body) ? "" : tail || ".";
  return fact.where.trim()
    ? `At ${fact.where.trim()}, you ${lowerFirst(body)}${bodyTail}`
    : `You ${lowerFirst(body)}${bodyTail}`;
}

/** Bullets are usually capitalised ("Led weekly design reviews"); mid-sentence
 *  they should not be. Only touches a leading word that is Capitalised-then-
 *  lowercase, so acronyms (SOC, CI/CD) and proper nouns keep their case. */
function lowerFirst(s: string): string {
  const m = s.match(/^([A-Z])([a-z])/);
  return m ? s[0].toLowerCase() + s.slice(1) : s;
}

/**
 * What actually gets sent. Empty and whitespace-only facts are dropped rather
 * than submitted: an empty string is not evidence, and sending one would let it
 * count as provenance for a number nobody vouched for.
 */
export function normalizeConfirmedFacts(
  facts: readonly ConfirmedFact[] | null | undefined,
): ConfirmedFact[] {
  if (!facts?.length) return [];
  return facts
    .map((f) => ({ where: clean(f?.where), what: clean(f?.what), outcome: clean(f?.outcome) }))
    // `what` is the claim. Without it there is nothing to vouch for, whatever
    // the other two fields say.
    .filter((f) => f.what.length > 0);
}

/** True when the user changed the draft, i.e. the facts are worth re-fetching
 *  on. Agreeing with a sentence read out of the résumé tells the model nothing
 *  it did not already have. */
export function factDiffersFromDraft(draft: ConfirmedFact, edited: ConfirmedFact): boolean {
  return (
    clean(draft.where) !== clean(edited.where) ||
    clean(draft.what) !== clean(edited.what) ||
    clean(draft.outcome) !== clean(edited.outcome)
  );
}
