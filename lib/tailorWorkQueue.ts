/**
 * The Tailor work queue — one list, explicit endings.
 *
 * Today the results page asks the user to reconcile three surfaces that each
 * own a slice of the work: gap cards, the missing-keywords card, and the
 * fix-everything banner. They disagree in exactly the way users notice
 * ("I clicked Fix everything and it still says 6 missing").
 *
 * This module is the single projection they all collapse into: every open
 * item — qualification, responsibility, keyword — becomes one QueueItem, and
 * every item ends in an explicit terminal state:
 *
 *   applied        — a change landed in the preview
 *   needs_review   — a change landed but carries a claim the user must verify
 *                    (aggressive-mode JD mirroring)
 *   not_coverable  — the résumé cannot honestly support it; `detail` says why
 *   ignored        — the user chose to leave it out; reversible
 *
 * A capped or not-yet-attempted item stays `queued` — never silently
 * "missing". Pure data in, pure data out: the caller owns fetches and DOM.
 */

import type { AddressedGapAction, RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import { isGapAddressed } from "@/lib/tailorGapFix";

export type QueueKind = "qualification" | "responsibility" | "keyword" | "contextual";

/**
 * `covered` is not an outcome of work — it is a requirement the résumé already
 * satisfies, carried so the queue can show it as reassurance rather than
 * leaving it invisible. It must never count as open: a requirement you meet
 * inflating the number you are judged on is the same overcounting this queue
 * was built to end.
 */
export type QueueStatus =
  | "queued"
  | "applied"
  | "needs_review"
  | "not_coverable"
  | "ignored"
  | "covered";

export interface QueueItem {
  /** Stable across re-derivations: kind + normalized name. */
  id: string;
  name: string;
  kind: QueueKind;
  status: QueueStatus;
  /** Queued: the analysis/bridge text. Terminal: the outcome reason. */
  detail: string;
  /**
   * Where the row renders when its `kind` would put it in the wrong place.
   *
   * Exists for exactly one class so far: a rater row whose TERM the scanner
   * already matched (`unbacked`). Its kind is `qualification`, and
   * qualifications band as "Could get you filtered out" — but nothing can
   * filter on a term that is present in the document, so the honest home is
   * the upside band. Optional and absent everywhere else: an unset override
   * is byte-identical old behaviour.
   */
  band?: QueueBand;
}

/** Employer-domain words are a different honesty class from skills: the right
 *  move is usually NOT to stuff them into bullets. The queue carries them so
 *  nothing is silently "missing", but the UI offers explanation + a summary
 *  weave instead of a bullet rewrite. */
export const CONTEXTUAL_DETAIL =
  "A word about the employer's business, not a skill. Worth adding only if you've genuinely worked in that area.";

/** Detail line stamped when the user ignores an item. */
export const IGNORED_DETAIL = "Ignored. It stays here if you change your mind.";

const norm = (s: string) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Pull the requirement text out of whatever the rater actually emitted.
 *
 * `DetailedRatingItem.text` is typed as a string, but these payloads come from
 * an LLM and TypeScript's types are erased at runtime, so the declaration is a
 * hope rather than a guarantee. Production hit `TypeError: e.trim is not a
 * function` here: an item arrived whose `text` was present but not a string,
 * and the whole page went down with it.
 *
 * Two real shapes are accepted: the documented `{ text: "..." }`, and a bare
 * string, which the model emits often enough to be worth keeping rather than
 * discarding. Anything else yields "" and the caller skips the item, so one
 * malformed requirement costs that requirement instead of the report.
 */
export function requirementText(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (typeof item === "number") return String(item);
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    // The documented key first, then the aliases the rater actually emits.
    for (const key of REQUIREMENT_TEXT_KEYS) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    // Last resort: an unrecognized wrapper with exactly one string in it is
    // almost certainly the label under a name we have not seen. Guessing here
    // beats the alternative, which is dropping a requirement the user needs to
    // see, or rendering "[object Object]" at them.
    const strings = Object.values(o).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    if (strings.length === 1) return strings[0].trim();
  }
  return "";
}

/** Ordered by how much we trust them; `text` is the documented shape. */
const REQUIREMENT_TEXT_KEYS = [
  "text",
  "keyword",
  "name",
  "label",
  "skill",
  "term",
  "requirement",
  "title",
  "value",
] as const;

/** The normalization item ids (and the ignored-names set) key on. */
export function normalizeQueueName(name: string): string {
  return norm(name);
}

export function queueItemId(kind: QueueKind, name: string): string {
  return `${kind}:${norm(name)}`;
}

/**
 * Flatten a detailed ratings payload into the queue, priority-ordered:
 * qualifications first (highest leverage), then responsibilities, then
 * injectable keywords, then contextual keywords (lowest — often best left
 * uncovered). Items the user already addressed arrive as `applied`.
 */
