import type { AnalyzeRecord } from "@/lib/supabase";

export interface AnalyzeVersionGroup {
  root: string;
  recs: AnalyzeRecord[];
}

/**
 * Variant grouping — a CONTENT axis (parallel, independently-editable
 * profiles) layered above the version LINEAGE above (a time axis). See
 * docs/RESUME_VARIANTS_PLAN.md.
 */
export interface AnalyzeVariantGroup {
  /** Coalesced key: `variantGroup` when set, else a synthetic per-user
   *  implicit group so legacy/no-variant rows still group together. */
  key: string;
  /** Display name — the RAW stored variant_name ("Default" for untagged
   *  rows). Callers apply user_profiles.variant_display_names overrides on
   *  top of this for the rendered label; this module has no knowledge of
   *  that user preference. */
  name: string;
  /** Root-lineage groups (existing groupAnalysesByRoot) belonging to this
   *  variant, newest-active root first. */
  roots: AnalyzeVersionGroup[];
  /** Most recent activity across every root in this variant. */
  latestCreatedAt: string;
}

const IMPLICIT_VARIANT_GROUP = "__implicit__";
export const IMPLICIT_VARIANT_NAME = "Default";

function effectiveVariantKey(rec: AnalyzeRecord): string {
  return rec.variantGroup ?? IMPLICIT_VARIANT_GROUP;
}
function effectiveVariantName(rec: AnalyzeRecord): string {
  return rec.variantName ?? IMPLICIT_VARIANT_NAME;
}

/**
 * Group analysis-history rows into variants, each variant itself grouped
 * into version lineages via `groupAnalysesByRoot`.
 *
 * - Rows with no `variantGroup`/`variantName` (every row today, and any
 *   legacy row forever) all coalesce into one implicit "Default" variant —
 *   so a user who has never used variants sees exactly one group, unchanged
 *   from before this existed.
 * - Groups are ordered by most-recent activity (mirrors `groupAnalysesByRoot`).
 *   Which variant is the user's chosen DEFAULT is not decided here — that's
 *   a `user_profiles.default_variant_name` preference the caller applies
 *   (this module only knows what's IN the rows).
 */
export function groupAnalysesByVariant(recs: AnalyzeRecord[]): AnalyzeVariantGroup[] {
  const byKey = new Map<string, { name: string; recs: AnalyzeRecord[] }>();
  for (const rec of recs) {
    const key = `${effectiveVariantKey(rec)}::${effectiveVariantName(rec)}`;
    const entry = byKey.get(key);
    if (entry) entry.recs.push(rec);
    else byKey.set(key, { name: effectiveVariantName(rec), recs: [rec] });
  }

  const groups: AnalyzeVariantGroup[] = Array.from(byKey.entries()).map(([key, { name, recs: list }]) => {
    const roots = groupAnalysesByRoot(list);
    const latestCreatedAt = roots[0]?.recs[0]?.createdAt ?? list[0].createdAt;
    return { key, name, roots, latestCreatedAt };
  });

  groups.sort(
    (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime(),
  );
  return groups;
}

/**
 * The row Jobs feed / Boost should rank against: the lineage head of the
 * user's DEFAULT variant. `defaultVariantName` is the raw stored name from
 * `user_profiles.default_variant_name` (null = the implicit "Default").
 * Falls back to the single most-recently-active row across ALL variants when
 * the named default isn't found (deleted variant, stale pointer, or — the
 * common case today — no variants exist at all) — today's exact behavior.
 */
export function defaultVariantHead(
  recs: AnalyzeRecord[],
  defaultVariantName?: string | null,
): AnalyzeRecord | null {
  if (!recs.length) return null;
  const groups = groupAnalysesByVariant(recs);
  const wanted = defaultVariantName ?? IMPLICIT_VARIANT_NAME;
  const match = groups.find((g) => g.name === wanted);
  const chosen = match ?? groups[0];
  return chosen?.roots[0]?.recs[0] ?? null;
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
