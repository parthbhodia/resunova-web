import { describe, expect, it } from "vitest";
import { gapKeysMatch, isGapAddressed } from "@/lib/tailorGapFix";

describe("gapKeysMatch — short and symbol-bearing keywords", () => {
  // These are ordinary ATS keywords. Before the strict-equality fast path they
  // all normalized to a <=2-char token, got dropped by tokenizeGap's length
  // filter, and failed to match even themselves — so the chip never cleared.
  it.each(["C++", "C#", "Go", "R", "AI", "ML", "QA", "UX", "BI", "CI", "JS"])(
    "%s matches itself",
    (kw) => {
      expect(gapKeysMatch(kw, kw)).toBe(true);
    },
  );

  it("matches across casing and surrounding whitespace", () => {
    expect(gapKeysMatch("  go ", "Go")).toBe(true);
    expect(gapKeysMatch("c++", "C++")).toBe(true);
  });

  it("keeps distinct languages distinct", () => {
    expect(gapKeysMatch("C++", "C#")).toBe(false);
    expect(gapKeysMatch("C++", "C")).toBe(false);
    expect(gapKeysMatch("C#", "C")).toBe(false);
    expect(gapKeysMatch("Go", "Golang")).toBe(false);
  });
});

describe("gapKeysMatch — existing behaviour must not regress", () => {
  it("still refuses the java/javascript substring trap", () => {
    expect(gapKeysMatch("Java", "JavaScript")).toBe(false);
  });

  it("still ignores generic filler words when pairing labels", () => {
    expect(gapKeysMatch("testing framework", "deployment framework")).toBe(false);
  });

  it("still tolerates label drift on multi-word gaps", () => {
    expect(gapKeysMatch("Nuxt", "Nuxt js")).toBe(true);
    expect(gapKeysMatch("Vue.js", "Vue js")).toBe(true);
  });

  it("treats an empty or punctuation-only label as no match", () => {
    expect(gapKeysMatch("", "Go")).toBe(false);
    expect(gapKeysMatch("Go", "")).toBe(false);
    expect(gapKeysMatch("---", "Go")).toBe(false);
  });
});

describe("isGapAddressed", () => {
  it("clears a short keyword once it has been applied", () => {
    expect(isGapAddressed("C++", new Set(["C++"]))).toBe(true);
    expect(isGapAddressed("Go", new Set(["Go"]))).toBe(true);
  });

  it("does not clear an unrelated keyword", () => {
    expect(isGapAddressed("Go", new Set(["C++"]))).toBe(false);
  });

  it("reads addressed actions as well as the label set", () => {
    expect(
      isGapAddressed("C++", new Set<string>(), [
        { id: "qualification:c", label: "C++", type: "qualification" },
      ]),
    ).toBe(true);
  });
});
