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
 */

import type { QueueItem } from "@/lib/tailorWorkQueue";
import { findAppliedBulletIndex } from "@/lib/resumeBulletMatch";

export interface ResumeChange {
  /** The bullet this change lives on. Stable for undo. */
  bulletIndex: number;
  /** The résumé line before any fix touched it. */
  original: string;
  /** The line as it now reads. */
  applied: string;
  /** Every requirement whose fix landed here, in the order they were applied. */
  requirements: string[];
}

interface AppliedAction {
  label: string;
  appliedText?: string;
}

/**
 * Build the change list from state that already exists.
 *
 * Deliberately derived rather than stored: a second source of truth for "what
 * changed" would be one more thing that can disagree with the preview, and the
 * preview is what the user downloads.
 */
export function deriveResumeChanges(
  items: readonly QueueItem[],
  actions: readonly AppliedAction[],
  overrides: Record<number, string>,
  bullets: ReadonlyArray<{ originalBullet?: string } | undefined>,
): ResumeChange[] {
  const byBullet = new Map<number, ResumeChange>();

  // Requirement -> bullet, for every row that reports as applied.
  for (const item of items) {
    if (item.status !== "applied") continue;
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
    byBullet.set(idx, { bulletIndex: idx, original, applied: applied.trim(), requirements: [] });
  }

  return [...byBullet.values()].sort((a, b) => a.bulletIndex - b.bulletIndex);
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
