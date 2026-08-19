/**
 * Every edit the tailor has made to the résumé, as a reviewable list.
 *
 * Until now the only record of an applied fix was the queue row turning green
 * and the preview line changing colour. There was no way to answer "what did
 * this actually change?" without reading the whole document, and no way to take
 * one change back — the sole revert was a full reset on the next scan. That is
 * a poor deal for a surface whose entire promise is that you review what ships.
 *
 * ⚠️ THE UNIT IS THE BULLET, NOT THE REQUIREMENT, and that is not a shortcut.
 * Two requirements can be satisfied by one rewrite: `applyGapFixes` MERGES a
 * second suggestion into a bullet a first one already edited rather than
 * overwriting it. So a per-requirement undo would be a lie — reverting
 * "Kubernetes" on a bullet that also carries "Terraform" silently drops
 * Terraform too. Grouping by bullet lets a row say exactly what it will undo,
 * and name every requirement that rides on it.
 *
 * Three kinds of change, because they undo differently and read differently:
 * `fix` = a queue fix landed on a bullet; `edit` = an override with no queue
 * row (a hand edit, or a label that stopped matching); `skill` = a term added
 * to the Skills section (#267's Add-to-Skills). Skills adds used to be absent
 * from this list entirely while the header promised "every edit in the file
 * you download" — an overclaim this closes.
 */

import type { QueueItem } from "@/lib/tailorWorkQueue";
import { findAppliedBulletIndex } from "@/lib/resumeBulletMatch";

export interface ResumeChange {
  /** Stable row identity for open/confirm state and React keys. */
  key: string;
  kind: "fix" | "edit" | "skill";
  /** The bullet this change lives on. -1 for a Skills-section add. */
  bulletIndex: number;
  /** The résumé line before any fix touched it. Empty for a skills add. */
  original: string;
  /** The line as it now reads; for a skills add, the term that was added. */
  applied: string;
  /** Every requirement whose fix landed here, in the order they were applied. */
  requirements: string[];
}

interface AppliedAction {
  label: string;
  appliedText?: string;
  /** "skills" when the fix was an Add-to-Skills, not a bullet rewrite. */
  via?: string;
}

/**
 * Build the change list from state that already exists.
 *
 * Deliberately derived rather than stored: a second source of truth for "what
 * changed" would be one more thing that can disagree with the preview, and the
 * preview is what the user downloads.
 *
 * Order is the display order: queue fixes in résumé order, then skills adds
 * (the Skills section sits below the bullets it would otherwise interleave
 * with), then the user's own edits — the component draws the group boundary.
 */
export function deriveResumeChanges(
  items: readonly QueueItem[],
  actions: readonly AppliedAction[],
  overrides: Record<number, string>,
  bullets: ReadonlyArray<{ originalBullet?: string } | undefined>,
): ResumeChange[] {
  const byBullet = new Map<number, ResumeChange>();
  const skillRows: ResumeChange[] = [];
  const skillSeen = new Set<string>();

  // Requirement -> bullet, for every row that reports as applied.
  for (const item of items) {
    if (item.status !== "applied") continue;

    // An Add-to-Skills receipt is its own kind of change: no bullet moved, so
    // resolving it against the overrides would either miss (row invisible, the
    // shipped gap) or worse, claim a bullet that merely mentions the term.
    const action = actionFor(item.name, actions);
    if (action?.via === "skills") {
      const term = (action.appliedText ?? item.name).trim();
      const seenKey = term.toLowerCase();
      if (term && !skillSeen.has(seenKey)) {
        skillSeen.add(seenKey);
        skillRows.push({
          key: `skill:${seenKey}`,
          kind: "skill",
          bulletIndex: -1,
          original: "",
          applied: term,
          requirements: [item.name],
        });
      }
      continue;
    }

    const idx = findAppliedBulletIndex(item.name, actions, overrides);
    if (idx === null) continue;
    const applied = overrides[idx];
    if (!applied?.trim()) continue;
    const existing = byBullet.get(idx);
    if (existing) {
      if (!existing.requirements.includes(item.name)) existing.requirements.push(item.name);
      continue;
    }
    byBullet.set(idx, {
      key: `bullet:${idx}`,
      kind: "fix",
      bulletIndex: idx,
      original: (bullets[idx]?.originalBullet ?? "").trim(),
      applied: applied.trim(),
      requirements: [item.name],
    });
  }

  // An override with no queue row still changed the document — a bulk pass, a
  // hand edit, a requirement whose label stopped matching. Omitting it would
  // make the list quietly incomplete, which is the failure this panel exists to
  // fix, so it is included and simply names no requirement.
  for (const [key, applied] of Object.entries(overrides)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || byBullet.has(idx) || !applied?.trim()) continue;
    const original = (bullets[idx]?.originalBullet ?? "").trim();
    if (!original || original === applied.trim()) continue;
    byBullet.set(idx, {
      key: `bullet:${idx}`,
      kind: "edit",
      bulletIndex: idx,
      original,
      applied: applied.trim(),
      requirements: [],
    });
  }

  const bulletRows = [...byBullet.values()].sort((a, b) => a.bulletIndex - b.bulletIndex);
  return [
    ...bulletRows.filter((c) => c.kind === "fix"),
    ...skillRows,
    ...bulletRows.filter((c) => c.kind === "edit"),
  ];
}

/** The most recent applied action recorded for this requirement, if any. */
function actionFor(
  name: string,
  actions: readonly AppliedAction[],
): AppliedAction | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return [...actions].reverse().find((a) => a.label.trim().toLowerCase() === needle);
}

/**
 * The words this change added, for an inline diff.
 *
 * Word-level and order-insensitive: a rewrite usually keeps most of the bullet
 * and threads new terms through it, so a character diff renders as confetti
 * while "what is new here" is the only question the reader has.
 */
export function addedWords(original: string, applied: string): string[] {
  const before = new Set(tokenize(original));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of applied.split(/\s+/)) {
    const key = tokenKey(raw);
    if (!key || before.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.replace(/^[^\w(]+|[^\w)%]+$/g, ""));
  }
  return out.filter(Boolean);
}

/**
 * The applied text split into tokens, each flagged when it is one of the added
 * words — so the open row can render the new line once with the additions
 * highlighted in place, instead of asking the reader to diff two paragraphs by
 * eye. Same token fold as addedWords, so the chips and the highlights can
 * never disagree about what counts as new.
 */
export function markAddedTokens(
  original: string,
  applied: string,
): Array<{ text: string; added: boolean }> {
  const before = new Set(tokenize(original));
  return applied
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => {
      const key = tokenKey(text);
      return { text, added: Boolean(key) && !before.has(key) };
    });
}

/**
 * Compare tokens with EDGE punctuation stripped but inner punctuation kept.
 *
 * A blanket strip loses `Node.js` and `CI/CD`; keeping edges makes the last
 * word of a sentence look new every time, because "Python" and "Python." are
 * different strings. The first version did exactly that and a test caught it.
 */
function tokenKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9)%]+$/, "");
}

function tokenize(s: string): string[] {
  return s.split(/\s+/).map(tokenKey).filter(Boolean);
}
