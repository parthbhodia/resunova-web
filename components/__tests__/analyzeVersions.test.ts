import { describe, expect, it } from "vitest";
import { defaultVariantHead, groupAnalysesByRoot, groupAnalysesByVariant } from "@/lib/analyzeVersions";
import type { AnalyzeRecord } from "@/lib/supabase";

const rec = (over: Partial<AnalyzeRecord>): AnalyzeRecord => ({
  id: "x",
  label: "Résumé",
  score: 70,
  createdAt: "2026-07-01T00:00:00Z",
  result: null,
  ...over,
});

describe("groupAnalysesByRoot", () => {
  it("keeps independent single-version analyses as separate groups, newest first", () => {
    const a = rec({ id: "a", rootId: "a", version: 1, createdAt: "2026-07-01T00:00:00Z" });
    const b = rec({ id: "b", rootId: "b", version: 1, createdAt: "2026-07-02T00:00:00Z" });
    const groups = groupAnalysesByRoot([a, b]);
    expect(groups).toHaveLength(2);
    expect(groups[0].root).toBe("b"); // most-recent activity first
    expect(groups.every((g) => g.recs.length === 1)).toBe(true);
  });

  it("collapses a v1→v2→v3 lineage into one group, newest version as head", () => {
    const v1 = rec({ id: "a", rootId: "a", version: 1, createdAt: "2026-07-01T00:00:00Z" });
    const v2 = rec({ id: "a2", rootId: "a", parentId: "a", version: 2, createdAt: "2026-07-01T01:00:00Z" });
    const v3 = rec({ id: "a3", rootId: "a", parentId: "a2", version: 3, createdAt: "2026-07-01T02:00:00Z" });
    // Input order is arbitrary — grouping must not depend on it.
    const groups = groupAnalysesByRoot([v2, v1, v3]);
    expect(groups).toHaveLength(1);
    expect(groups[0].recs.map((r) => r.version)).toEqual([3, 2, 1]);
    expect(groups[0].recs[0].id).toBe("a3"); // head = current
  });

  it("orders groups by each lineage's most-recent version, not its root", () => {
    const standalone = rec({ id: "s", rootId: "s", version: 1, createdAt: "2026-07-05T00:00:00Z" });
    const v1 = rec({ id: "r", rootId: "r", version: 1, createdAt: "2026-07-01T00:00:00Z" });
    const v2 = rec({ id: "r2", rootId: "r", version: 2, createdAt: "2026-07-06T00:00:00Z" }); // newest overall
    const groups = groupAnalysesByRoot([standalone, v1, v2]);
    expect(groups[0].root).toBe("r"); // r's v2 (Jul 6) beats standalone (Jul 5)
    expect(groups[1].root).toBe("s");
  });

  it("treats legacy rows without lineage fields as their own v1 root", () => {
    const legacy = rec({ id: "L1", createdAt: "2026-07-01T00:00:00Z" });
    const groups = groupAnalysesByRoot([legacy]);
    expect(groups).toHaveLength(1);
    expect(groups[0].root).toBe("L1"); // rootId ?? id
    expect(groups[0].recs).toHaveLength(1);
  });
});

describe("groupAnalysesByVariant", () => {
  it("coalesces every row with no variant fields into one implicit 'Default' group", () => {
    const a = rec({ id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z" });
    const b = rec({ id: "b", rootId: "b", createdAt: "2026-07-02T00:00:00Z" }); // separate lineage
    const groups = groupAnalysesByVariant([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Default");
    expect(groups[0].roots).toHaveLength(2); // two lineages, one variant
  });

  it("splits rows into separate variants by (variantGroup, variantName)", () => {
    const def = rec({
      id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z",
      variantGroup: "g1", variantName: "Default",
    });
    const other = rec({
      id: "b", rootId: "b", createdAt: "2026-07-03T00:00:00Z",
      variantGroup: "g1", variantName: "Judi Health",
    });
    const groups = groupAnalysesByVariant([def, other]);
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe("Judi Health"); // most-recently-active first
    expect(groups[1].name).toBe("Default");
  });

  it("keeps a variant's rescore lineage together within groupAnalysesByRoot", () => {
    const v1 = rec({
      id: "a", rootId: "a", version: 1, createdAt: "2026-07-01T00:00:00Z",
      variantGroup: "g1", variantName: "Judi Health",
    });
    const v2 = rec({
      id: "a2", rootId: "a", parentId: "a", version: 2, createdAt: "2026-07-02T00:00:00Z",
      variantGroup: "g1", variantName: "Judi Health",
    });
    const groups = groupAnalysesByVariant([v1, v2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].roots).toHaveLength(1);
    expect(groups[0].roots[0].recs.map((r) => r.id)).toEqual(["a2", "a"]);
  });

  it("a different variantGroup with the same variantName is a distinct variant", () => {
    const a = rec({ id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z", variantGroup: "g1", variantName: "Default" });
    const b = rec({ id: "b", rootId: "b", createdAt: "2026-07-02T00:00:00Z", variantGroup: "g2", variantName: "Default" });
    const groups = groupAnalysesByVariant([a, b]);
    expect(groups).toHaveLength(2);
  });
});

describe("defaultVariantHead", () => {
  it("with no variants used, returns the most recent row (today's exact behavior)", () => {
    const a = rec({ id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z" });
    const b = rec({ id: "b", rootId: "b", createdAt: "2026-07-03T00:00:00Z" });
    expect(defaultVariantHead([a, b])?.id).toBe("b");
  });

  it("returns the head of the NAMED default variant, not just the newest row overall", () => {
    const def = rec({
      id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z",
      variantGroup: "g1", variantName: "Default",
    });
    const other = rec({
      id: "b", rootId: "b", createdAt: "2026-07-05T00:00:00Z", // newer overall
      variantGroup: "g1", variantName: "Judi Health",
    });
    expect(defaultVariantHead([def, other], "Default")?.id).toBe("a");
    expect(defaultVariantHead([def, other], "Judi Health")?.id).toBe("b");
  });

  it("falls back to the most-recently-active variant when the named default no longer exists", () => {
    const stale = rec({ id: "a", rootId: "a", createdAt: "2026-07-01T00:00:00Z", variantGroup: "g1", variantName: "Deleted" });
    expect(defaultVariantHead([stale], "Some Deleted Variant")?.id).toBe("a");
  });

  it("returns null for an empty history", () => {
    expect(defaultVariantHead([])).toBeNull();
  });
});