export function deriveWorkQueue(
  ratings: RatingsData | null | undefined,
  addressed: ReadonlySet<string>,
  actions?: readonly AddressedGapAction[],
): QueueItem[] {
  if (!ratings || !isDetailedRatings(ratings)) return [];
  const items: QueueItem[] = [];
  const seen = new Set<string>();

  const push = (kind: QueueKind, name: string, detail: string) => {
    const id = queueItemId(kind, name);
    if (!name.trim() || seen.has(id)) return;
    seen.add(id);
    items.push({
      id,
      name: name.trim(),
      kind,
      status: isGapAddressed(name, addressed, actions) ? "applied" : "queued",
      detail,
    });
  };

  const detailOf = (it: unknown): string => {
    if (!it || typeof it !== "object") return "";
    const o = it as { analysis?: unknown; context?: unknown };
    if (typeof o.analysis === "string") return o.analysis;
    if (typeof o.context === "string") return o.context;
    return "";
  };

  for (const it of ratings.qualifications.missing) {
    push("qualification", requirementText(it), detailOf(it));
  }
  for (const it of ratings.responsibilities.missing) {
    push("responsibility", requirementText(it), detailOf(it));
  }
  /**
   * Rows the user already fixed STAY ON SCREEN, in the band they were fixed in.
   *
   * The reported bug: applying a fix on a rater row made it vanish from the
   * panel entirely. `applyOptimisticGapAddressed` moves the gap from `missing`
   * into `resolved_by_user` — and this function read only `missing`, while
   * `deriveCoveredQueue` reads only `covered`, so an applied row had no home
   * anywhere on the queue surface. The user watched their own work disappear,
   * which is the exact "silently vanishing queue item" this queue's first
   * invariant forbids. Scorer rows never had this hole (their source list is
   * immutable), which is why only rater rows vanished — an asymmetry, not a
   * design.
   *
   * `status: "applied"` (never re-derived from `addressed`): the row IS the
   * record that a fix landed, with the ✓ and "See it" every other applied row
   * gets, and `queueCounts` keeps it out of `open` so nothing re-counts it as
   * work.
   */
  const pushResolved = (kind: QueueKind, list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const it of list) {
      const name = requirementText(it);
      const id = queueItemId(kind, name);
      if (!name.trim() || seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        name: name.trim(),
        kind,
        status: "applied",
        detail: detailOf(it) || "Fix applied. Re-check to confirm.",
      });
    }
  };
  pushResolved("qualification", ratings.qualifications.resolved_by_user);
  pushResolved("responsibility", ratings.responsibilities.resolved_by_user);
  const kw = ratings.keywords;
  for (const name of kw.direct_skills?.missing ?? kw.missing ?? []) {
    push("keyword", requirementText(name), "Missing from your resume. Fits an existing bullet.");
  }
  for (const name of kw.contextual?.missing ?? []) {
    push("contextual", requirementText(name), CONTEXTUAL_DETAIL);
  }
  return items;
}

/** Immutable status transition; also swaps in the outcome reason. */
export function withStatus(
  items: readonly QueueItem[],
  id: string,
  status: QueueStatus,
  detail?: string,
): QueueItem[] {
  return items.map((it) =>
    it.id === id ? { ...it, status, detail: detail ?? it.detail } : it,
  );
}

export interface QueueCounts {
  total: number;
  applied: number;
  needsReview: number;
  notCoverable: number;
  ignored: number;
  /** Requirements the résumé already satisfies. Never work, never open. */
  covered: number;
  open: number;
}

export function queueCounts(items: readonly QueueItem[]): QueueCounts {
  let applied = 0;
  let needsReview = 0;
  let notCoverable = 0;
  let ignored = 0;
  let covered = 0;
  for (const it of items) {
    if (it.status === "applied") applied++;
    else if (it.status === "needs_review") needsReview++;
    else if (it.status === "not_coverable") notCoverable++;
    else if (it.status === "ignored") ignored++;
    else if (it.status === "covered") covered++;
  }
  return {
    total: items.length,
    applied,
    needsReview,
    notCoverable,
    ignored,
    covered,
    open: items.length - applied - needsReview - notCoverable - ignored - covered,
  };
}

/**
 * Grouping for the queue.
 *
 * The v3 design groups the work so a long list reads as a few short ones, and
 * it groups on CONSEQUENCE — "could get you filtered out" — rather than on the
 * taxonomy the rater happens to use. A header saying "Qualifications" tells a
 * user which LLM field the item came out of; a header saying what the item
 * costs them tells them whether to care.
 *
 * Two axes were considered and rejected before this one:
 *
 *  - Requirement importance (required vs preferred). Killed by measurement:
 *    across 277 concepts from 15 production scans, importance is 94.6%
 *    "required", and 9 of those 15 had ZERO non-required concepts. It would
 *    put everything in one bucket for most users, which is not a grouping.
 *  - Kind alone. Shipped briefly and it is what the mockup does not do: four
 *    grey headers naming the source field, with qualifications and
 *    responsibilities split apart even though they carry the same stakes.
 *
 * Band is derived from kind, so it needs no join between two independent LLM
 * outputs and cannot collapse to one bucket the way importance does.
 */
