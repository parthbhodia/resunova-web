/**
 * Add a missing keyword to the résumé's Skills section.
 *
 * Founder-asked 2026-08-15: "What if a user also has a skill section,
 * shouldnt we add it there ? such skills ?" — and it resolves the same
 * complaint as the story-fit prompt rule: a bare tool keyword forced into a
 * prose bullet produces splices that stop making sense ("integrating C++"
 * inside a PostgreSQL-schema bullet), while the Skills section is where such
 * a term makes sense BY CONSTRUCTION. The scanner counts it the same either
 * way; the bullet weave stays available as the stronger option for the
 * recruiter, and the queue's own copy is honest that a list mention is the
 * weaker form ("reads as experience, not a pasted keyword").
 *
 * Mirrors lib/educationEntry.ts: pure structured-doc surgery; the caller owns
 * the re-flatten + stale-marking so the entry reaches preview, download and
 * rescore at once.
 */

import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const fold = (s: string) => s.trim().toLowerCase();

/** True when the term is already listed in any skills group, case-folded. */
export function skillAlreadyListed(structured: StructuredResume, term: string): boolean {
  const t = fold(term);
  if (!t) return false;
  return (structured.skills ?? []).some((g) =>
    (g.items ?? []).some((item) => fold(item) === t),
  );
}

/**
 * Append `term` to the résumé's skills. Returns the (possibly unchanged)
 * document plus whether anything was added, so the caller can tell the user
 * "already listed" instead of silently pretending.
 *
 * Goes into the FIRST group: that is the primary skills line, where both a
 * scanner sweep and a skimming recruiter look first. A category-name guess
 * (Languages vs Tools vs Cloud) would be wrong often enough to be worse than
 * predictable — the user can drag it later, and the dedupe above means the
 * cost of a suboptimal group is one visible, editable word. With no skills
 * section at all, one is created, titled plainly.
 */
export function appendSkill(
  structured: StructuredResume,
  term: string,
): { structured: StructuredResume; added: boolean } {
  const t = term.trim();
  if (!t || skillAlreadyListed(structured, t)) return { structured, added: false };
  const skills = structured.skills ?? [];
  if (skills.length === 0) {
    return {
      structured: { ...structured, skills: [{ category: "Skills", items: [t] }] },
      added: true,
    };
  }
  const [first, ...rest] = skills;
  return {
    structured: {
      ...structured,
      skills: [{ ...first, items: [...(first.items ?? []), t] }, ...rest],
    },
    added: true,
  };
}
