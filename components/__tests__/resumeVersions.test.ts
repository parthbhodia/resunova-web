import { describe, expect, it } from "vitest";
import { groupVersionsByRoot, nextOrdinal, type ResumeVersion } from "@/lib/resumeVersions";

const v = (over: Partial<ResumeVersion>): ResumeVersion => ({
  id: "x",
  name: "Résumé",
  rootId: "x",
  parentId: null,
  version: 1,
  structured: null,
  extractedText: null,
  origin: "upload",
  sourcePdfUrl: null,
  jdText: null,
  jdCompany: null,
  jdTitle: null,
  lastScore: null,
  lastScoreSource: null,
  isDefault: false,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  ...over,
});

describe("nextOrdinal", () => {
  it("returns 1 for an empty root", () => {
    expect(nextOrdinal([])).toBe(1);
  });
  it("returns max + 1, not count + 1 (survives a restore from an older version)", () => {
    expect(nextOrdinal([1, 2, 3])).toBe(4);
    expect(nextOrdinal([1, 3])).toBe(4); // a v2 was deleted; next is still 4
    expect(nextOrdinal([3, 1, 2])).toBe(4); // order-independent
  });
});

describe("groupVersionsByRoot", () => {
  it("keeps independent single-version résumés as separate groups, newest-updated first", () => {
    const a = v({ id: "a", rootId: "a", updatedAt: "2026-07-01T00:00:00Z" });
    const b = v({ id: "b", rootId: "b", updatedAt: "2026-07-02T00:00:00Z" });
    const groups = groupVersionsByRoot([a, b]);
    expect(groups).toHaveLength(2);
    expect(groups[0].root).toBe("b"); // most-recently-updated group first
    expect(groups.every((g) => g.versions.length === 1)).toBe(true);
  });

  it("collapses a v1→v2→v3 lineage into one group, newest version as head", () => {
    const v1 = v({ id: "a", rootId: "a", version: 1, createdAt: "2026-07-01T00:00:00Z" });
    const v2 = v({ id: "a2", rootId: "a", parentId: "a", version: 2, createdAt: "2026-07-01T01:00:00Z" });
    const v3 = v({ id: "a3", rootId: "a", parentId: "a2", version: 3, createdAt: "2026-07-01T02:00:00Z", updatedAt: "2026-07-01T02:00:00Z" });
    const groups = groupVersionsByRoot([v2, v1, v3]); // arbitrary input order
    expect(groups).toHaveLength(1);
    expect(groups[0].versions.map((r) => r.version)).toEqual([3, 2, 1]);
    expect(groups[0].versions[0].id).toBe("a3"); // head = current
  });

  it("orders groups by each lineage's most-recent update, not its root id", () => {
    const standalone = v({ id: "s", rootId: "s", version: 1, updatedAt: "2026-07-05T00:00:00Z" });
    const r1 = v({ id: "r", rootId: "r", version: 1, updatedAt: "2026-07-01T00:00:00Z" });
    const r2 = v({ id: "r2", rootId: "r", version: 2, updatedAt: "2026-07-06T00:00:00Z" }); // newest overall
    const groups = groupVersionsByRoot([standalone, r1, r2]);
    expect(groups[0].root).toBe("r"); // r's v2 (Jul 6) beats standalone (Jul 5)
    expect(groups[1].root).toBe("s");
  });

  it("falls back to id when rootId is empty (defensive)", () => {
    const orphan = v({ id: "O1", rootId: "" });
    const groups = groupVersionsByRoot([orphan]);
    expect(groups).toHaveLength(1);
    expect(groups[0].root).toBe("O1");
  });
});
