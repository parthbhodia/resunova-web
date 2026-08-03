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
import {
  CONTEXTUAL_DETAIL,
  normalizeQueueName,
  queueItemId,
  requirementText,
} from "@/lib/tailorWorkQueue";

/** One requirement concept as `/api/tailor/score-preview` reports it. */
export interface UnmatchedRequirement {
  id: string;
  canonical: string;
  importance?: string;
  /** Extraction's requirement type. Absent on a backend predating the field. */
  type?: string;
}

/**
 * Extraction's requirement type → the band the row belongs in.
 *
 * These rows all shipped as `qualification`, which put every one of them in
 * "Could get you filtered out". That read as a wall of nineteen equally-urgent
 * blockers, and it also erased the thing the section headers exist to say:
 * a missing degree and a missing keyword are not the same problem and do not
 * have the same fix.
 *
 * The mapping is the honest reading of each type:
 *  - a credential, a degree, or years of experience is pass/fail to a screener;
 *  - a named skill or tool is a keyword — real, coverable, not disqualifying;
 *  - a responsibility is duty language, which lands as a keyword too;
 *  - `soft_skill` and `domain_knowledge` are the employer's context words, the
 *    same honesty class as the rater's contextual keywords: stuffing them into
 *    bullets is usually the wrong move, so they get the explainer band.
 *
 * Returns null for a type we do not recognise, or for none at all — a backend
 * predating the field sends no type. The caller then falls back to the rater's
 * own filing, and only past that to `keyword`. Never to `qualification`: that
 * was the old blanket default, so anything unaccounted for shouted, and a
 * default that is wrong quietly costs less than one that is wrong loudly.
 */
const KIND_OF_REQUIREMENT_TYPE: Record<string, QueueKind> = {
  certification: "qualification",
  license: "qualification",
  degree: "qualification",
  experience: "qualification",
  technical_skill: "keyword",
  tool: "keyword",
  responsibility: "keyword",
  soft_skill: "contextual",
  domain_knowledge: "contextual",
};

export function queueKindForRequirementType(type: string | undefined): QueueKind | null {
  return KIND_OF_REQUIREMENT_TYPE[String(type ?? "").trim()] ?? null;
}

/**
 * Which pipeline flagged this row, and therefore what fixing it buys.
 *
 * `scorer` is not a lesser class than `rater` — it is the one the visible
 * percentage is computed from. It is named separately only because the ADVICE
 * differs: borrow the posting's wording versus demonstrate the capability.
 */
export type QueueSource = "both" | "scorer" | "rater";

/**
 * What we are actually claiming about this requirement, in the user's terms.
 *
 * `source` says which pipeline flagged the row, which is bookkeeping. This says
 * what to TELL someone, and the two are not the same sentence: a row the
 * scorer missed but the rater vouched for is not "you lack this", it is "you
 * have this and the scanner cannot see it", and those call for opposite advice.
 *
 * Computed here rather than in the component on purpose. The last time a
 * renderer re-derived a classification from text it disagreed with the
 * producer, and the fix was to make the producer authoritative and have the
 * view trust it verbatim. Same rule.
 */
export type QueueVerdict = "partial" | "not_evidenced" | "keyword";

export interface SourcedQueueItem extends QueueItem {
  source: QueueSource;
  /** True when closing this row moves the coverage percentage. */
  movesScore: boolean;
  /**
   * The claim to render. Absent on contextual rows: those already carry an
   * information mark and an explainer, and a verdict word on top would be a
   * third label competing for one glance.
   */
  verdict?: QueueVerdict;
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
  /**
   * Which list each missing name came off, by normalized name.
   *
   * Needed because the merge keeps the SCORER's row and drops the rater's when
   * both name the same requirement. Without this, a requirement the rater filed
   * as a qualification but extraction sent untyped would silently lose its band
   * on the way through — the merge would be discarding information rather than
   * combining it.
   *
   * Optional: it is a hint used only when extraction did not say, and the
   * fallback chain already handles it being absent.
   */
  kindOf?: ReadonlyMap<string, QueueKind>;
}

/** Flatten the rater's qualification + responsibility lists into one view. */
export function raterView(ratings: unknown): RaterView {
  const r = (ratings ?? {}) as Record<string, unknown>;
  const side = (key: string, field: string): string[] => {
    const block = r[key] as Record<string, unknown> | undefined;
    return textsOf(block?.[field]);
  };
  const quals = side("qualifications", "missing");
  const resps = side("responsibilities", "missing");
  const kindOf = new Map<string, QueueKind>();
  for (const name of quals) kindOf.set(normalizeQueueName(name), "qualification");
  for (const name of resps) {
    const key = normalizeQueueName(name);
    if (!kindOf.has(key)) kindOf.set(key, "responsibility");
  }
  return {
    missing: [...quals, ...resps],
    covered: [...side("qualifications", "covered"), ...side("responsibilities", "covered")],
    kindOf,
  };
}

/**
 * The claim a row makes, from what we know about it.
 *
 * Order matters. `raterCovered` wins over kind because it is the strongest
 * thing we know: the rater read the résumé and vouched for this requirement,
 * so whatever type it is, the honest line is that the evidence is there and
 * the wording is not. Getting this backwards would tell someone they lack
 * something their own résumé demonstrates.
 */
function verdictFor(kind: QueueKind, raterCovered: boolean): QueueVerdict | undefined {
  if (kind === "contextual") return undefined;
  if (raterCovered) return "partial";
  return kind === "keyword" ? "keyword" : "not_evidenced";
}

/**
 * Build the queue rows the deterministic scorer is complaining about.
 *
 * Returns ONLY the scorer-derived rows. The caller merges them with
 * `deriveWorkQueue`'s rater rows, which is where `source: "rater"` comes from —
 * keeping this function honest about its one input and testable without a
 * ratings payload.
 *
 * `kind` comes from the requirement's own extraction type, so a degree bands as
 * a blocker and a tool bands as a keyword. It used to be fixed to
 * "qualification", which filed every row under one header and told the user
 * that nineteen unrelated things were all the same kind of urgent.
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
    // Extraction's own type first: it is a claim about what the requirement
    // IS. The rater's list membership is only where it filed the comparison,
    // so it fills the gap rather than overriding. `keyword` last, because a
    // row we know nothing about should not be shouting.
    const kind =
      queueKindForRequirementType(req?.type)
      ?? rater.kindOf?.get(normalizeQueueName(name))
      ?? "keyword";
    const id = queueItemId(kind, name);
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
      kind,
      status: addressed.has(normalizeQueueName(name)) ? "applied" : "queued",
      // A contextual row keeps the explainer even though the scanner did miss
      // it. "The scanner did not find this" reads as a to-do, and for an
      // employer-domain word the honest answer is that writing it in is
      // usually the wrong move — the same class the rater's contextual
      // keywords are already handled as.
      detail: kind === "contextual"
        ? CONTEXTUAL_DETAIL
        : raterCovered ? WORDING_DETAIL : SCORER_ONLY_DETAIL,
      source: raterMissing ? "both" : "scorer",
      // Both classes are unmatched by the scorer, so both move the number.
      movesScore: true,
      verdict: verdictFor(kind, raterCovered),
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
      // The scanner already matched the term; the rater judged the claim
      // behind it unevidenced. From the reader's side that is the same
      // sentence as any other gap, so it carries the same word.
      verdict: verdictFor(it.kind, false),
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
