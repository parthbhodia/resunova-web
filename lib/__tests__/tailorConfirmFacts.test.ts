import { describe, expect, it } from "vitest";
import {
  claimSentence,
  draftFactFromSuggestion,
  factDiffersFromDraft,
  FACT_FIELD_MAX,
  normalizeConfirmedFacts,
} from "@/lib/tailorConfirmFacts";

describe("draftFactFromSuggestion", () => {
  it("reads the claim out of the resume rather than writing one", () => {
    // The whole promise of the confirm step is that the sentence is the user's
    // own words. `what` must be the bullet verbatim.
    const bullet = "Led weekly design reviews and documented the approach we picked";
    const f = draftFactFromSuggestion({ original: bullet, employer: "Ecclon LLC" });
    expect(f).toEqual({ where: "Ecclon LLC", what: bullet, outcome: "" });
  });

  it("returns null when there is no bullet to quote", () => {
    // A confirm step with nothing to confirm is a dialog that wastes a click.
    expect(draftFactFromSuggestion({ original: "   ", employer: "Acme" })).toBeNull();
    expect(draftFactFromSuggestion(null)).toBeNull();
    expect(draftFactFromSuggestion(undefined)).toBeNull();
  });

  it("survives a non-string original instead of throwing", () => {
    // These payloads come from an LLM; a shape assumption here took the whole
    // /tailor-2 page down once already.
    expect(draftFactFromSuggestion({ original: 42 as unknown as string })).toBeNull();
    expect(draftFactFromSuggestion({ original: {} as unknown as string })).toBeNull();
  });

  it("never reads `where` out of the section label", () => {
    // Regression, caught in a browser: `section` is a section name that the API
    // also falls back to filling with whatever it has, which produced "At Adds
    // CI/CD to this bullet, you designed…" — a place the user never worked,
    // inside a box promising nothing was invented. An absent employer must
    // leave `where` empty instead.
    const f = draftFactFromSuggestion(
      { original: "Designed the workflow", section: "Adds CI/CD to this bullet" } as never,
    );
    expect(f?.where).toBe("");
    expect(claimSentence(f!)).toBe("You designed the workflow.");
  });

  it("caps each field at the length the API accepts", () => {
    const f = draftFactFromSuggestion({ original: "x".repeat(FACT_FIELD_MAX + 250) });
    expect(f?.what).toHaveLength(FACT_FIELD_MAX);
  });
});

describe("claimSentence", () => {
  it("frames the bullet without rewriting it", () => {
    const s = claimSentence({ where: "Ecclon LLC", what: "Led weekly design reviews", outcome: "" });
    expect(s).toBe("At Ecclon LLC, you led weekly design reviews.");
    expect(s).toContain("weekly design reviews");
  });

  it("drops the location clause when the section is unknown", () => {
    expect(claimSentence({ where: "", what: "Shipped the migration", outcome: "" }))
      .toBe("You shipped the migration.");
  });

  it("keeps acronyms and proper nouns capitalised", () => {
    // Lowercasing the first word is for sentence flow, not for mangling "CI/CD".
    expect(claimSentence({ where: "", what: "CI/CD pipelines ran nightly", outcome: "" }))
      .toBe("You CI/CD pipelines ran nightly.");
  });

  it("does not add a second full stop to a bullet that has one", () => {
    expect(claimSentence({ where: "Acme", what: "Ran the release.", outcome: "" }))
      .toBe("At Acme, you ran the release.");
  });

  it("joins the outcome instead of leaving it unsaid", () => {
    expect(claimSentence({ where: "Acme", what: "Ran the release", outcome: "cut deploy time in half" }))
      .toBe("At Acme, you ran the release, and cut deploy time in half.");
  });

  it("returns nothing when there is no claim", () => {
    expect(claimSentence({ where: "Acme", what: "   ", outcome: "x" })).toBe("");
  });
});

describe("normalizeConfirmedFacts", () => {
  it("drops a fact with no claim in it", () => {
    // An empty string is not evidence. Sending one would let it count as
    // provenance for a number nobody vouched for.
    expect(normalizeConfirmedFacts([{ where: "Acme", what: "  ", outcome: "40%" }])).toEqual([]);
  });

  it("keeps a fact that has a claim, even with the rest blank", () => {
    expect(normalizeConfirmedFacts([{ where: "", what: "Ran the release", outcome: "" }]))
      .toEqual([{ where: "", what: "Ran the release", outcome: "" }]);
  });

  it("collapses whitespace so the same fact is not two different strings", () => {
    expect(normalizeConfirmedFacts([{ where: " Acme  Inc ", what: "Ran\n  the release", outcome: "" }]))
      .toEqual([{ where: "Acme Inc", what: "Ran the release", outcome: "" }]);
  });

  it("caps every field, not just the claim", () => {
    const long = "y".repeat(FACT_FIELD_MAX + 100);
    const [f] = normalizeConfirmedFacts([{ where: long, what: long, outcome: long }]);
    expect([f.where.length, f.what.length, f.outcome.length])
      .toEqual([FACT_FIELD_MAX, FACT_FIELD_MAX, FACT_FIELD_MAX]);
  });

  it("returns an empty list for nothing, so callers can omit the key", () => {
    expect(normalizeConfirmedFacts(null)).toEqual([]);
    expect(normalizeConfirmedFacts([])).toEqual([]);
  });
});

describe("factDiffersFromDraft", () => {
  it("is false when the user just agreed", () => {
    // Agreeing with a sentence read out of the résumé tells the model nothing
    // it did not already have, so it must not cost a second call.
    const d = { where: "Acme", what: "Ran the release", outcome: "" };
    expect(factDiffersFromDraft(d, { ...d })).toBe(false);
  });

  it("ignores whitespace-only edits", () => {
    const d = { where: "Acme", what: "Ran the release", outcome: "" };
    expect(factDiffersFromDraft(d, { ...d, what: "  Ran the release  " })).toBe(false);
  });

  it("is true for a real correction in any field", () => {
    const d = { where: "Acme", what: "Ran the release", outcome: "" };
    expect(factDiffersFromDraft(d, { ...d, where: "Globex" })).toBe(true);
    expect(factDiffersFromDraft(d, { ...d, what: "Ran two releases" })).toBe(true);
    expect(factDiffersFromDraft(d, { ...d, outcome: "cut deploy time 40%" })).toBe(true);
  });
});
