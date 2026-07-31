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

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

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

  for (const it of ratings.qualifications.missing) {
    push("qualification", it.text, it.analysis ?? it.context ?? "");
  }
  for (const it of ratings.responsibilities.missing) {
    push("responsibility", it.text, it.analysis ?? it.context ?? "");
  }
  const kw = ratings.keywords;
  for (const name of kw.direct_skills?.missing ?? kw.missing ?? []) {
    push("keyword", name, "Missing from your resume. Fits an existing bullet.");
  }
  for (const name of kw.contextual?.missing ?? []) {
    push("contextual", name, CONTEXTUAL_DETAIL);
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
