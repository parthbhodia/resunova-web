/**
 * Deterministic "add these keywords to the Skills section".
 *
 * The bulk counterpart to per-keyword "Fix with AI". A bare technology name
 * (C++, Go, compilers) belongs in the skills list, and putting it there needs
 * no LLM and touches no bullet — so it cannot collide with a gap fix the way a
 * bullet rewrite can. Contextual phrases ("debugging large-scale systems") are
 * not skills-list material and are deliberately not handled here.
 */

import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { normalizeGapKeyStrict } from "@/lib/tailorGapFix";

export const DEFAULT_SKILL_CATEGORY = "Skills";

/** Category names offered in the picker: what the résumé already has, else a default. */
export function skillCategoryOptions(structured: StructuredResume | null): string[] {
  const names = (structured?.skills ?? [])
    .map((g) => (g.category || "").trim())
    .filter(Boolean);
  return names.length ? names : [DEFAULT_SKILL_CATEGORY];
}

/** Every skill already listed, in strict-normalized form, for dedupe. */
function existingSkillKeys(structured: StructuredResume): Set<string> {
  const keys = new Set<string>();
  for (const group of structured.skills ?? []) {
    for (const item of group.items ?? []) {
      const key = normalizeGapKeyStrict(item);
      if (key) keys.add(key);
    }
  }
  return keys;
}

export type AddSkillsResult = {
  structured: StructuredResume;
  /** Keywords written into the résumé, in input order. */
  added: string[];
  /** Keywords the résumé already listed, so nothing was written for them. */
  skipped: string[];
};

/**
 * Append `keywords` to `category`, creating the category when absent.
 *
 * Returns a new document; never mutates the input. Already-present skills are
 * reported as `skipped` rather than duplicated, and the caller still wants them
 * marked addressed — the résumé does cover them, which is why they were skipped.
 */
export function addSkillsToStructured(
  structured: StructuredResume,
  keywords: string[],
  category: string = DEFAULT_SKILL_CATEGORY,
): AddSkillsResult {
  const present = existingSkillKeys(structured);
  const added: string[] = [];
  const skipped: string[] = [];
  const seenThisCall = new Set<string>();

  for (const raw of keywords) {
    const kw = (raw ?? "").trim();
    if (!kw) continue;
    const key = normalizeGapKeyStrict(kw);
    if (!key || seenThisCall.has(key)) continue;
    seenThisCall.add(key);
    if (present.has(key)) skipped.push(kw);
    else added.push(kw);
  }

  if (added.length === 0) return { structured, added, skipped };

  const target = (category || DEFAULT_SKILL_CATEGORY).trim() || DEFAULT_SKILL_CATEGORY;
  const targetKey = target.toLowerCase();
  const groups = structured.skills ?? [];
  const idx = groups.findIndex((g) => (g.category || "").trim().toLowerCase() === targetKey);

  const nextSkills = idx >= 0
    ? groups.map((g, i) => (i === idx ? { ...g, items: [...(g.items ?? []), ...added] } : g))
    : [...groups, { category: target, items: [...added] }];

  return { structured: { ...structured, skills: nextSkills }, added, skipped };
}
