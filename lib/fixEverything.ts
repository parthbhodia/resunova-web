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
import type { TailoringMode } from "@/lib/tailoringMode";
import { isUnleveledDegreeRequirement } from "@/lib/degreeRequirement";

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

/**
 * Permission to add a line the résumé does not already have.
 *
 * Honest mode never gets this. Aggressive mode does: a duty that cannot land
 * on an existing bullet was being dropped, then shown as impossible. A new
 * bullet under a role the résumé already lists is the fix. A new employer,
 * credential, or number is still refused. Retitling an existing role toward
 * the posting is allowed when the work is the same job under a different name.
 *
 * ⚠️ No all-caps or CamelCase words in this text. The server reads every such
 * token in gap_notes as a posting term each rewrite must contain, so "XYZ" and
 * "MAY" here made it reject every honest rewrite and keep only the ones that
 * wrote "using XYZ methodology" into a bullet.
 */
export function inventedBulletPermission(mode: TailoringMode | null | undefined): string {
  if (mode !== "aggressive") return "";
  return (
    "Write the bullet as what was accomplished, the result it produced, and how it was done, in one plain sentence. "
    + "Naturally include this requirement. Start with a strong action verb. "
    + "Never name a formula or method for writing bullets, and never output template letters or brackets such as X, Y, Z or [ ]. "
    + "If it cannot be woven into an existing bullet, invent one new bullet under the closest existing role. "
    + "Return a new bullet with an empty original and the full line as suggested. "
    + "Any result you cite must already be on the résumé. "
    + "Do not invent a new employer, credential, or number. "
    + "You may retitle an existing role toward the posting's job title when the work already described is the same job under a different name. "
    + "If you retitle, set suggested_role to the new title on that suggestion and keep employer unchanged. "
    + "Do not invent a new role, do not change an employer name, and do not promote intern or student titles to senior, staff, or director."
  );
}

/** Prompt notes for a batch. Aggressive mode may add one new bullet. */
export function batchGapNotes(batch: GapBatch, mode?: TailoringMode | null): string {
  const permission = inventedBulletPermission(mode);
  if (permission) {
    return (
      `${batch.notes}\n\n`
      + `Cover this ${batch.label} from the résumé. ${permission}`
    );
  }
  return (
    `${batch.notes}\n\n`
    + `Cover as many of these ${batch.label} as the résumé can honestly support. `
    + "Prefer one rewrite that carries several over several separate rewrites of "
    + "the same bullet. Never invent experience, employers, titles or metrics to "
    + "fit a gap. Leave a gap uncovered rather than fabricate it."
  );
}

/** A suggestion the apply path can use: a rewrite of a real line, or a new bullet. */
export function suggestionIsUsable(s: { original?: string; suggested?: string }): boolean {
  const suggested = (s.suggested ?? "").trim();
  if (!suggested) return false;
  const original = (s.original ?? "").trim();
  if (introducesPlaceholder(original, suggested)) return false;
  if (original) return true;
  return suggested.length >= 12;
}

/**
 * Template residue the model echoes from its own instructions: "using XYZ
 * methodology", "[X]", "[metric]". Shipped once on a real résumé. Only counts
 * when the original did not already say it, so a real "XYZ Corp" survives.
 */
const PLACEHOLDER_RE =
  /\bXYZ\b|\[\s*(?:[XYZ]|metric|number|result|impact|insert[^\]]*|placeholder)\s*\]/i;

function introducesPlaceholder(original: string, suggested: string): boolean {
  const hit = suggested.match(PLACEHOLDER_RE);
  if (!hit) return false;
  return !original.toLowerCase().includes(hit[0].toLowerCase());
}

