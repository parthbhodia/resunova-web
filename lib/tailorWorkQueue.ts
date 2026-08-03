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

export type QueueStatus = "queued" | "applied" | "needs_review" | "not_coverable" | "ignored";

export interface QueueItem {
  /** Stable across re-derivations: kind + normalized name. */
  id: string;
  name: string;
  kind: QueueKind;
  status: QueueStatus;
  /** Queued: the analysis/bridge text. Terminal: the outcome reason. */
  detail: string;
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
  open: number;
}

export function queueCounts(items: readonly QueueItem[]): QueueCounts {
  let applied = 0;
  let needsReview = 0;
  let notCoverable = 0;
  let ignored = 0;
  for (const it of items) {
    if (it.status === "applied") applied++;
    else if (it.status === "needs_review") needsReview++;
    else if (it.status === "not_coverable") notCoverable++;
    else if (it.status === "ignored") ignored++;
  }
  return {
    total: items.length,
    applied,
    needsReview,
    notCoverable,
    ignored,
    open: items.length - applied - needsReview - notCoverable - ignored,
  };
}

/**
 * Grouping for the queue.
 *
 * The v3 design groups the work so a long list reads as a few short ones. The
 * original plan grouped by requirement importance (required vs preferred), but
 * that was dropped after measuring the real data: across 277 concepts from 15
 * production scans, importance is 94.6% "required", and 9 of those 15 scans
 * had ZERO non-required concepts. Grouping on it would put everything in one
 * bucket for most users, which is not a grouping.
 *
 * Kind is the honest axis instead. It is already how the rest of the surface
 * talks (the dimension chips read Qualifications / Responsibilities /
 * Keywords), it needs no join between two independent LLM outputs, and it
 * cannot collapse.
 *
 * Order is by leverage: a missing qualification costs more than a missing
 * keyword, and contextual items are last because they are usually best left
 * uncovered.
 */
export const QUEUE_KIND_ORDER: readonly QueueKind[] = [
  "qualification",
  "responsibility",
  "keyword",
  "contextual",
] as const;

export const QUEUE_KIND_LABEL: Record<QueueKind, string> = {
  qualification: "Qualifications",
  responsibility: "What the role does",
  keyword: "Keywords",
  contextual: "About the employer",
};

export interface QueueGroup {
  kind: QueueKind;
  label: string;
  items: QueueItem[];
}

/** Group in QUEUE_KIND_ORDER, dropping empties. Order within a group is the
 *  order the items arrived, which is already priority order from the rater. */
export function groupQueueByKind(items: readonly QueueItem[]): QueueGroup[] {
  const out: QueueGroup[] = [];
  for (const kind of QUEUE_KIND_ORDER) {
    const inKind = items.filter((it) => it.kind === kind);
    if (inKind.length) out.push({ kind, label: QUEUE_KIND_LABEL[kind], items: inKind });
  }
  return out;
}
