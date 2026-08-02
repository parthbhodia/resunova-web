import { describe, expect, it } from "vitest";
import { isDetailedRatings } from "@/lib/types";
import { deriveWorkQueue, requirementText } from "@/lib/tailorWorkQueue";
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

/**
 * The actual production error, from the console on /tailor-2 after Analyze:
 *
 *   Uncaught TypeError: e.trim is not a function
 *     at b -> s -> v -> Object.useMemo
 *
 * Three nested frames inside a useMemo is exactly
 * norm() <- queueItemId() <- deriveWorkQueue(), which TailorQueuePanel wraps
 * in useMemo. `e.trim is not a function` (rather than "cannot read properties
 * of undefined") means the value is present but is not a string.
 *
 * The cause is the same class as the guard above: RatingsData declares
 * `text: string`, but the payload is LLM-generated JSON that nothing
 * validates at runtime. Types are erased; the model can and does emit other
 * shapes. A résumé report must never be able to crash the page because one
 * requirement came back as a number or an object.
 */
describe("queue items survive whatever shape the model emits", () => {
  const withMissing = (missing: unknown[]): RatingsData =>
    ratings({ qualifications: { score: 40, covered: [], missing } });

  it("does not throw when text is a number", () => {
    expect(() => deriveWorkQueue(withMissing([{ text: 5 }]), NONE)).not.toThrow();
  });

  it("does not throw when text is an object", () => {
    const r = withMissing([{ text: { requirement: "Master's degree" } }]);
    expect(() => deriveWorkQueue(r, NONE)).not.toThrow();
  });

  it("does not throw when the item is a bare string", () => {
    expect(() => deriveWorkQueue(withMissing(["Master's degree"]), NONE)).not.toThrow();
  });

  it("keeps a bare string as a real queue item rather than dropping it", () => {
    // Degrading must not mean silently losing a requirement the user needs.
    const q = deriveWorkQueue(withMissing(["Master's degree or PhD"]), NONE);
    expect(q.map((i) => i.name)).toContain("Master's degree or PhD");
  });

  it("drops an unusable item instead of rendering junk", () => {
    // Scoped to qualifications: the base fixture also contributes
    // responsibility and keyword rows, which are not what this asserts.
    const q = deriveWorkQueue(withMissing([{ text: { a: 1 } }, { text: "Ruby on Rails" }]), NONE);
    expect(q.filter((i) => i.kind === "qualification").map((i) => i.name))
      .toEqual(["Ruby on Rails"]);
  });

  it("does not throw when text is null", () => {
    expect(() => deriveWorkQueue(withMissing([{ text: null }]), NONE)).not.toThrow();
  });
});

/**
 * Field report after the crash was fixed: the keyword drawer read
 * "✕ [object Object]", and the queue showed "2 to review" while the chips
 * said Qualifications 6/6, Responsibilities 5/7, Keywords 22/23 — three gaps,
 * not two.
 *
 * Same object-shaped keyword behind both. `.join(", ")` stringified it for
 * display, and requirementText returned "" so deriveWorkQueue skipped it.
 *
 * Trading a crash for a silently dropped requirement is not a fix. The user
 * noticed the count was wrong, which is the good outcome only because they
 * were paying attention. So the extractor now tries the aliases the rater
 * actually emits, then falls back to a lone string value, before giving up.
 */
describe("an object-shaped requirement is read, not dropped", () => {
  it.each([
    ["keyword", { keyword: "Kubernetes" }],
    ["name", { name: "Kubernetes" }],
    ["label", { label: "Kubernetes" }],
    ["skill", { skill: "Kubernetes" }],
    ["term", { term: "Kubernetes" }],
    ["requirement", { requirement: "Kubernetes" }],
    ["a lone unrecognized string field", { thing: "Kubernetes" }],
  ])("reads the label from %s", (_label, shape) => {
    expect(requirementText(shape)).toBe("Kubernetes");
  });

  it("prefers the documented text key over an alias", () => {
    expect(requirementText({ text: "right", name: "wrong" })).toBe("right");
  });

  it("gives up rather than guessing between several strings", () => {
    expect(requirementText({ a: "one", b: "two" })).toBe("");
  });

  it("puts an object-shaped missing keyword into the queue", () => {
    // The exact production symptom: the third gap must appear.
    const r = ratings({
      keywords: {
        found_count: 22,
        total_count: 23,
        direct_skills: { found: [], missing: [{ keyword: "Kubernetes" }] },
        contextual: { found: [], missing: [] },
      },
    });
    const names = deriveWorkQueue(r, NONE).filter((i) => i.kind === "keyword").map((i) => i.name);
    expect(names).toEqual(["Kubernetes"]);
  });
});
