import type { AnalyzeRecord } from "@/lib/supabase";

export interface AnalyzeVersionGroup {
  root: string;
  recs: AnalyzeRecord[];
}

/**
 * Group analysis-history rows into version lineages, keyed by root_id.
 *
 * - Groups are ordered by most-recent activity (newest version's createdAt).
 * - Within a group, the newest version comes first (highest `version`, then
 *   most-recent `createdAt` as a tiebreak) so `recs[0]` is always the head.
 * - Rows without lineage fields (legacy DB rows / localStorage) are treated as
 *   their own v1 root, so pre-versioning history renders unchanged.
 */
export function groupAnalysesByRoot(recs: AnalyzeRecord[]): AnalyzeVersionGroup[] {
  const byRoot = new Map<string, AnalyzeRecord[]>();
  for (const rec of recs) {
    const root = rec.rootId ?? rec.id;
    const list = byRoot.get(root);
    if (list) list.push(rec);
    else byRoot.set(root, [rec]);
  }

  const groups: AnalyzeVersionGroup[] = Array.from(byRoot.entries()).map(([root, list]) => {
    const sorted = [...list].sort(
      (a, b) =>
        (b.version ?? 1) - (a.version ?? 1) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { root, recs: sorted };
  });

  groups.sort(
    (a, b) =>
      new Date(b.recs[0].createdAt).getTime() - new Date(a.recs[0].createdAt).getTime(),
  );
  return groups;
}
