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
  /** `added` = a line the user wrote themselves under a role; it has no
   *  original and lives in the structured doc, not the override map. */
  kind: "fix" | "edit" | "skill" | "added" | "title";
  /** The bullet this change lives on. -1 for a Skills-section add or an
   *  added line (the preview's bullet list predates it). */
  bulletIndex: number;
  /** The résumé line before any fix touched it. Empty for a skills add. */
  original: string;
  /** The line as it now reads; for a skills add, the term that was added. */
  applied: string;
  /** Every requirement whose fix landed here, in the order they were applied. */
  requirements: string[];
  /** For `added`: the structured entry the line sits under, for undo. */
  entryPath?: string;
  /**
   * Words on this line that the résumé does not back, so the reader can judge
   * what rests on their word without reopening the fix.
   *
   * ⚠️ FILTERED TO WHAT IS ACTUALLY STILL THERE. The server marks the
   * suggestion it wrote, and the user can edit a suggestion before applying
   * it — including deleting the very word that was flagged. Carrying the
   * server's list verbatim would then warn about a word that is not in the
   * document, which is the same class of false claim the mark exists to
   * prevent, pointing the other way.
   *
   * ⚠️ UNION ACROSS THE BULLET, because the unit here is the bullet and two
   * fixes merge onto one line. If either addition rests on the user's word,
   * the line does.
   */
  unverifiedTerms: string[];
}

