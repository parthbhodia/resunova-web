import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import {
  APPLICATION_ANSWER_QUESTIONS,
  answeredCount,
  type ApplicationAnswerKey,
} from "@/lib/applicationAnswers";

/**
 * These strings are read back by the Resunova extension, which answers a form
 * question only when the saved value is exactly one it understands. A reworded
 * option here does not fail anywhere visible: the extension just stops filling
 * that question. So the vocabulary is pinned, not merely typed.
 */
const EXTENSION_UNDERSTANDS = new Set([
  "Yes",
  "No",
  "Decline to state",
  "Male",
  "Female",
  "Non-Binary",
  // The seven EEO-1 categories, spelled the way the EEOC publishes them. Written out here on
  // purpose rather than imported: the extension matches these strings, and a test that read them
  // from the code under test could not notice a reworded one. "(Not Hispanic or Latino)" carries
  // meaning (the extension answers a separate Hispanic Yes/No from it), so it is not decoration.
  "Hispanic or Latino",
  "White (Not Hispanic or Latino)",
  "Black or African American (Not Hispanic or Latino)",
  "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
  "Asian (Not Hispanic or Latino)",
  "American Indian or Alaska Native (Not Hispanic or Latino)",
  "Two or More Races (Not Hispanic or Latino)",
]);

describe("the answer vocabulary is the extension's contract", () => {
  it("offers only values the extension can match", () => {
    for (const q of APPLICATION_ANSWER_QUESTIONS) {
      for (const opt of q.options) {
        expect(EXTENSION_UNDERSTANDS.has(opt), `${q.key}: ${opt}`).toBe(true);
      }
    }
  });

  it("offers exactly seven race categories plus Decline, and every category but the first says it is not Hispanic", () => {
    const race = APPLICATION_ANSWER_QUESTIONS.find((q) => q.key === "eeoRace")!;
    expect(race.options).toHaveLength(8);
    expect(race.options[race.options.length - 1]).toBe("Decline to state");
    const categories = race.options.slice(0, -1);
    expect(categories[0]).toBe("Hispanic or Latino");
    for (const c of categories.slice(1)) expect(c).toMatch(/ \(Not Hispanic or Latino\)$/);
  });

  it("covers every EEO field the profile stores, once each", () => {
    const keys = APPLICATION_ANSWER_QUESTIONS.map((q) => q.key).sort();
    const stored = (Object.keys(EMPTY_PROFILE) as string[]).filter((k) => k.startsWith("eeo")).sort();
    expect(keys).toEqual(stored);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never offers Decline on an eligibility question", () => {
    // "Decline to state" on work authorization would save an answer no form can use,
    // and read as an answer when it is a refusal to give one.
    for (const q of APPLICATION_ANSWER_QUESTIONS.filter((x) => x.group === "eligibility")) {
      expect(q.options).not.toContain("Decline to state");
    }
  });

  it("gives every voluntary question a way to decline", () => {
    for (const q of APPLICATION_ANSWER_QUESTIONS.filter((x) => x.group === "voluntary")) {
      expect(q.options).toContain("Decline to state");
    }
  });

  it("separates the two questions most forms require from the optional ones", () => {
    const eligibility = APPLICATION_ANSWER_QUESTIONS.filter((q) => q.group === "eligibility").map((q) => q.key);
    expect(eligibility).toEqual(["eeoWorkUs", "eeoSponsor"] satisfies ApplicationAnswerKey[]);
  });
});

describe("answeredCount", () => {
  it("is zero for a fresh profile", () => {
    expect(answeredCount(EMPTY_PROFILE)).toBe(0);
  });

  it("counts a selectable saved answer", () => {
    expect(answeredCount({ ...EMPTY_PROFILE, eeoWorkUs: "Yes", eeoSponsor: "No" })).toBe(2);
  });

  it("does not count a stored value the control cannot show as selected", () => {
    // An older free-text answer: the card shows nothing selected, so counting it
    // would say "1 of 6 answered" over a row of unselected chips.
    expect(answeredCount({ ...EMPTY_PROFILE, eeoWorkUs: "yes, I think" })).toBe(0);
  });

  it("does not count an option that belongs to a different question", () => {
    expect(answeredCount({ ...EMPTY_PROFILE, eeoWorkUs: "Decline to state" })).toBe(0);
  });
});
