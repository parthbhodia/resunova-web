import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE } from "@/lib/profileStorage";
import {
  APPLICATION_ANSWER_QUESTIONS,
  YEARS_EXPERIENCE_MAX,
  answeredCount,
  isTypableYearsExperience,
  isUsableYearsExperience,
  yearsExperienceProblem,
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
  // The EEO-1 categories, spelled the way the EEOC publishes them, plus Asian by subregion and the
  // 2024 Middle Eastern or North African category. Written out here on purpose rather than
  // imported: the extension matches these strings, and a test that read them from the code under
  // test could not notice a reworded one. "(Not Hispanic or Latino)" carries meaning (the
  // extension answers a separate Hispanic Yes/No from it), so it is not decoration.
  "Hispanic or Latino",
  "White (Not Hispanic or Latino)",
  "Black or African American (Not Hispanic or Latino)",
  "Native Hawaiian or Other Pacific Islander (Not Hispanic or Latino)",
  "Asian (Not Hispanic or Latino)",
  "Asian: East Asian (Not Hispanic or Latino)",
  "Asian: South Asian (Not Hispanic or Latino)",
  "Asian: Southeast Asian (Not Hispanic or Latino)",
  "American Indian or Alaska Native (Not Hispanic or Latino)",
  "Middle Eastern or North African (Not Hispanic or Latino)",
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

  it("offers the race categories plus Decline, and every category but the first says it is not Hispanic", () => {
    const race = APPLICATION_ANSWER_QUESTIONS.find((q) => q.key === "eeoRace")!;
    expect(race.options).toHaveLength(12);
    expect(race.options[race.options.length - 1]).toBe("Decline to state");
    const categories = race.options.slice(0, -1);
    expect(categories[0]).toBe("Hispanic or Latino");
    for (const c of categories.slice(1)) expect(c).toMatch(/ \(Not Hispanic or Latino\)$/);
  });

  it("splits Asian into the three subregions forms use, beside the plain category", () => {
    // DoorDash's form offers "Asian: East Asian" and "Asian: South Asian", so a saved plain
    // "Asian" cannot tell the extension which one is true. The subregion can.
    const race = APPLICATION_ANSWER_QUESTIONS.find((q) => q.key === "eeoRace")!;
    const asian = race.options.filter((o) => o.startsWith("Asian"));
    expect(asian).toEqual([
      "Asian (Not Hispanic or Latino)",
      "Asian: East Asian (Not Hispanic or Latino)",
      "Asian: South Asian (Not Hispanic or Latino)",
      "Asian: Southeast Asian (Not Hispanic or Latino)",
    ]);
    expect(race.options).toContain("Middle Eastern or North African (Not Hispanic or Latino)");
  });

  it("covers every EEO field the profile stores, plus the text-message consent, once each", () => {
    const keys = APPLICATION_ANSWER_QUESTIONS.map((q) => q.key).sort();
    const stored = (Object.keys(EMPTY_PROFILE) as string[]).filter((k) => k.startsWith("eeo") || k === "smsOptIn").sort();
    expect(keys).toEqual(stored);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("asks the text-message consent as plain Yes or No, in its own group, with no Decline", () => {
    // A consent is never pre-selected and has no "Decline": leaving it blank is the way to not
    // answer, and the extension never fills a blank one.
    const sms = APPLICATION_ANSWER_QUESTIONS.find((q) => q.key === "smsOptIn")!;
    expect(sms.options).toEqual(["Yes", "No"]);
    expect(sms.group).toBe("communication");
    expect(sms.label).toBe("Is it OK to text you (SMS or WhatsApp) about your application?");
    expect(EMPTY_PROFILE.smsOptIn).toBe("");
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

describe("years of professional experience", () => {
  it("is blank until the person types it, and the maximum is sixty", () => {
    expect(EMPTY_PROFILE.yearsExperience).toBe("");
    expect(YEARS_EXPERIENCE_MAX).toBe(60);
  });

  it.each(["0", "6", "5.5", "12", "60", "0.5", "59.9"])("uses %s", (v) => {
    expect(isUsableYearsExperience(v)).toBe(true);
    expect(yearsExperienceProblem(v)).toBe("");
  });

  it.each(["", " ", "abc", "5.55", "61", "60.1", "-1", "1e2", "5,5", "100", "5.", ".5", "6 years"])(
    "does not use %j",
    (v) => {
      expect(isUsableYearsExperience(v)).toBe(false);
    },
  );

  it("lets a person type their way to a number, one key at a time, and refuses what could never be one", () => {
    for (const v of ["", "5", "5.", "5.5", "12", "12.3", "60"]) expect(isTypableYearsExperience(v), v).toBe(true);
    for (const v of ["a", "5a", "-", "5.55", "5..", "61", "99", "60.1", "100", "1e2", "5,5"]) {
      expect(isTypableYearsExperience(v), v).toBe(false);
    }
  });

  it("says a saved value will not be used, but stays quiet while a decimal is being typed", () => {
    expect(yearsExperienceProblem("six")).toMatch(/will not be used/);
    expect(yearsExperienceProblem("75")).toMatch(/will not be used/);
    expect(yearsExperienceProblem("5.")).toBe("");
    expect(yearsExperienceProblem(undefined)).toBe("");
    expect(yearsExperienceProblem(null)).toBe("");
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

  it("counts the text-message consent only when it is Yes or No", () => {
    expect(answeredCount({ ...EMPTY_PROFILE, smsOptIn: "No" })).toBe(1);
    expect(answeredCount({ ...EMPTY_PROFILE, smsOptIn: "Decline to state" })).toBe(0);
  });
});
