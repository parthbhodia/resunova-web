import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE,
  mergeProfilePreferEmpty,
  tailorContactHintsFromExtracted,
} from "@/lib/profileStorage";

describe("tailorContactHintsFromExtracted — Phase 2 résumé → Tailor-defaults seed", () => {
  it("maps the unambiguous contact fields", () => {
    const hints = tailorContactHintsFromExtracted({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+1 555 0100",
      linkedin: "linkedin.com/in/janedoe",
      portfolio: "janedoe.dev",
      headline: "Full-stack engineer",
    });
    expect(hints).toEqual({
      displayName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1 555 0100",
      linkedin: "linkedin.com/in/janedoe",
      portfolio: "janedoe.dev",
      headline: "Full-stack engineer",
    });
  });

  it("falls back to github when portfolio is empty", () => {
    const hints = tailorContactHintsFromExtracted({ github: "github.com/janedoe" });
    expect(hints.portfolio).toBe("github.com/janedoe");
  });

  it("does NOT map current role/location onto target roles/locations", () => {
    const hints = tailorContactHintsFromExtracted({ name: "Jane" }) as Record<string, unknown>;
    expect(hints.roles).toBeUndefined();
    expect(hints.locations).toBeUndefined();
  });

  it("prefer-empty: fills only empty Tailor-defaults fields, never overwrites", () => {
    const existing = { ...EMPTY_PROFILE, email: "keep@me.com", displayName: "" };
    const { next, filled } = mergeProfilePreferEmpty(
      existing,
      tailorContactHintsFromExtracted({ name: "Jane Doe", email: "resume@parsed.com" }),
    );
    // displayName was empty -> filled from résumé; email was set -> preserved.
    expect(next.displayName).toBe("Jane Doe");
    expect(next.email).toBe("keep@me.com");
    expect(filled).toContain("displayName");
    expect(filled).not.toContain("email");
  });

  it("blank hint values are ignored (no empty-string writes)", () => {
    const existing = { ...EMPTY_PROFILE, phone: "555" };
    const { next, filled } = mergeProfilePreferEmpty(
      existing,
      tailorContactHintsFromExtracted({ phone: "", email: "" }),
    );
    expect(next.phone).toBe("555");
    expect(filled).toHaveLength(0);
  });
});
