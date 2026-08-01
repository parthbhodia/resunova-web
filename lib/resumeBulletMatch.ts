/**
 * Shared bullet ↔ line matching for Analyze preview and Tailor gap-fix.
 * Single index model: `findBulletIndexForLine` maps extract lines to `bulletAnalysis[i]`.
 */

import { looksLikeStructuredEmploymentLine } from "@/lib/profileFromResumeText";
import {
  normalizeResumeExtractLine as normalizeExtractLine,
  looksLikeLoneJobTitleLine,
  looksLikeEntryHeader,
  isGapFixEligibleLine,
} from "@/lib/resumeEntryLineHeuristics";
import { stripInlineMarkdown } from "@/lib/inlineMarkdown";

export interface LiveBulletItem {
  originalBullet: string;
  score: number;
  issues: string[];
  improvedBullet: string;
}

export function normalizeForMatch(s: string): string {
  return s
    .replace(/•/g, "•")
    .replace(/^\s*[•*·\-–—]+\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map one extracted line to a bulletAnalysis index, or -1. Skips entry headers / job metadata. */
export function findBulletIndexForLine(
  line: string,
  bulletAnalysis: LiveBulletItem[],
): number {
  const trimmed = normalizeExtractLine(line);
  if (trimmed.length < 4) return -1;
  if (looksLikeEntryHeader(trimmed)) return -1;
  if (looksLikeStructuredEmploymentLine(trimmed)) return -1;
  if (looksLikeLoneJobTitleLine(trimmed)) return -1;

  const ln = normalizeForMatch(line);
  if (ln.length < 4) return -1;

  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < bulletAnalysis.length; i++) {
    const b = normalizeForMatch(bulletAnalysis[i].originalBullet);
    if (!b || b.length < 4) continue;
    let s = 0;
    if (ln === b) s = 100;
    else if (ln.includes(b) || b.includes(ln)) {
      s = Math.min(80, (Math.min(ln.length, b.length) / Math.max(ln.length, b.length)) * 90);
      if (s < 55 && ln.length >= 6 && b.endsWith(ln)) s = 60;
    } else {
      const p = Math.min(24, b.length - 1);
      if (ln.slice(0, p) === b.slice(0, p) && p >= 12) s = 55;
      else if (ln.length >= 6 && b.endsWith(ln)) s = 60;
    }
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return bestScore >= 55 ? best : -1;
}

function formatOverrideBullet(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^[•\-–*]/.test(t) || /^\u2022/.test(t) ? t : `• ${t.replace(/^•\s*/, "")}`;
}

/** Find a profile line index whose text best matches gap-fix `original`. */
export function findLineIndexForOriginal(original: string, lines: string[]): number {
  const origNorm = normalizeForMatch(original);
  if (origNorm.length < 6) return -1;

  let best = -1;
  let bestScore = 0;
  for (let li = 0; li < lines.length; li++) {
    if (!isGapFixEligibleLine(lines[li])) continue;
    const ln = normalizeForMatch(lines[li]);
    if (ln.length < 4) continue;
    if (ln === origNorm) return li;
    if (ln.includes(origNorm) || origNorm.includes(ln)) {
      const s = Math.min(ln.length, origNorm.length) / Math.max(ln.length, origNorm.length);
      if (s > bestScore) {
        bestScore = s;
        best = li;
      }
    }
  }
  return bestScore >= 0.45 ? best : -1;
}

/** Merge index-based preview overrides into plain text (Tailor rescore / gap-fix API). */
export function synthesizeProfileWithBulletOverrides(
  profileText: string,
  bullets: LiveBulletItem[],
  overrides: Record<number, string>,
): string {
  if (!Object.keys(overrides).length) return profileText;
  const lines = profileText.split("\n");
  const patched = [...lines];
  const seen = new Set<number>();

  for (let li = 0; li < lines.length; li++) {
    const idx = findBulletIndexForLine(lines[li], bullets);
    if (idx < 0 || overrides[idx] === undefined || seen.has(idx)) continue;
    const raw = stripInlineMarkdown(overrides[idx]).trim();
    if (!raw) continue;
    patched[li] = formatOverrideBullet(raw);
    seen.add(idx);
  }

  for (const [idxStr, overrideText] of Object.entries(overrides)) {
    const idx = Number(idxStr);
    if (seen.has(idx)) continue;
    const raw = stripInlineMarkdown(overrideText).trim();
    if (!raw) continue;
    const bullet = bullets[idx];
    const original = bullet?.originalBullet?.trim() ?? "";
    let lineIdx = original ? findLineIndexForOriginal(original, lines) : -1;
    if (lineIdx < 0 && original) {
      lineIdx = findLineIndexForOriginal(original, patched);
    }
    if (lineIdx >= 0) {
      patched[lineIdx] = formatOverrideBullet(raw);
      seen.add(idx);
      continue;
    }
    patched.push(formatOverrideBullet(raw));
    seen.add(idx);
  }

  return patched.join("\n");
}

// ── Tailor gap-fix: reverse-map suggestion `original` → bullet index ─────────

/** Match gap-fix `original` to an existing bulletAnalysis index, or -1. */
export function matchOriginalToBulletIndex(
  original: string,
  bullets: LiveBulletItem[],
  profileText: string,
): number {
  const origNorm = normalizeForMatch(original);
  if (!origNorm || origNorm.length < 8) return -1;

  for (let i = 0; i < bullets.length; i++) {
    const bNorm = normalizeForMatch(bullets[i].originalBullet);
    if (!bNorm) continue;
    if (bNorm === origNorm) return i;
    if (bNorm.length >= 20 && origNorm.length >= 20) {
      if (bNorm.includes(origNorm) || origNorm.includes(bNorm)) return i;
    }
  }

  const probe: LiveBulletItem = {
    originalBullet: original.trim(),
    score: 0,
    issues: [],
    improvedBullet: "",
  };

  for (const line of profileText.split("\n")) {
    if (findBulletIndexForLine(line, [probe]) !== 0) continue;
    const idx = findBulletIndexForLine(line, bullets);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Register a gap-fix target as a synthetic bullet when it is not in analysis output. */
export function registerGapFixBullet(
  bullets: LiveBulletItem[],
  original: string,
  suggested: string,
  profileText = "",
): { bullets: LiveBulletItem[]; index: number } {
  const existing = matchOriginalToBulletIndex(original, bullets, profileText);
  if (existing >= 0) return { bullets, index: existing };

  const next: LiveBulletItem = {
    originalBullet: original.trim(),
    score: 65,
    issues: [],
    improvedBullet: suggested.trim(),
  };
  return { bullets: [...bullets, next], index: bullets.length };
}

export function resolveBulletIndexForGapFix(
  original: string,
  suggested: string,
  bullets: LiveBulletItem[],
  profileText: string,
): { bullets: LiveBulletItem[]; index: number } {
  const idx = matchOriginalToBulletIndex(original, bullets, profileText);
  if (idx >= 0) return { bullets, index: idx };
  return registerGapFixBullet(bullets, original, suggested, profileText);
}

/**
 * suggestion.id → bulletAnalysis index, for the suggestions that match a bullet.
 *
 * Suggestions whose `original` matches nothing are OMITTED rather than stored as
 * -1: at apply time those go through registerGapFixBullet and become a new
 * bullet, so the card must not claim to be editing an existing one.
 */
export function gapFixTargetBulletMap(
  suggestions: Array<{ id: string; original: string }>,
  bullets: LiveBulletItem[],
  profileText: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of suggestions) {
    const idx = matchOriginalToBulletIndex(s.original, bullets, profileText);
    if (idx >= 0) map.set(s.id, idx);
  }
  return map;
}

/** Indices to purple-highlight while a gap-fix panel is open (existing analysis bullets only). */
export function gapFixTargetBulletIndices(
  suggestions: Array<{ original: string; suggested: string }>,
  bullets: LiveBulletItem[],
  profileText: string,
): number[] {
  const indices = new Set<number>();
  for (const s of suggestions) {
    const idx = matchOriginalToBulletIndex(s.original, bullets, profileText);
    if (idx >= 0) indices.add(idx);
  }
  return [...indices];
}

// ── "See it": applied queue row → the preview bullet its fix landed on ─────

/**
 * Which preview override line an applied gap's fix landed on.
 *
 * The applied action stores the SUGGESTED text; the preview stores the same
 * text as `lineOverrides[bulletIdx]`. Batch applies join several suggestions
 * with newlines and label the action with every gap name, so we prefer the
 * line that mentions the gap by name before falling back to the first line.
 * Returns the bullet index, or null when nothing matches (e.g. the fix became
 * a brand-new appended bullet the caller can't frame).
 */
export function findAppliedBulletIndex(
  gapName: string,
  actions: ReadonlyArray<{ label: string; appliedText?: string }>,
  overrides: Record<number, string>,
): number | null {
  const name = gapName.trim().toLowerCase();
  if (!name) return null;
  const action = [...actions]
    .reverse()
    .find((a) => a.appliedText?.trim() && a.label.toLowerCase().includes(name));
  if (!action?.appliedText) return null;

  const lines = action.appliedText.split("\n").map((l) => l.trim()).filter(Boolean);
  // A rewrite rarely quotes the gap name verbatim ("CI/CD pipeline experience"
  // lands as "…a CI/CD pipeline"), so score by word overlap instead.
  const words = name.split(/[^a-z0-9/+#.]+/).filter((w) => w.length > 2);
  let preferred = lines[0];
  let bestHits = 0;
  for (const l of lines) {
    const ll = l.toLowerCase();
    const hits = words.filter((w) => ll.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      preferred = l;
    }
  }
  if (!preferred) return null;

  const target = normalizeForMatch(preferred);
  for (const [idxStr, text] of Object.entries(overrides)) {
    const norm = normalizeForMatch(text ?? "");
    if (!norm) continue;
    if (norm === target || norm.includes(target) || target.includes(norm)) {
      return Number(idxStr);
    }
  }
  return null;
}

// ── Patch structured résumé with applied overrides ────────────────────────
// When the user applies gap fixes we patch the preview via `previewLineOverrides`,
// but re-checking the score used to re-extract structure from the patched flat
// text (slow + imprecise). Instead, apply the overrides directly onto the
// structured doc and send that — one less LLM call and the structure stays exact.

/** Replace a bullet that fuzzy-matches `originalText` with `newText`.
 *  Returns true when a replacement was made. */
function _replaceBulletInList(
  bullets: string[],
  originalText: string,
  newText: string,
): boolean {
  const needle = normalizeForMatch(originalText);
  for (let i = 0; i < bullets.length; i++) {
    const norm = normalizeForMatch(bullets[i]);
    if (norm === needle || (needle.length >= 16 && (norm.includes(needle) || needle.includes(norm)))) {
      // Preserve the leading marker style from the original bullet.
      const leadingMarker = /^[\s•\-–—*·]+/.exec(bullets[i])?.[0] ?? "";
      const clean = newText.replace(/^[\s•\-–—*·]+/, "").trim();
      bullets[i] = leadingMarker + clean;
      return true;
    }
  }
  return false;
}

/**
 * Deep-clone a structured résumé and apply `tailorLineOverrides` onto its
 * experience and project bullets.
 *
 * `bulletAnalysis[bulletIdx].originalBullet` tells us which bullet was replaced
 * (fuzzy-matched against each section's bullets[]). Unknown indices or misses
 * are silently skipped — the worst case is the override only lands in the flat
 * text, not the structured doc, which is identical to the current behaviour.
 */
export function patchStructuredWithOverrides<T extends {
  experience?: Array<{ bullets?: string[] }>;
  projects?: Array<{ bullets?: string[] }>;
}>(
  structured: T,
  bulletAnalysis: LiveBulletItem[],
  overrides: Record<number, string>,
): T {
  if (!structured || !Object.keys(overrides).length) return structured;

  // Deep-clone so we don't mutate the stored structured doc.
  const cloned: T = JSON.parse(JSON.stringify(structured));

  for (const [idxStr, rawNewText] of Object.entries(overrides)) {
    const idx = Number(idxStr);
    const original = bulletAnalysis[idx]?.originalBullet;
    const newText = stripInlineMarkdown(rawNewText ?? "");
    if (!original?.trim() || !newText.trim()) continue;

    let placed = false;
    for (const exp of cloned.experience ?? []) {
      if (_replaceBulletInList(exp.bullets ?? [], original, newText)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      for (const proj of cloned.projects ?? []) {
        _replaceBulletInList(proj.bullets ?? [], original, newText);
      }
    }
  }

  return cloned;
}

/** Apply PATH-based inline field edits from the Tailor preview (e.g.
 *  `exp.0.bullets.2`, `proj.1.bullets.0`) onto the structured doc, so a
 *  neutral-bullet inline edit reaches the scorer — the Tailor rescore sends the
 *  structured doc as the authoritative scored input, and these path edits are
 *  NOT covered by the index-based `patchStructuredWithOverrides`. No-op when
 *  there are no overrides. Only bullet paths affect the score; `*.head` and
 *  section edits are cosmetic and skipped here. Deep-clones lazily so unedited
 *  rescores are untouched. Paths mirror `AnalyzeLiveResumeBody`'s pushBullets
 *  prefixes (`exp.${i}.bullets`, `proj.${i}.bullets`). */
export function applyFieldOverridesToStructured<T extends {
  experience?: Array<{ bullets?: string[] }>;
  projects?: Array<{ bullets?: string[] }>;
}>(structured: T, fieldOverrides: Record<string, string> | undefined): T {
  if (!structured || !fieldOverrides || !Object.keys(fieldOverrides).length) return structured;
  let cloned: T | null = null;
  for (const [path, value] of Object.entries(fieldOverrides)) {
    const m = /^(exp|proj)\.(\d+)\.bullets\.(\d+)$/.exec(path);
    if (!m) continue; // head/section edits don't affect the deterministic score
    const text = (value ?? "").trim();
    if (!text) continue;
    if (!cloned) cloned = JSON.parse(JSON.stringify(structured)) as T;
    const list = m[1] === "exp" ? cloned.experience : cloned.projects;
    const entry = list?.[Number(m[2])];
    const bi = Number(m[3]);
    if (entry && Array.isArray(entry.bullets) && bi >= 0 && bi < entry.bullets.length) {
      entry.bullets[bi] = text;
    }
  }
  return cloned ?? structured;
}
