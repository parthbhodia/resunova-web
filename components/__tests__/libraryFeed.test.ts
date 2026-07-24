import { describe, expect, it } from "vitest";
import { buildLibraryFeed, displayVersionForGroup } from "@/lib/libraryFeed";
import type { LibraryItem } from "@/lib/supabase";
import type { ResumeVersion, ResumeVersionGroup } from "@/lib/resumeVersions";

/* M3 guardrail: one card per résumé root; a version ABSORBS its source scan's
 * analysis cards; net cards only shrink or stay equal; no "version" vocabulary
 * in card copy. */

function mkVersion(over: Partial<ResumeVersion>): ResumeVersion {
  return {
    id: "v1", name: "Parth — SWE", rootId: "v1", parentId: null, version: 1,
    structured: null, extractedText: null, origin: "manual", sourcePdfUrl: null,
    jdText: null, jdCompany: null, jdTitle: null, lastScore: 78, lastScoreSource: "estimate",
    isDefault: false, sourceRootId: null,
    createdAt: "2026-07-20T00:00:00Z", updatedAt: "2026-07-24T00:00:00Z",
    ...over,
  };
}

function analyzedItem(id: string, rootId: string | null, createdAt = "2026-07-10T00:00:00Z"): LibraryItem {
  return {
    kind: "analyzed", key: `analyzed:${id}`, id, title: `Scan ${id}`, subtitle: "Resume analysis",
    score: 66, createdAt, isDefault: false,
    analysis: { id, rootId, label: `Scan ${id}`, score: 66, createdAt, result: {} } as never,
  };
}

const tailoredItem: LibraryItem = {
  kind: "tailored", key: "tailored:t1", id: "t1", title: "Faction", subtitle: "MTS",
  score: 52, createdAt: "2026-07-14T00:00:00Z", isDefault: false, record: {} as never,
};

describe("buildLibraryFeed", () => {
  it("absorbs analysis cards whose lineage root has an edited version", () => {
    const group: ResumeVersionGroup = {
      root: "v1",
      versions: [mkVersion({ sourceRootId: "root-A" })],
    };
    const items = [analyzedItem("a1", "root-A"), analyzedItem("a2", "root-A", "2026-07-11T00:00:00Z"), analyzedItem("b1", "root-B"), tailoredItem];
    const feed = buildLibraryFeed(items, [group]);

    const kinds = feed.map((i) => `${i.kind}:${i.id}`);
    expect(kinds).toContain("version:v1");
    expect(kinds).toContain("analyzed:b1");
    expect(kinds).toContain("tailored:t1");
    expect(kinds).not.toContain("analyzed:a1");
    expect(kinds).not.toContain("analyzed:a2");
    // net cards shrink: 4 legacy + 1 version - 2 absorbed = 3
    expect(feed).toHaveLength(3);
  });

  it("keeps analysis cards untouched when no version exists (cold start)", () => {
    const items = [analyzedItem("a1", "root-A"), tailoredItem];
    const feed = buildLibraryFeed(items, []);
    expect(feed).toHaveLength(2);
    expect(feed.map((i) => i.kind).sort()).toEqual(["analyzed", "tailored"]);
  });

  it("one card per root: default version wins over the head", () => {
    const group: ResumeVersionGroup = {
      root: "r",
      versions: [
        mkVersion({ id: "head", version: 3, isDefault: false, lastScore: 90 }),
        mkVersion({ id: "starred", version: 2, isDefault: true, lastScore: 71 }),
      ],
    };
    expect(displayVersionForGroup(group).id).toBe("starred");
    const feed = buildLibraryFeed([], [group]);
    expect(feed).toHaveLength(1);
    expect(feed[0].kind).toBe("version");
    expect(feed[0].id).toBe("starred");
    expect(feed[0].score).toBe(71);
  });

  it("card copy is concept-free (no v-numbers, no 'version' vocabulary)", () => {
    const feed = buildLibraryFeed([], [
      { root: "r", versions: [mkVersion({ jdCompany: null })] },
      { root: "r2", versions: [mkVersion({ id: "v2", rootId: "v2", origin: "tailor", jdCompany: "Stripe" })] },
    ]);
    for (const item of feed) {
      expect(`${item.title} ${item.subtitle}`.toLowerCase()).not.toMatch(/version|\bv\d/);
    }
    const tailoredCard = feed.find((i) => i.id === "v2");
    expect(tailoredCard?.subtitle).toBe("Tailored — Stripe");
  });

  it("defaults sort first, then most recent", () => {
    const feed = buildLibraryFeed(
      [tailoredItem],
      [{ root: "r", versions: [mkVersion({ isDefault: true, updatedAt: "2026-07-01T00:00:00Z" })] }],
    );
    expect(feed[0].kind).toBe("version");
    expect(feed[0].isDefault).toBe(true);
  });
});
