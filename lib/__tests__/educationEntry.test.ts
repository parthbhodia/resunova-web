import { describe, expect, it } from "vitest";
import {
  appendEducation,
  educationAlreadyPresent,
  educationDraftFromRequirement,
  educationDraftToEntry,
  formatDegreeLine,
  isEducationDraftValid,
  type EducationDraft,
} from "@/lib/educationEntry";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const doc = (education: StructuredResume["education"] = []): StructuredResume =>
  ({
    full_name: "Jane Doe",
    education,
    experience: [],
    projects: [],
    skills: [],
    extra_sections: [],
  }) as unknown as StructuredResume;

const draft = (over: Partial<EducationDraft> = {}): EducationDraft => ({
  degree: "Master's",
  field: "Computer Science",
  institution: "UMBC",
  year: "2024",
  ...over,
});

describe("seeding the form from the requirement", () => {
  it("fills the degree and the field so the common case is confirm-and-save", () => {
    const d = educationDraftFromRequirement("Bachelor's degree in Computer Science");
    expect(d.degree).toBe("Bachelor's");
    expect(d.field).toBe("Computer Science");
  });

  it("reads 'Master's or PhD' as the lower bar the posting actually sets", () => {
    expect(educationDraftFromRequirement("Master's degree or PhD").degree).toBe("Master's");
  });

  it("leaves the field empty rather than inventing one", () => {
    expect(educationDraftFromRequirement("Bachelor's degree").field).toBe("");
  });

  it("stops the field at 'or', not swallowing the rest of the sentence", () => {
    const d = educationDraftFromRequirement(
      "Bachelor's degree in Computer Science or related technical field",
    );
    expect(d.field).toBe("Computer Science");
  });

  it("never prefills the school — that is the part only the user knows", () => {
    const d = educationDraftFromRequirement("Master's degree in Statistics");
    expect(d.institution).toBe("");
    expect(isEducationDraftValid(d)).toBe(false);
  });
});

describe("what counts as a saveable entry", () => {
  it("requires a school, because an unverifiable claim defeats the point", () => {
    expect(isEducationDraftValid(draft({ institution: "  " }))).toBe(false);
    expect(isEducationDraftValid(draft({ degree: "" }))).toBe(false);
  });

  it("does not require a year — 'Expected 2026' is a real entry", () => {
    expect(isEducationDraftValid(draft({ year: "" }))).toBe(true);
  });

  it("formats degree and field into one résumé line", () => {
    expect(formatDegreeLine(draft())).toBe("Master's in Computer Science");
    expect(formatDegreeLine(draft({ field: "" }))).toBe("Master's");
  });
});

describe("writing it into the document", () => {
  it("appends without mutating the input", () => {
    const before = doc();
    const after = appendEducation(before, educationDraftToEntry(draft()));
    expect(before.education).toHaveLength(0);
    expect(after.education).toHaveLength(1);
    expect(after.education[0]).toMatchObject({
      institution: "UMBC",
      degree: "Master's in Computer Science",
      dates: "2024",
    });
  });

  it("keeps the author's existing order instead of re-sorting their résumé", () => {
    const existing = [{ institution: "MIT", degree: "Ph.D.", dates: "2020", location: "", bullets: [] }];
    const after = appendEducation(doc(existing), educationDraftToEntry(draft()));
    expect(after.education.map((e) => e.institution)).toEqual(["MIT", "UMBC"]);
  });
});

describe("not adding the same degree twice", () => {
  // This row only opens when the résumé ALREADY evidences the credential, so
  // "add it" very easily means "add it twice".
  it("detects the duplicate across case and punctuation", () => {
    const existing = [
      { institution: "U.M.B.C.", degree: "Masters in Computer Science", dates: "", location: "", bullets: [] },
    ];
    expect(
      educationAlreadyPresent(doc(existing), educationDraftToEntry(draft())),
    ).toBe(true);
  });

  it("does not call a different school a duplicate", () => {
    const existing = [
      { institution: "MIT", degree: "Master's in Computer Science", dates: "", location: "", bullets: [] },
    ];
    expect(
      educationAlreadyPresent(doc(existing), educationDraftToEntry(draft())),
    ).toBe(false);
  });
});