/** Append one bullet to plain profile text when there is no structured experience to hang it on. */
export function appendBulletLine(profile: string, bullet: string): string {
  const line = bullet.trim().replace(/^[-•·*▪▸→>]+\s*/, "");
  if (!line) return profile;
  const body = profile.replace(/\s+$/, "");
  if (body.toLowerCase().includes(line.toLowerCase())) return profile;
  const formatted = `• ${line}`;
  return body ? `${body}\n${formatted}` : formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Covering the whole queue
//
// `collectUnaddressedGaps` reads the RATER's missing lists. The queue the user
// sees is wider than that: it also carries the deterministic scorer's unmatched
// requirements, which is the whole point of showing them. Filtering the user's
// selection down to the rater's batches therefore silently dropped most rows —
// "Improve 19 blockers" would attempt three and then report the other sixteen
// as impossible.
//
// Two silent drops caused that, and both are fixed here:
//   1. a selected name with no rater batch was filtered out entirely;
//   2. `take()` caps each batch at MAX_GAPS_PER_BATCH, so even rater-known
//      gaps past the eighth never ran.
//
// A pass now produces one run per selected name, always. A name the rater never
// mentioned gets a synthesized batch carrying just itself.
// ─────────────────────────────────────────────────────────────────────────────

/** A requirement no bullet rewrite can honestly create, with the reason why. */
export interface UncoverableReason {
  name: string;
  reason: string;
}

/**
 * Requirements a rewrite can never close, however good the résumé is.
 *
 * A degree is the clear case: you either hold it or you do not, and no honest
 * rephrasing of an existing bullet produces one. Spending a call on it wastes a
 * request and — worse — comes back empty, which the UI then reported as "couldn't
 * be written from your real experience", blaming the résumé for a category error.
 *
 * Deliberately narrow. "5 years of experience with Java" is NOT included: the
 * years cannot be invented, but the Java can well be evidenced somewhere the
 * matcher missed, and wrongly blocking that costs the user a real fix. Same
 * asymmetry as `sameRequirement` — a false block is worse than a wasted call.
 */
const CREDENTIAL_RE =
  /\b(bachelor'?s?|master'?s?|phd|ph\.d|doctorate|associate'?s?|mba|b\.?s\.?c?|m\.?s\.?c?)\b.{0,40}\b(degree|diploma)\b|\b(degree|diploma)\b.{0,40}\b(bachelor'?s?|master'?s?|phd|doctorate)\b|^\s*(bachelor'?s?|master'?s?|phd|doctorate)\b/i;

export function uncoverableReason(name: string): string | null {
  const t = (name || "").trim();
  if (!t) return null;
  if (CREDENTIAL_RE.test(t) || isUnleveledDegreeRequirement(t)) {
    return "A credential, not something a rewrite can add. Leave it out unless you hold it.";
  }
  return null;
}

/** One gap-fix request: a batch carrying exactly one gap. */
export type GapRun = GapBatch;

export interface QueueRunPlan {
  /** One run per attemptable name, in the order the caller supplied them. */
  runs: GapRun[];
  /** Names skipped because no rewrite could ever close them. */
  uncoverable: UncoverableReason[];
}

/**
 * Plan a pass over exactly the names the user selected.
 *
 * `known` supplies type/notes for names the rater described; anything else gets
 * a synthesized single-gap batch so it is still attempted. Nothing is dropped
 * for being unknown, and nothing is capped — the caller asked for these rows by
 * name, and quietly attempting a subset is the bug this replaces.
 */
export function planQueueRuns(
  names: readonly string[],
  known: GapBatch[],
  detailOf?: (name: string) => string,
): QueueRunPlan {
  const norm = (s: string) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  /**
   * The slice of a batch's notes that is about ONE gap.
   *
   * A run carries a single gap, so it must never carry the whole batch's
   * notes. Field-found: the keyword batch note reads "These keywords from
   * the posting are missing: Go, Cursor, EKS, …", so every per-keyword call
   * shipped the word "Go" — and the server's refusal guard read that as
   * "this gap needs Go", refusing SEVEN fixable keywords because the résumé
   * lacks one unfixable one. The sibling list also invited the model to
   * weave in terms the validators then rejected.
   *
   * Single-gap batches own their notes outright. Multi-gap qual/resp notes
   * are per-gap "gap: analysis" lines, so only this gap's line rides along;
   * the keyword enumeration has no per-gap line and contributes nothing.
   */
  const perGapNote = (b: GapBatch, gap: string): string => {
    const notes = (b.notes ?? "").trim();
    if (!notes) return "";
    if (b.gaps.length === 1) return notes;
    const key = norm(gap);
    const line = notes
      .split("\n")
      .find((ln) => norm(ln.split(":")[0] ?? "") === key);
    return line?.trim() ?? "";
  };

  const typeByName = new Map<string, GapType>();
  const noteByName = new Map<string, string>();
  for (const b of known) {
    for (const g of b.gaps) {
      typeByName.set(norm(g), b.type);
      const note = perGapNote(b, g);
      if (note) noteByName.set(norm(g), note);
    }
  }

  const runs: GapRun[] = [];
  const uncoverable: UncoverableReason[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const name = String(raw ?? "").trim();
    const key = norm(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);

    const blocked = uncoverableReason(name);
    if (blocked) {
      uncoverable.push({ name, reason: blocked });
      continue;
    }

    const detail = detailOf?.(name)?.trim() || "";
    runs.push({
      // A requirement the rater never classified is asked for as a
      // qualification: it is the framing that assumes least about the item.
      type: typeByName.get(key) ?? "qualification",
      label: "requirement",
      gaps: [name],
      // Per-gap notes only — see perGapNote above for why the shared batch
      // notes must never ride on a single-gap run.
      notes:
        noteByName.get(key) ||
        (detail
          ? `${name}: ${detail}`
          : `This requirement from the posting is not evidenced yet: ${name}.`),
    });
  }

  return { runs, uncoverable };
}

// ─────────────────────────────────────────────────────────────────────────────
// One rewrite per bullet, per pass
//
// Every run in a pass is sent the SAME pristine résumé (the structured doc and
// profile are built once, before the loop). So several runs independently pick
// whichever bullet is most flexible and each returns a rewrite OF THAT SAME
// LINE, differing only in the clause they weave in.
//
// The apply path fuzzy-matches on `original`. Once the first rewrite has
// replaced the line, the second one's `original` no longer matches anything, so
// instead of replacing it gets APPENDED. A field report showed one bullet
// carrying three copies of its own tail and a résumé running 533px past page
// one.
//
// Widening the pass from three attempts to nineteen multiplies this exactly
// nineteen-fold, so the guard has to land with it: a bullet that has already
// been rewritten in this pass is spent, and later suggestions for it are
// dropped rather than stacked.
// ─────────────────────────────────────────────────────────────────────────────

/** The shape the pass carries between the API and the apply path. */
export interface PassSuggestion {
  original?: string;
  suggested?: string;
}

/** Same normalization the queue uses, so two spellings of a line collide. */
function bulletKey(text: string): string {
  return String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Keep only the suggestions whose target bullet is still untouched this pass.
 *
 * Mutates nothing: returns the survivors plus the bullets now spent, so the
 * caller threads one set through the loop. A run that returns three rewrites of
 * one line keeps the first — the runs are ordered by queue priority, so the
 * earlier one is the higher-value gap.
 */
export function keepFirstRewritePerBullet(
  suggestions: readonly PassSuggestion[],
  used: ReadonlySet<string>,
): { kept: PassSuggestion[]; used: Set<string> } {
  const next = new Set(used);
  const kept: PassSuggestion[] = [];
  for (const s of suggestions) {
    const key = bulletKey(s?.original ?? "");
    // No original means a new bullet, not a rewrite of a line we already
    // spent. Keep it, and only drop a second copy of the same new line.
    if (!key) {
      const text = (s?.suggested ?? "").trim();
      if (text.length < 12) continue;
      const invented = `new:${bulletKey(text)}`;
      if (next.has(invented)) continue;
      next.add(invented);
      kept.push(s);
      continue;
    }
    if (next.has(key)) continue;
    next.add(key);
    kept.push(s);
  }
  return { kept, used: next };
}
