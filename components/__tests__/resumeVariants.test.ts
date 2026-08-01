import { describe, expect, it } from "vitest";
import { displayNameForVariant } from "@/lib/resumeVariants";

describe("displayNameForVariant", () => {
  it("returns the raw name when there's no override", () => {
    expect(displayNameForVariant("Default", {})).toBe("Default");
  });

  it("applies an override keyed by the original stored name", () => {
    expect(displayNameForVariant("Default", { Default: "My Main Résumé" })).toBe("My Main Résumé");
  });

  it("does not affect unrelated variant names", () => {
    const overrides = { "Judi Health": "Healthcare Résumé" };
    expect(displayNameForVariant("Default", overrides)).toBe("Default");
    expect(displayNameForVariant("Judi Health", overrides)).toBe("Healthcare Résumé");
  });
});
