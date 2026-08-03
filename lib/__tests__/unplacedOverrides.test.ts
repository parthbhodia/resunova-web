import { describe, expect, it } from "vitest";
import { applyBulletOverrides, synthesizeProfileWithBulletOverrides } from "@/lib/resumeBulletMatch";

/**
 * An accepted fix that matches no line must be REPORTED, not appended.
 *
 * The old branch pushed it onto the end of the résumé. That is how a bullet
 * grew three copies of its own tail and the document ran past page one, and it
 * could fire from any apply path — a bullet the user had since edited, a
 * restored session, a model that reworded `original` slightly.
 */

const bullets = [
  { originalBullet: "Led weekly design reviews with product and engineering." },
  { originalBullet: "Built a full-stack trading platform with a Python backend." },
] as never;

const profile = [
  "EXPERIENCE",
  "- Led weekly design reviews with product and engineering.",
  "- Built a full-stack trading platform with a Python backend.",
].join("\n");

describe("an override that fits", () => {
  it("replaces the line in place", () => {
    const { text, unplaced } = applyBulletOverrides(profile, bullets, {
      0: "Led weekly design reviews, evaluating API trade-offs.",
    });
    expect(text).toContain("evaluating API trade-offs");
    expect(text.split("\n")).toHaveLength(3);
    expect(unplaced).toEqual([]);
  });
});

describe("an override that fits nowhere", () => {
  const gone = ["EXPERIENCE", "- A bullet the user has since rewritten entirely."].join("\n");

  it("does not grow the résumé", () => {
    const { text } = applyBulletOverrides(gone, bullets, { 0: "Some accepted rewrite." });
    expect(text).toBe(gone);
    expect(text).not.toContain("Some accepted rewrite");
  });

  it("hands the change back instead of losing it", () => {
    // Dropping it silently is the other half of the bug: the user accepted it.
    const { unplaced } = applyBulletOverrides(gone, bullets, { 0: "Some accepted rewrite." });
    expect(unplaced).toHaveLength(1);
    expect(unplaced[0].text).toBe("Some accepted rewrite.");
    expect(unplaced[0].index).toBe(0);
  });

  it("says which bullet it was written against", () => {
    const { unplaced } = applyBulletOverrides(gone, bullets, { 0: "x" });
    expect(unplaced[0].original).toContain("Led weekly design reviews");
  });

  it("still places the ones that do fit", () => {
    const partial = ["EXPERIENCE", "- Built a full-stack trading platform with a Python backend."].join("\n");
    const { text, unplaced } = applyBulletOverrides(partial, bullets, {
      0: "Unplaceable rewrite.",
      1: "Built a trading platform with live market data.",
    });
    expect(text).toContain("live market data");
    expect(text).not.toContain("Unplaceable rewrite");
    expect(unplaced.map((u) => u.index)).toEqual([0]);
  });
});

describe("the text-only wrapper", () => {
  it("keeps its old signature for existing call sites", () => {
    const out = synthesizeProfileWithBulletOverrides(profile, bullets, {
      0: "Led weekly design reviews, evaluating API trade-offs.",
    });
    expect(typeof out).toBe("string");
    expect(out).toContain("evaluating API trade-offs");
  });

  it("returns the text untouched when there is nothing to apply", () => {
    expect(synthesizeProfileWithBulletOverrides(profile, bullets, {})).toBe(profile);
  });
});
