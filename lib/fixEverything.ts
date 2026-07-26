/**
 * "Fix everything": gather every open gap into a few batched requests.
 *
 * Working the gaps one at a time means a round trip, a panel and an apply per
 * gap — and every round re-reads the résumé, so later fixes land on bullets
 * earlier ones already changed. Batching by TYPE keeps each prompt focused
 * (qualifications, responsibilities and keywords want different framing) while
 * bounding the whole pass at three calls instead of a dozen.
 *
 * This module is pure: it decides WHAT to ask for. The caller owns the fetch,
 * the review step and the apply.
 */

import type { AddressedGapAction, RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import { isGapAddressed } from "@/lib/tailorGapFix";

export type GapType = AddressedGapAction["type"];

export type GapBatch = {
  type: GapType;
  /** Human label for the batch, shown while it runs. */
  label: string;
  /** Gap names, in the order they appear in the report. */
  gaps: string[];
  /** Per-gap analysis text, to give the model something to bridge from. */
  notes: string;
};

/**
 * Cap per batch. Past roughly this many the prompt stops producing targeted
 * rewrites and starts producing generic ones, which the server-side validators
 * then reject anyway — so asking for more costs tokens and returns less.
 */
export const MAX_GAPS_PER_BATCH = 8;

function take(list: string[]): string[] {
  return list.slice(0, MAX_GAPS_PER_BATCH);
}

/**
 * Every gap still open, grouped into at most three batches.
 *
 * Already-addressed gaps are skipped, so running this twice does not re-fix
 * what the user already applied.
 */
export function collectUnaddressedGaps(
  ratings: RatingsData | null | undefined,
  addressed: ReadonlySet<string>,
  actions?: readonly AddressedGapAction[],
): GapBatch[] {
  if (!ratings || !isDetailedRatings(ratings)) return [];
  const open = (text: string) => !isGapAddressed(text, addressed, actions);
  const batches: GapBatch[] = [];

  const quals = ratings.qualifications.missing.filter((i) => open(i.text));
  if (quals.length) {
    batches.push({
      type: "qualification",
      label: "qualifications",
      gaps: take(quals.map((i) => i.text)),
      notes: take(quals.map((i) => `${i.text}: ${i.context ?? ""}`.trim())).join("\n"),
    });
  }

  const resps = ratings.responsibilities.missing.filter((i) => open(i.text));
  if (resps.length) {
    batches.push({
      type: "responsibility",
      label: "responsibilities",
      gaps: take(resps.map((i) => i.text)),
      notes: take(resps.map((i) => `${i.text}: ${i.context ?? ""}`.trim())).join("\n"),
    });
  }

  const kw = ratings.keywords;
  const keywords = [
    ...(kw?.direct_skills?.missing ?? kw?.missing ?? []),
    ...(kw?.contextual?.missing ?? []),
  ].filter(open);
  if (keywords.length) {
    batches.push({
      type: "keyword",
      label: "keywords",
      gaps: take(keywords),
      notes: `These keywords from the posting are missing: ${take(keywords).join(", ")}.`,
    });
  }

  return batches;
}

/** Total gaps a run would attempt, for the button label. */
export function countGaps(batches: GapBatch[]): number {
  return batches.reduce((n, b) => n + b.gaps.length, 0);
}

/**
 * The single gap "name" a batch is requested under.
 *
 * The API takes one gap per call, so a batch is asked for as a combined label.
 * Keeping the individual names in it matters: the apply path marks gaps
 * addressed by matching these labels, so a batch that hides its members would
 * leave every one of them showing as still missing.
 */
export function batchGapName(batch: GapBatch): string {
  return batch.gaps.join(", ");
}

/** Prompt notes for a batch, telling the model to cover as many as it honestly can. */
export function batchGapNotes(batch: GapBatch): string {
  return (
    `${batch.notes}\n\n`
    + `Cover as many of these ${batch.label} as the résumé can honestly support. `
    + "Prefer one rewrite that carries several over several separate rewrites of "
    + "the same bullet. Never invent experience, employers, titles or metrics to "
    + "fit a gap. Leave a gap uncovered rather than fabricate it."
  );
}
