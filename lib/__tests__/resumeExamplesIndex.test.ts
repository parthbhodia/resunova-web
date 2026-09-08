import { describe, expect, it } from "vitest";
import {
  RESUME_EXAMPLE_INDEX,
  exampleCategories,
  exampleSlug,
  searchExamples,
} from "@/lib/resumeExamplesIndex";
import { PUBLIC_RESUME_EXAMPLES } from "@/lib/resumeExamplesCatalog";

describe("the generated index agrees with the catalog, in both directions", () => {
  it("has exactly one row per example", () => {
    expect(RESUME_EXAMPLE_INDEX).toHaveLength(PUBLIC_RESUME_EXAMPLES.length);
  });

  it("carries a row for every example the catalog ships", () => {
    const ids = new Set(RESUME_EXAMPLE_INDEX.map((r) => r.id));
    for (const example of PUBLIC_RESUME_EXAMPLES) {
      expect(ids.has(exampleSlug(example.title))).toBe(true);
    }
  });

  it("has no row pointing at an example that was deleted", () => {
    const catalogIds = new Set(PUBLIC_RESUME_EXAMPLES.map((e) => exampleSlug(e.title)));
    for (const row of RESUME_EXAMPLE_INDEX) expect(catalogIds.has(row.id)).toBe(true);
  });

  it("copies each example's own title, category, level and score", () => {
    for (const example of PUBLIC_RESUME_EXAMPLES) {
      const row = RESUME_EXAMPLE_INDEX.find((r) => r.id === exampleSlug(example.title));
      expect(row).toBeDefined();
      expect(row!.title).toBe(example.title);
      expect(row!.category).toBe(example.category);
      expect(row!.level).toBe(example.level);
      expect(row!.score).toBe(example.score);
    }
  });

  it("lists every category the catalog has", () => {
    expect(new Set(exampleCategories())).toEqual(
      new Set(PUBLIC_RESUME_EXAMPLES.map((e) => e.category)),
    );
  });

  it("carries no résumé bodies — the index exists to stay small", () => {
    for (const row of RESUME_EXAMPLE_INDEX) {
      expect(row).not.toHaveProperty("data");
      expect(row).not.toHaveProperty("workExperiences");
    }
  });
});

describe("searchExamples", () => {
  it("finds a role by a word in its title", () => {
    const hits = searchExamples("nurse");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((r) => `${r.title} ${r.category} ${r.desc}`.toLowerCase().includes("nurse"))).toBe(true);
  });

  it("matches on a skill, not only the title", () => {
    const hits = searchExamples("sql");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((r) => !r.title.toLowerCase().includes("sql"))).toBe(true);
  });

  it("narrows on every token rather than widening", () => {
    const one = searchExamples("nurse");
    const two = searchExamples("nurse critical");
    expect(two.length).toBeLessThan(one.length);
    expect(two.every((r) => one.some((o) => o.id === r.id))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(searchExamples("NURSE").map((r) => r.id)).toEqual(searchExamples("nurse").map((r) => r.id));
  });

  it("filters by category", () => {
    const hits = searchExamples("", "Healthcare");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((r) => r.category === "Healthcare")).toBe(true);
  });

  it("intersects the query with the category", () => {
    expect(searchExamples("nurse", "Finance")).toEqual([]);
  });

  it("returns everything for an empty query and no category", () => {
    expect(searchExamples("")).toHaveLength(RESUME_EXAMPLE_INDEX.length);
  });
});
