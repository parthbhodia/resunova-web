/**
 * What a gap-fix suggestion actually ADDS to a bullet.
 *
 * Two callers need this:
 *   - the suggestion card, to show which words are new instead of burying them
 *     in a textarea holding the whole merged bullet;
 *   - the collision merge, to combine two suggestions that target the same
 *     bullet by concatenating their additions rather than letting the second
 *     overwrite the first.
 *
 * Token-level, not character-level. A character prefix scan dies at the first
 * reworded word and can split mid-token ("pipelines" → "pipeline" + "s using
 * Airflow"), and the backend does lightly reword. Tokens are compared on a
 * normalized key but reported as raw offsets, so the caller renders the user's
 * actual punctuation and casing.
 */

/** Compare-key for one token: case, smart quotes and trailing punctuation folded. */
function tokenKey(tok: string): string {
  return tok
    .toLowerCase()
    .replace(/[‘’“”′″]/g, "'")
    .replace(/[.,;:!?]+$/, "");
}

type Token = { text: string; start: number; end: number; key: string };

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length, key: tokenKey(m[0]) });
  }
  return out;
}

export type AppendDelta =
  /** `suggested` keeps `original` and adds words; offsets index into `suggested`. */
  | { kind: "append"; addedStart: number; addedEnd: number; added: string }
  /** The shared prefix was materially reworded — treat it as a rewrite, not an addition. */
  | { kind: "rewrite" }
  /** Nothing was added. */
  | { kind: "noop" }
  /** Too short or too empty to say anything trustworthy. */
  | { kind: "unknown" };

/** Below this share of the original surviving as a common prefix+suffix, call it a rewrite. */
const REWRITE_THRESHOLD = 0.6;
/** Fewer original tokens than this and the ratio above is meaningless. */
const MIN_ORIGINAL_TOKENS = 4;

/**
 * Describe how `suggested` differs from `original`.
 *
 * Never throws. Every uncertain case degrades to `rewrite` / `unknown`, which
 * callers render as "show the whole thing, highlight nothing" — the behaviour
 * before this helper existed.
 */
export function gapFixAppendDelta(original: string, suggested: string): AppendDelta {
  const orig = tokenize(original ?? "");
  const sugg = tokenize(suggested ?? "");

  if (sugg.length === 0) return { kind: "noop" };
  if (orig.length < MIN_ORIGINAL_TOKENS) return { kind: "unknown" };

  // Common prefix.
  let p = 0;
  while (p < orig.length && p < sugg.length && orig[p].key === sugg[p].key) p++;

  // Common suffix over what neither side has already consumed. Buys the
  // moved-trailing-period case and mid-sentence insertions for free.
  let q = 0;
  while (
    q < orig.length - p
    && q < sugg.length - p
    && orig[orig.length - 1 - q].key === sugg[sugg.length - 1 - q].key
  ) q++;

  const keptOriginal = p + q;
  if (keptOriginal / orig.length < REWRITE_THRESHOLD) return { kind: "rewrite" };

  const addedFrom = p;
  const addedTo = sugg.length - q;
  if (addedTo <= addedFrom) return { kind: "noop" };

  const addedStart = sugg[addedFrom].start;
  const addedEnd = sugg[addedTo - 1].end;
  return {
    kind: "append",
    addedStart,
    addedEnd,
    added: suggested.slice(addedStart, addedEnd),
  };
}

/**
 * Combine several suggestions that all target the SAME bullet.
 *
 * Applying them one after another cannot work: each `suggested` was generated
 * from the pristine bullet, so writing them in sequence means the last one wins
 * and every earlier addition is silently dropped — while the UI still reports
 * every gap as addressed. Instead, take each suggestion's ADDITION and append
 * them to the shared original in turn.
 *
 * Returns null when the set cannot be merged honestly (any member is a real
 * rewrite rather than an addition, or two additions duplicate each other), so
 * the caller can ask the user instead of guessing.
 */
export function mergeGapFixSuggestions(original: string, suggestions: string[]): string | null {
  const usable = suggestions.map((s) => (s ?? "").trim()).filter(Boolean);
  if (usable.length === 0) return null;
  if (usable.length === 1) return usable[0];

  let merged = original.trim();
  if (!merged) return null;

  for (const suggested of usable) {
    const delta = gapFixAppendDelta(original, suggested);
    if (delta.kind === "noop") continue;
    if (delta.kind !== "append") return null; // a rewrite cannot be stacked

    const addition = delta.added.trim();
    if (!addition) continue;
    // Already carried by an earlier addition (or by the original itself).
    if (merged.toLowerCase().includes(addition.toLowerCase())) continue;

    merged = joinClause(merged, addition);
  }

  return merged === original.trim() ? null : merged;
}

/** Append a clause to a sentence without doubling punctuation. */
function joinClause(base: string, addition: string): string {
  const trimmedBase = base.replace(/\s+$/, "");
  const endsSentence = /[.!?]$/.test(trimmedBase);
  const startsLower = /^[a-z]/.test(addition);

  if (endsSentence) {
    const capitalized = startsLower
      ? addition.charAt(0).toUpperCase() + addition.slice(1)
      : addition;
    return `${trimmedBase} ${capitalized}`;
  }
  // Mid-sentence: keep the addition as a trailing clause.
  const withoutTrailingComma = trimmedBase.replace(/,$/, "");
  return `${withoutTrailingComma}, ${addition}`;
}
