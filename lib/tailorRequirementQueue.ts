/**
 * Fold the deterministic requirement set into the work queue.
 *
 * The reported bug: the scoreboard read "38% · 9 of 24" above a queue offering
 * three things to fix. Those numbers come from two pipelines that had never
 * been joined:
 *
 *   - the PERCENTAGE counts `requirementConcepts`, the deterministic JD
 *     extraction, matched by the server's phrase matcher;
 *   - the QUEUE came from `ratings.*.missing`, a separate LLM call whose prompt
 *     explicitly tells it to "merge overlapping/paraphrased JD duties into one
 *     canonical responsibility".
 *
 * The rater's job is a readable comparison. We were using its output as a
 * worklist, and a summary makes a bad worklist.
 *
 * ── Why this is a UNION and not a swap ──────────────────────────────────────
 *
 * The obvious fix is "build the queue from the scored concepts instead". That
 * is wrong, because the two lists disagree in BOTH directions and each is right
 * about something the other cannot see:
 *
 *   scorer unmatched + rater missing   Both agree it is a gap. Highest value:
 *                                      fixing it moves the number AND closes a
 *                                      gap a human reviewer would also see.
 *
 *   scorer unmatched + rater covered   The résumé demonstrates it, but not in
 *                                      words the matcher recognises. Invisible
 *                                      before this module, and it is the one
 *                                      class where the honest fix is to borrow
 *                                      the posting's vocabulary — the résumé is
 *                                      not lacking anything.
 *
 *   scorer matched + rater missing     A term appears, but the rater judged the
 *                                      underlying claim unevidenced ("5 years
 *                                      of Python" against one mention). Dropping
 *                                      these would delete real signal, so they
 *                                      stay — flagged as not moving the number,
 *                                      because they will not.
 *
 * Every row therefore carries WHERE IT CAME FROM, and the UI can say plainly
 * which ones move the percentage. That is also the honest answer to the
 * original complaint: the two numbers disagreed because they measure different
 * things, and the fix is to show that rather than to pick a winner.
 *
 * ── Why the join is deliberately timid ──────────────────────────────────────
 *
 * Merging a concept with a rater item means attaching that item's evidence
 * prose to that requirement. A WRONG merge therefore prints the wrong evidence
 * under a requirement, which is the exact credibility failure the
 * self-contradicting-missing fix was built to stop. A missed merge only costs a
 * duplicate-looking row. The failure modes are not symmetric, so `sameRequirement`
 * is conservative on purpose: exact normalized equality, or containment where
 * the shorter string is substantial enough that containment means something.
 *
 * Pure: no fetches, no DOM. The caller owns both inputs.
 */

import type { QueueItem, QueueKind } from "@/lib/tailorWorkQueue";
import { normalizeQueueName, queueItemId, requirementText } from "@/lib/tailorWorkQueue";

/** One requirement concept as `/api/tailor/score-preview` reports it. */
export interface UnmatchedRequirement {
  id: string;
  canonical: string;
  importance?: string;
}

/**
 * Which pipeline flagged this row, and therefore what fixing it buys.
 *
 * `scorer` is not a lesser class than `rater` — it is the one the visible
 * percentage is computed from. It is named separately only because the ADVICE
 * differs: borrow the posting's wording versus demonstrate the capability.
 */
export type QueueSource = "both" | "scorer" | "rater";

export interface SourcedQueueItem extends QueueItem {
  source: QueueSource;
  /** True when closing this row moves the coverage percentage. */
  movesScore: boolean;
}

/** Detail line for a requirement the résumé evidences in different words. */
export const WORDING_DETAIL =
  "Your resume shows this, but not in words the scanner matches. Using the posting's phrasing on the bullet below is enough.";

/** Detail line for a requirement neither pipeline found. */
export const SCORER_ONLY_DETAIL =
  "The scanner did not find this anywhere in your resume.";

/** Appended to rater-only rows so nobody expects the number to move. */
export const NO_SCORE_MOVE_NOTE =
  "The scanner already counts this as matched, so covering it will not change the percentage.";

const MIN_CONTAINMENT_LEN = 6;

/**
 * Do two requirement strings name the same thing?
 *
 * Conservative by design (see the module header): a false merge misattributes
 * evidence, a missed merge costs a duplicate row. `MIN_CONTAINMENT_LEN` keeps
 * short tokens from swallowing longer requirements — without it "R" or "API"
 * would match nearly everything by containment.
 */
