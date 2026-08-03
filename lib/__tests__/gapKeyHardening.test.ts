import { describe, expect, it } from "vitest";
import {
  gapKeysMatch,
  makeStableGapId,
  normalizeGapKey,
  normalizeGapKeyStrict,
  tokenizeGap,
} from "@/lib/tailorGapFix";

/**
 * Reported from production, after clicking Fix everything:
 *
 *   TypeError: e.trim is not a function
 *     at o (…)  ← normalizeGapKey / normalizeGapKeyStrict
 *     at a (…)  ← gapKeysMatch
 *     at Array.some
 *
 * These labels come from an LLM. `string` in the type is a hope, and one
 * non-string among ~20 `.some(gapKeysMatch(...))` scans threw out of a render
 * and took the whole Tailor page down. The same shape has now broken this app
 * three times, so the guard belongs at the normalizer, not at each call site.
 */
const NOT_STRINGS: unknown[] = [
  null,
  undefined,
  {},
  { text: "Kubernetes" },
  [],
  ["Kubernetes"],
  true,
  NaN,
  Infinity,
];

describe("gap-key helpers survive non-string labels", () => {
  it("normalizeGapKey does not throw on any of them", () => {
    for (const v of NOT_STRINGS) {
      expect(() => normalizeGapKey(v as string), String(v)).not.toThrow();
      expect(normalizeGapKey(v as string)).toBe("");
    }
  });

  it("normalizeGapKeyStrict does not throw on any of them", () => {
    for (const v of NOT_STRINGS) {
      expect(() => normalizeGapKeyStrict(v as string), String(v)).not.toThrow();
      expect(normalizeGapKeyStrict(v as string)).toBe("");
    }
  });

  it("gapKeysMatch survives a non-string on either side", () => {
    // This is the exact call the stack died in.
    for (const v of NOT_STRINGS) {
      expect(() => gapKeysMatch(v as string, "Kubernetes")).not.toThrow();
      expect(() => gapKeysMatch("Kubernetes", v as string)).not.toThrow();
      expect(gapKeysMatch(v as string, "Kubernetes")).toBe(false);
    }
  });

  it("survives the array scan that actually crashed", () => {
    const missing = [{ text: "Kubernetes" }, { text: { nested: "oops" } }, { text: 2 }];
    expect(() =>
      missing.some((i) => gapKeysMatch(i.text as string, "Kubernetes")),
    ).not.toThrow();
  });

  it("does not make two unmatchable labels match each other", () => {
    // Coercing must not turn junk into a wildcard: two empties are not the
    // same requirement, or every gap would read as already addressed.
    expect(gapKeysMatch(null as unknown as string, undefined as unknown as string)).toBe(false);
    expect(gapKeysMatch({} as unknown as string, [] as unknown as string)).toBe(false);
  });

  it("keeps a numeric label usable rather than discarding it", () => {
    // A requirement really can be "2" (as in "SOC 2"), so digits survive.
    expect(normalizeGapKeyStrict(2 as unknown as string)).toBe("2");
  });

  it("leaves real strings exactly as they were", () => {
    expect(normalizeGapKey("  Node.js  Experience ")).toBe("node js experience");
    expect(normalizeGapKeyStrict("C++")).toBe("c++");
    expect(tokenizeGap("Kubernetes orchestration")).toContain("kubernetes");
    expect(makeStableGapId("Kubernetes", "keyword")).toBe("keyword:kubernetes");
    expect(gapKeysMatch("Kubernetes", "kubernetes")).toBe(true);
  });

  it("still gives an id to a label it cannot read", () => {
    expect(makeStableGapId(null as unknown as string, "keyword")).toBe("keyword:unknown");
  });
});
