import { PUBLIC_RESUME_EXAMPLES } from "@/lib/resumeExamplesCatalog";

/**
 * Picks the full example résumé (a complete TBResumeData document from the
 * examples catalog) that best represents a /resume-examples/[role] page's role
 * — so the role pages can render an ACTUAL résumé instead of a text fragment.
 *
 * Reads from PUBLIC_RESUME_EXAMPLES (not the raw ResumeExamplesData) — that's
 * the sanitized layer: candidate name/email/phone/links scrubbed to a generic
 * placeholder, and stylePreset remapped onto a preset that actually exists in
 * TBStylePreset (the raw data's stylePreset values predate a template-system
 * rework and no longer resolve to a real preset).
 *
 * Matching: each role slug maps to a catalog category; within the category we
 * rank by title-token overlap with the role label, tie-broken by the example's
 * score. Roles with no matching category (e.g. paralegal — no Legal examples
 * yet) return null and the page falls back to its text example.
 */

export type FullResumeExample = (typeof PUBLIC_RESUME_EXAMPLES)[number];

const ROLE_CATEGORY: Record<string, string> = {
  "software-engineer": "Software Engineering",
  "data-analyst": "Data Science",
  "registered-nurse": "Healthcare",
  "sales-representative": "Sales",
  "operations-manager": "Project Management",
  "financial-analyst": "Finance",
  "marketing-manager": "Marketing",
  "product-manager": "Product Management",
  recruiter: "Human Resources",
  teacher: "Education",
  "graphic-designer": "Graphic Design",
  // paralegal: no matching example category yet — page keeps its text example.
};

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2),
  );
}

export function fullExampleForRole(slug: string, roleLabel: string): FullResumeExample | null {
  const category = ROLE_CATEGORY[slug];
  if (!category) return null;
  const pool = PUBLIC_RESUME_EXAMPLES.filter((e) => e.category === category);
  if (pool.length === 0) return null;

  const want = tokens(roleLabel);
  let best: FullResumeExample | null = null;
  let bestOverlap = -1;
  for (const e of pool) {
    let overlap = 0;
    for (const t of tokens(e.title)) if (want.has(t)) overlap += 1;
    if (overlap > bestOverlap || (overlap === bestOverlap && best !== null && e.score > best.score)) {
      best = e;
      bestOverlap = overlap;
    }
  }
  return best;
}
