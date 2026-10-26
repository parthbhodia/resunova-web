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
const EXTENSION_UNDERSTANDS = new Set(["Yes", "No", "Decline to state", "Male", "Female", "Non-Binary"]);

describe("the answer vocabulary is the extension's contract", () => {
  it("offers only values the extension can match", () => {
    for (const q of APPLICATION_ANSWER_QUESTIONS) {
      for (const opt of q.options) {
        expect(EXTENSION_UNDERSTANDS.has(opt), `${q.key}: ${opt}`).toBe(true);
      }
    }
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