/** Union a second fix's surviving terms onto a row two fixes merged into. */
function mergeUnverified(
  row: ResumeChange,
  terms: readonly string[] | undefined,
  appliedText: string,
): void {
  const seen = new Set(row.unverifiedTerms.map((t) => t.toLowerCase()));
  for (const term of survivingUnverifiedTerms(terms, appliedText)) {
    if (seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    row.unverifiedTerms.push(term);
  }
}

/**
 * Case- and whitespace-insensitive "is this word still in the line?".
 *
 * Punctuation is deliberately NOT folded: `C++` and `Node.js` are terms, and
 * stripping their punctuation would make them match text that does not say
 * them.
 */
function stillPresent(term: string, text: string): boolean {
  const fold = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const t = fold(term);
  if (!t) return false;
  return fold(text).includes(t);
}

/**
 * The unverified words from one action that survive into the applied line.
 *
 * Exported for the test that pins the edit case: the whole point is that a
 * user who deletes the flagged word is not then warned about it.
 */
export function survivingUnverifiedTerms(
  terms: readonly string[] | undefined,
  appliedText: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of terms ?? []) {
    const term = String(raw).trim();
    if (!term || !stillPresent(term, appliedText)) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  return out;
}

interface AppliedAction {
  label: string;
  appliedText?: string;
  /** "skills" when the fix was an Add-to-Skills; "bullet" when the user
   *  wrote the line; "title" when an Experience job title changed.
   *  Anything else is a bullet rewrite. */
  via?: string;
  entryPath?: string;
  originalText?: string;
  /**
   * Words the résumé does not back, from the server's `unverified_terms` /
   * `unverified_numerals` on the suggestion that was applied.
   *
   * ⚠️ AGGRESSIVE IS THE DEFAULT (`DEFAULT_TAILORING_MODE`, founder-directed
   * 2026-10-26), so the product WRITES additions that rest on the
   * candidate's word rather than dropping them. That only stays honest while
   * the mark is visible, and the version picker's badge disappears the moment
   * the fix is applied. After a bulk pass the change log was the only record
   * left, and it showed a grounded rewrite and one riding on an unevidenced
   * tool identically — so "keep it or not" meant reopening every row.
   */
  unverifiedTerms?: string[];
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
  const addedRows = new Map<string, ResumeChange>();
  const titleRows: ResumeChange[] = [];
  const titleSeen = new Set<string>();

  // Requirement -> bullet, for every row that reports as applied.
  for (const item of items) {
    if (item.status !== "applied") continue;

    // An Add-to-Skills receipt is its own kind of change: no bullet moved, so
    // resolving it against the overrides would either miss (row invisible, the
    // shipped gap) or worse, claim a bullet that merely mentions the term.
    const action = actionFor(item.name, actions);
    if (action?.via === "title") {
      const path = (action.entryPath ?? "").trim() || `title:${item.name}`;
      if (!titleSeen.has(path)) {
        titleSeen.add(path);
        titleRows.push({
          key: `title:${path}`,
          kind: "title",
          bulletIndex: -1,
          original: (action.originalText ?? "").trim(),
          applied: (action.appliedText ?? item.name).trim(),
          requirements: [item.name],
          entryPath: action.entryPath,
          unverifiedTerms: survivingUnverifiedTerms(
            action.unverifiedTerms,
            (action.appliedText ?? item.name).trim(),
          ),
        });
      }
      continue;
    }

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
          unverifiedTerms: survivingUnverifiedTerms(action.unverifiedTerms, term),
        });
      }
      continue;
    }

    // A line the user wrote lives in the structured doc, not the override
    // map, so it is keyed on its own text. Two requirements answered by one
    // typed line share the row, same as a merged rewrite.
    if (action?.via === "bullet" && action.appliedText?.trim()) {
      const text = action.appliedText.trim();
      const key = `added:${text.toLowerCase()}`;
      const existing = addedRows.get(key);
      if (existing) {
        if (!existing.requirements.includes(item.name)) existing.requirements.push(item.name);
        mergeUnverified(existing, action.unverifiedTerms, text);
      } else {
        addedRows.set(key, {
          key,
          kind: "added",
          bulletIndex: -1,
          original: "",
          applied: text,
          requirements: [item.name],
          entryPath: action.entryPath,
          unverifiedTerms: survivingUnverifiedTerms(action.unverifiedTerms, text),
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
      mergeUnverified(existing, action?.unverifiedTerms, applied.trim());
      continue;
    }
    byBullet.set(idx, {
      key: `bullet:${idx}`,
      kind: "fix",
      bulletIndex: idx,
      original: (bullets[idx]?.originalBullet ?? "").trim(),
      applied: applied.trim(),
      requirements: [item.name],
      unverifiedTerms: survivingUnverifiedTerms(action?.unverifiedTerms, applied.trim()),
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
      // An override with no queue row has no suggestion behind it, so there
      // is no server mark to carry. A hand edit is the user's own words by
      // definition; claiming otherwise would invent a warning.
      unverifiedTerms: [],
    });
  }

  // Tools filed as a side-effect of a rewrite never have their own queue
  // row. They still changed the document, so they still need a receipt —
  // otherwise Undo on the bullet leaves Terraform in Skills with no way
  // to take it back.
  for (const action of actions) {
    if (action.via === "title") {
      const path = (action.entryPath ?? "").trim();
      if (!path || titleSeen.has(path)) continue;
      titleSeen.add(path);
      const applied = (action.appliedText ?? action.label).trim();
      if (!applied) continue;
      titleRows.push({
        key: `title:${path}`,
        kind: "title",
        bulletIndex: -1,
        original: (action.originalText ?? "").trim(),
        applied,
        requirements: [action.label],
        entryPath: path,
        unverifiedTerms: survivingUnverifiedTerms(action.unverifiedTerms, applied),
      });
      continue;
    }
    if (action.via !== "skills") continue;
    const term = (action.appliedText ?? action.label).trim();
    const seenKey = term.toLowerCase();
    if (!term || skillSeen.has(seenKey)) continue;
    skillSeen.add(seenKey);
    skillRows.push({
      key: `skill:${seenKey}`,
      kind: "skill",
      bulletIndex: -1,
      unverifiedTerms: survivingUnverifiedTerms(action.unverifiedTerms, term),
      original: "",
      applied: term,
      requirements: [action.label],
    });
  }

  const bulletRows = [...byBullet.values()].sort((a, b) => a.bulletIndex - b.bulletIndex);
  return [
    ...bulletRows.filter((c) => c.kind === "fix"),
    ...addedRows.values(),
    ...skillRows,
    ...titleRows,
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