export function sameRequirement(a: string, b: string): boolean {
  const x = normalizeQueueName(a);
  const y = normalizeQueueName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length < MIN_CONTAINMENT_LEN) return false;
  return long.includes(short);
}

/** Pull every requirement string out of one side of a rater ratings payload. */
function textsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((it) => requirementText(it)).filter((s) => s.length > 0);
}

export interface RaterView {
  /** Everything the rater called missing, in the order it emitted them. */
  missing: readonly string[];
  /** Everything the rater called covered — used only as counter-evidence. */
  covered: readonly string[];
}

/** Flatten the rater's qualification + responsibility lists into one view. */
export function raterView(ratings: unknown): RaterView {
  const r = (ratings ?? {}) as Record<string, unknown>;
  const side = (key: string, field: string): string[] => {
    const block = r[key] as Record<string, unknown> | undefined;
    return textsOf(block?.[field]);
  };
  return {
    missing: [...side("qualifications", "missing"), ...side("responsibilities", "missing")],
    covered: [...side("qualifications", "covered"), ...side("responsibilities", "covered")],
  };
}

/**
 * Build the queue rows the deterministic scorer is complaining about.
 *
 * Returns ONLY the scorer-derived rows. The caller merges them with
 * `deriveWorkQueue`'s rater rows, which is where `source: "rater"` comes from —
 * keeping this function honest about its one input and testable without a
 * ratings payload.
 *
 * `kind` is fixed to "qualification" so these land in the blocker band: an
 * unmatched requirement is pass/fail to a screener regardless of which list it
 * came off.
 */
export function deriveScorerQueue(
  unmatched: readonly UnmatchedRequirement[],
  rater: RaterView,
  addressed: ReadonlySet<string> = new Set(),
): SourcedQueueItem[] {
  const out: SourcedQueueItem[] = [];
  const seen = new Set<string>();
  for (const req of unmatched) {
    const name = String(req?.canonical ?? "").trim();
    if (!name) continue;
    const id = queueItemId("qualification" as QueueKind, name);
    if (seen.has(id)) continue;
    seen.add(id);

    const raterMissing = rater.missing.some((m) => sameRequirement(m, name));
    // Only consult `covered` when the rater did not also call it missing: a
    // rater that says both is not evidence of anything, and "missing" is the
    // claim that should survive the tie.
    const raterCovered = !raterMissing && rater.covered.some((c) => sameRequirement(c, name));

    out.push({
      id,
      name,
      kind: "qualification",
      status: addressed.has(normalizeQueueName(name)) ? "applied" : "queued",
      detail: raterCovered ? WORDING_DETAIL : SCORER_ONLY_DETAIL,
      source: raterMissing ? "both" : "scorer",
      // Both classes are unmatched by the scorer, so both move the number.
      movesScore: true,
    });
  }
  return out;
}

/**
 * Merge scorer rows with the rater rows already derived elsewhere.
 *
 * Scorer rows come first: they are the ones that move the visible number, and
 * a queue ordered by anything else would bury them. A rater row naming a
 * requirement a scorer row already covers is dropped, so the same requirement
 * never appears twice under two different wordings.
 *
 * Surviving rater rows are marked `movesScore: false` — not to demote them, but
 * because the alternative is a user applying six fixes and watching a
 * percentage sit still, which is the bug that started all of this.
 */
export function mergeQueues(
  scorerItems: readonly SourcedQueueItem[],
  raterItems: readonly QueueItem[],
): SourcedQueueItem[] {
  const covered = scorerItems.map((it) => it.name);
  const extra = raterItems
    .filter((it) => !covered.some((name) => sameRequirement(name, it.name)))
    .map<SourcedQueueItem>((it) => ({
      ...it,
      source: "rater",
      movesScore: false,
      detail: it.detail
        ? `${it.detail} ${NO_SCORE_MOVE_NOTE}`
        : NO_SCORE_MOVE_NOTE,
    }));
  return [...scorerItems, ...extra];
}

/**
 * How many open rows would move the percentage.
 *
 * The queue header can then say "12 of 15 move your match" instead of a bare
 * count that invites the same "why is it 43% with 3 fixes" question again.
 */
export function scoreMovingCount(items: readonly SourcedQueueItem[]): number {
  return items.filter(
    (it) => it.movesScore && (it.status === "queued" || it.status === "needs_review"),
  ).length;
}
