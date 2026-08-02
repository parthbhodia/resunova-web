import { describe, expect, it } from "vitest";
import { isDetailedRatings } from "@/lib/types";
import { deriveWorkQueue } from "@/lib/tailorWorkQueue";
import { collectUnaddressedGaps } from "@/lib/fixEverything";
import type { RatingsData } from "@/lib/types";

/**
 * Field report: /tailor-2 rendered Next's black "This page couldn't load"
 * screen after clicking Analyze. That screen is the root error boundary, so
 * something threw while rendering the results workspace.
 *
 * `isDetailedRatings` is a type predicate that promises callers a
 * `DetailedCategory` — whose `missing` and `covered` are typed as arrays — but
 * it only ever checked that the four category OBJECTS were truthy. So a
 * payload shaped like `{ score: 40, covered: [] }`, with `missing` absent,
 * passed the guard and every consumer then dereferenced it:
 *
 *   lib/tailorWorkQueue.ts:90    for (const it of ratings.qualifications.missing)
 *   lib/fixEverything.ts:56      ratings.qualifications.missing.filter(...)
 *   TailorDimensionChips.tsx:97  [...c.covered, ...]     <- throws, not iterable
 *
 * A type predicate that does not check what it claims is worse than no
 * predicate: TypeScript stops asking, so none of those sites look unsafe.
 *
 * A malformed payload should degrade to the simple view, never take the page
 * down. These tests pin that.
 */

const CATEGORY = {
  score: 40,
  covered: [{ text: "Python" }],
  missing: [{ text: "Kubernetes", analysis: "no container work" }],
};

function ratings(over: Record<string, unknown> = {}): RatingsData {
  return {
    match_score: 52,
    criteria: [],
    whats_working: [],
    gaps: [],
    verdict: "",
    overall_score: 52,
    job_title: { matched: false, jd_title: "SWE", resume_title: "Dev", score: 35, detail: "" },
    qualifications: { ...CATEGORY },
    responsibilities: { ...CATEGORY },
    keywords: {
      found_count: 7,
      total_count: 13,
      direct_skills: { found: ["Python"], missing: ["Go"] },
      contextual: { found: [], missing: [] },
    },
    ...over,
  } as RatingsData;
}

const NONE = new Set<string>();

describe("isDetailedRatings actually checks what it promises", () => {
  it("accepts a well-formed payload", () => {
    expect(isDetailedRatings(ratings())).toBe(true);
  });

  it("rejects a category whose missing array is absent", () => {
    const r = ratings({ qualifications: { score: 40, covered: [] } });
    expect(isDetailedRatings(r)).toBe(false);
  });

  it("rejects a category whose covered array is absent", () => {
    const r = ratings({ responsibilities: { score: 40, missing: [] } });
    expect(isDetailedRatings(r)).toBe(false);
  });

  it("rejects null in place of an array", () => {
    const r = ratings({ qualifications: { score: 40, covered: null, missing: null } });
    expect(isDetailedRatings(r)).toBe(false);
  });

  it("still rejects a payload missing a whole category", () => {
    expect(isDetailedRatings(ratings({ keywords: undefined }))).toBe(false);
  });
});

describe("consumers degrade instead of throwing", () => {
  // Each of these threw "undefined is not iterable" before the guard was
  // honest, which is what put Next's error screen on the page.
  const malformed = ratings({ qualifications: { score: 40, covered: [] } });

  it("deriveWorkQueue returns an empty queue rather than throwing", () => {
    expect(() => deriveWorkQueue(malformed, NONE)).not.toThrow();
    expect(deriveWorkQueue(malformed, NONE)).toEqual([]);
  });

  it("collectUnaddressedGaps returns nothing rather than throwing", () => {
    expect(() => collectUnaddressedGaps(malformed, NONE)).not.toThrow();
    expect(collectUnaddressedGaps(malformed, NONE)).toEqual([]);
  });

  it("a well-formed payload still produces real work", () => {
    // The paired control: if the guard were simply always false, the tests
    // above would pass while the feature was dead.
    expect(deriveWorkQueue(ratings(), NONE).length).toBeGreaterThan(0);
    expect(collectUnaddressedGaps(ratings(), NONE).length).toBeGreaterThan(0);
  });
});
