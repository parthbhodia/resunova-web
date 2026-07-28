/**
 * libraryFeed — the hub's unified item feed: the legacy Library kinds
 * (tailored / analyzed / builder / cover_letter, from fetchLibraryItems) plus
 * résumé versions (M3 of the reverse-merge).
 *
 * Lives in its own module because resumeVersions imports from supabase — the
 * merge layer must sit ABOVE both to avoid an import cycle.
 *
 * Complexity guardrail (founder-set): users never see "version" as a concept.
 * ONE card per résumé root — the default version if set, else the head — and
 * when a lineage was edited from a scan (source_root_id), that scan's analysis
 * cards are ABSORBED (they collapse into the version's history) so net cards
 * only shrink or stay equal.
 */
import { fetchLibraryItems, type LibraryItem } from "./supabase";
import {
  listVersionGroups,
  type ResumeVersion,
  type ResumeVersionGroup,
} from "./resumeVersions";

export interface VersionLibraryItem {
  kind: "version";
  key: string;
  id: string;
  title: string;
  subtitle: string;
  score: number | null;
  createdAt: string;
  isDefault: boolean;
  version: ResumeVersion;
  /** Lineage size (shown as history depth, never as "v3"). */
  versionCount: number;
}

export type LibraryFeedItem = LibraryItem | VersionLibraryItem;

/** The version a root's single card shows: the default if set, else the head
 * (groups arrive head-first from groupVersionsByRoot). */
export function displayVersionForGroup(group: ResumeVersionGroup): ResumeVersion {
  return group.versions.find((v) => v.isDefault) ?? group.versions[0];
}

function versionCard(group: ResumeVersionGroup): VersionLibraryItem {
  const v = displayVersionForGroup(group);
  const tailoredTo = v.jdCompany?.trim();
  return {
    kind: "version",
    key: `version:${group.root}`,
    id: v.id,
    title: v.name || "Résumé",
    subtitle: tailoredTo ? `Tailored — ${tailoredTo}` : "Editable résumé",
    score: v.lastScore,
    createdAt: v.updatedAt,
    isDefault: v.isDefault,
    version: v,
    versionCount: group.versions.length,
  };
}

/**
 * Merge the legacy items with version cards. Pure — unit-tested; the fetch
 * wrapper below feeds it.
 */
export function buildLibraryFeed(
  items: LibraryItem[],
  groups: ResumeVersionGroup[],
): LibraryFeedItem[] {
  const absorbedRoots = new Set(
    groups.flatMap((g) => g.versions.map((v) => v.sourceRootId).filter(Boolean) as string[]),
  );
  const kept = items.filter((it) => {
    if (it.kind !== "analyzed") return true;
    const analysisRoot = it.analysis.rootId ?? it.id;
    return !absorbedRoots.has(analysisRoot);
  });
  const versionCards = groups.map(versionCard);
  return [...versionCards, ...kept].sort((a, b) => {
    const d = Number(b.isDefault) - Number(a.isDefault);
    if (d !== 0) return d;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

export interface LibraryFeed {
  items: LibraryFeedItem[];
  groups: ResumeVersionGroup[];
}

/** The hub's data load: legacy items + version groups, merged. Versions
 * degrade to [] on any error so an older schema never blanks the Library. */
export async function fetchLibraryFeed(): Promise<LibraryFeed> {
  const [items, groups] = await Promise.all([
    fetchLibraryItems(),
    listVersionGroups().catch(() => [] as ResumeVersionGroup[]),
  ]);
  return { items: buildLibraryFeed(items, groups), groups };
}
