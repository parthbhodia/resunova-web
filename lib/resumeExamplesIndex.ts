/**
 * Search over the 60 résumé examples, without their weight.
 *
 * components/ResumeExamplesData.ts is ~353 KB of résumé bodies and nothing in
 * it is tree-shakeable (the catalog maps over the array at runtime), so any
 * import pulls the lot. The Template Builder's cold open needs to SEARCH those
 * examples, and searching only needs scalars — so it reads the generated index
 * here (~37 KB) and dynamically imports the catalog only once someone actually
 * picks an example.
 *
 * Regenerate with: node scripts/buildResumeExamplesIndex.mjs
 * The index is pinned to the catalog in both directions by
 * lib/__tests__/resumeExamplesIndex.test.ts.
 */

import raw from "@/lib/resumeExamplesIndex.generated.json";
import type { TBResumeData } from "@/components/TemplateBuilder/types";

export interface ResumeExampleIndexRow {
  id: string;
  title: string;
  category: string;
  level: string;
  desc: string;
  score: number;
  tags: string[];
  skills: string[];
}

export const RESUME_EXAMPLE_INDEX: ResumeExampleIndexRow[] = (raw.examples ??
  []) as ResumeExampleIndexRow[];

/** Must match scripts/buildResumeExamplesIndex.mjs — one definition of the id. */
export function exampleSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Categories in catalog order, deduped. */
export function exampleCategories(): string[] {
  const seen: string[] = [];
  for (const row of RESUME_EXAMPLE_INDEX) if (!seen.includes(row.category)) seen.push(row.category);
  return seen;
}

/**
 * Free-text search plus an optional category.
 *
 * Every token has to hit something, so "nurse critical" narrows rather than
 * widens — an OR would rank the whole Healthcare shelf as a match for the
 * second word and bury what the person typed first. Matching is substring on a
 * folded haystack, which is what lets "sql" find "SQL" and "PostgreSQL" alike.
 */
export function searchExamples(
  query: string,
  category?: string | null,
  index: ResumeExampleIndexRow[] = RESUME_EXAMPLE_INDEX,
): ResumeExampleIndexRow[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return index.filter((row) => {
    if (category && row.category !== category) return false;
    if (!tokens.length) return true;
    const haystack = [row.title, row.category, row.level, row.desc, ...row.tags, ...row.skills]
      .join(" ")
      .toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

/**
 * The full example document for a row, loaded on demand.
 *
 * Identity is cleared here rather than at the call site: a picker that forgot
 * would hand a fictional candidate's name and email to someone's own résumé.
 */
export async function loadExampleData(id: string): Promise<TBResumeData | null> {
  const [{ PUBLIC_RESUME_EXAMPLES }, { prefillFromRoleExample }] = await Promise.all([
    import("@/lib/resumeExamplesCatalog"),
    import("@/lib/templateBuilderPrefill"),
  ]);
  const match = PUBLIC_RESUME_EXAMPLES.find((e) => exampleSlug(e.title) === id);
  return match ? prefillFromRoleExample(match.data) : null;
}
