/**
 * Posting-frequency emphasis for queue rows (the Jobscan pattern, adopted via
 * the founder-approved tailor-v8 mockup): a keyword the posting repeats is the
 * employer's own emphasis, so the row says "×N in posting" and the keyword
 * band orders high-frequency first.
 *
 * Everything here is deterministic and client-side — counted from the JD text
 * the tailor already holds, zero API calls, zero LLM.
 *
 * HONESTY RULES, each pinned by a test:
 *  - Matching uses a [0-9a-z+#.] token class, never \b — the api's own lesson:
 *    \b cannot see the boundary in "C++" and finds "Go" inside "Google".
 *  - The count is the MAX over the term's spellings (canonical + aliases),
 *    never the sum — canonical "CI/CD pipelines" and alias "CI/CD" overlap on
 *    the same JD occurrence, and a sum would count it twice. Max understates
 *    when a posting splits across spellings; a false high count is a false
 *    emphasis claim, so we err low.
 *  - Nothing shows below ×2 (EMPHASIS_MIN): a ×1 on every row is noise, and
 *    the signal being borrowed is repetition.
 *  - The why-sentence is a claim about the POSTING, never about ATS internals.
 */

import { normalizeQueueName, type QueueItem } from "@/lib/tailorWorkQueue";

/** Fold to the matching token space: lowercase, everything outside
 *  [0-9a-z+#.] becomes a space, whitespace collapsed, space-padded so a
 *  ` term ` search sees boundaries at both ends of the text too.
 *
 *  The dot stays in the class for "Node.js"/".NET" — but that glues a
 *  sentence-final period onto the last word ("… use Terraform." folds to
 *  "terraform."), so token-final dots are stripped after the fold. Both sides
 *  of every comparison fold through THIS function, which is what keeps
 *  "U.S." → "u.s" consistent rather than correct-looking.
 */
export const foldForTermMatch = (s: string): string =>
  (
    " " +
    String(s ?? "")
      .toLowerCase()
      .replace(/[^0-9a-z+#.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  ).replace(/\.+(?= )/g, "");

const fold = foldForTermMatch;

/** Occurrences of one spelling in the JD, on token boundaries. */
export function countPostingMentions(term: string, jdText: string): number {
  const t = fold(term).trim();
  if (!t) return 0;
  const hay = fold(jdText);
  const needle = ` ${t} `;
  let count = 0;
  let at = hay.indexOf(needle);
  while (at !== -1) {
    count += 1;
    // Overlap-safe advance: " go go go " must count 3, and stepping past the
    // whole needle would swallow the shared boundary space.
    at = hay.indexOf(needle, at + t.length + 1);
  }
  return count;
}

/** The term's frequency: max over its spellings, per the module rules. */
export function postingFrequency(
  canonical: string,
  aliases: readonly string[],
  jdText: string,
): number {
  let best = countPostingMentions(canonical, jdText);
  for (const a of aliases) {
    const n = countPostingMentions(a, jdText);
    if (n > best) best = n;
  }
  return best;
}

/** Below this, no chip and no reorder weight — repetition is the signal. */
export const EMPHASIS_MIN = 2;

export function emphasisWhy(n: number): string {
  return `The posting repeats this ${n} times; that's the employer's own emphasis.`;
}

interface ConceptLike {
  canonical?: unknown;
  aliases?: unknown;
}

/**
 * Stamp `freq` onto keyword-band rows and prepend the emphasis sentence to the
 * OPEN ones, then order the keyword rows high-frequency first (stable — ties
 * keep the posting's own order, which the derive deliberately preserves).
 *
 * Scope is the keyword band only, per the approved mockup: blockers lead with
 * their screening reason and contextual rows with their explainer — one why
 * per row stays the rule. Applied receipts keep their receipt detail; the chip
 * (freq) still rides so the row's history stays legible.
 */
export function stampPostingEmphasis<T extends QueueItem>(
  rows: readonly T[],
  concepts: readonly unknown[],
  jdText: string,
): T[] {
  const jd = String(jdText ?? "");
  if (!jd.trim() || !concepts?.length) return [...rows];

  const freqByName = new Map<string, number>();
  for (const c of concepts) {
    const concept = (c ?? {}) as ConceptLike;
    const canonical = String(concept.canonical ?? "").trim();
    if (!canonical) continue;
    const aliases = Array.isArray(concept.aliases)
      ? concept.aliases.map((a) => String(a ?? ""))
      : [];
    const n = postingFrequency(canonical, aliases, jd);
    if (n >= EMPHASIS_MIN) freqByName.set(normalizeQueueName(canonical), n);
  }
  if (freqByName.size === 0) return [...rows];

  const stamped = rows.map((it) => {
    if (it.kind !== "keyword") return it;
    const n = freqByName.get(normalizeQueueName(it.name));
    if (!n) return it;
    // The sentence joins only rows still asking for work: receipts, ignores
    // and terminal rows already say what happened to them.
    const detail =
      it.status === "queued" ? `${emphasisWhy(n)} ${it.detail}`.trim() : it.detail;
    return { ...it, freq: n, detail };
  });

  // Reorder ONLY the keyword rows among themselves; every other row keeps its
  // exact position. Stable: rows without a freq weigh 0 and ties keep order.
  const keywordSlots: number[] = [];
  const keywordRows: T[] = [];
  stamped.forEach((it, i) => {
    if (it.kind === "keyword") {
      keywordSlots.push(i);
      keywordRows.push(it);
    }
  });
  const ordered = keywordRows
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (b.it.freq ?? 0) - (a.it.freq ?? 0) || a.i - b.i)
    .map((x) => x.it);
  const out = [...stamped];
  keywordSlots.forEach((slot, i) => {
    out[slot] = ordered[i];
  });
  return out;
}