export type QueueBand = "blocker" | "boost" | "context" | "covered";

/** Ordered by what it costs to leave the band unaddressed. */
export const QUEUE_BAND_ORDER: readonly QueueBand[] = [
  "blocker",
  "boost",
  "context",
  // Last on purpose: it is the only band that asks nothing of the reader, so
  // it must never sit above work.
  "covered",
] as const;

/** Hard requirements read as pass/fail to a screener; keywords are upside;
 *  employer-domain words are usually best left alone. */
const BAND_OF_KIND: Record<QueueKind, QueueBand> = {
  qualification: "blocker",
  responsibility: "blocker",
  keyword: "boost",
  contextual: "context",
};

export const QUEUE_BAND_LABEL: Record<QueueBand, string> = {
  blocker: "Could get you filtered out",
  boost: "Worth adding",
  context: "About the employer",
  covered: "Already covered",
};

/** Severity, not state. State is the row's own status dot, so the two stay
 *  independently readable (and survive a greyscale print). */
export type QueueTone = "crit" | "warn" | "muted" | "good";

const BAND_TONE: Record<QueueBand, QueueTone> = {
  blocker: "crit",
  boost: "warn",
  context: "muted",
  covered: "good",
};

export interface QueueGroup {
  band: QueueBand;
  label: string;
  tone: QueueTone;
  /** Items still awaiting a decision. The header counts THIS, not the group
   *  size: once you have handled a row, saying it could still filter you out
   *  is the same overcounting the queue exists to end. */
  open: number;
  items: QueueItem[];
  /** Rows collapsed out of `items` by the per-band cap.
   *
   *  Zero for the bands that matter. A blocker you cannot see is a blocker you
   *  will not fix, so those never collapse; only the two advisory bands do. */
  hidden: number;
}

/**
 * How many rows a band shows before collapsing.
 *
 * `Infinity` for the work bands is the whole point. The queue used to slice the
 * flat list to five rows BEFORE grouping, which on a 24-requirement posting
 * rendered two bands out of four and — worse — printed each band's count from
 * the surviving slice, so "COULD GET YOU FILTERED OUT · 2" sat above seven real
 * blockers. Hiding work is bad; under-reporting it while looking complete is
 * the failure this queue was built to end.
 *
 * The advisory bands still collapse: neither asks the user to do anything, so
 * length there is cost without benefit.
 */
export const BAND_ROW_CAP: Record<QueueBand, number> = {
  blocker: Infinity,
  boost: Infinity,
  context: 3,
  covered: 3,
};

const isOpen = (it: QueueItem) => it.status === "queued" || it.status === "needs_review";

/**
 * Did the user get somewhere with this row?
 *
 * `applied` is a change that landed; `ignored` is a decision they made. Both are
 * outcomes they own. `not_coverable` is neither — it is the product failing to
 * help, and colouring a band of those green under the word "ALL SET" told
 * someone staring at nineteen dead requirements that everything was fine.
 */
const isResolvedWell = (it: QueueItem) => it.status === "applied" || it.status === "ignored";

/**
 * Group in QUEUE_BAND_ORDER, dropping empties. Order within a band is the order
 * the items arrived, which is already priority order from the rater.
 *
 * A band whose items are all resolved turns `good` rather than disappearing:
 * the work is worth showing as done, and dropping it would make rows vanish
 * from under the user as they fix them.
 */
export function groupQueueBySeverity(
  items: readonly QueueItem[],
  /** Expand every band regardless of its cap. */
  showAll = false,
): QueueGroup[] {
  const out: QueueGroup[] = [];
  for (const band of QUEUE_BAND_ORDER) {
    // Status wins over kind for `covered`: what a covered requirement IS
    // (a degree, a tool) stops mattering once the résumé satisfies it, and
    // filing it by kind would scatter reassurance through the work bands.
    const inBand = items.filter((it) =>
      it.status === "covered"
        ? band === "covered"
        // The row's own override outranks its kind — see QueueItem.band. An
        // unset override reproduces the old mapping exactly.
        : band !== "covered" && (it.band ?? BAND_OF_KIND[it.kind]) === band,
    );
    if (!inBand.length) continue;
    const open = inBand.filter(isOpen).length;
    // Green only when every row ended somewhere the user chose. A band of
    // "not coverable" has nothing open and is not remotely all set.
    const allWell = inBand.every(isResolvedWell);
    // Counts come from the FULL band, never from what survives the cap.
    const cap = showAll ? Infinity : BAND_ROW_CAP[band];
    const shown = Number.isFinite(cap) ? inBand.slice(0, cap) : inBand;
    out.push({
      band,
      label: QUEUE_BAND_LABEL[band],
      tone: open === 0 && allWell ? "good" : BAND_TONE[band],
      open,
      items: shown,
      hidden: inBand.length - shown.length,
    });
  }
  return out;
}
