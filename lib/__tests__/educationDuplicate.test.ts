import { describe, expect, it } from "vitest";
import { educationAlreadyPresent, educationDraftToEntry } from "@/lib/educationEntry";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

/**
 * The duplicate warning compared the FORMATTED degree line, so it fired only
 * when the résumé happened to spell the degree the way the form seeds it.
 * Measured against real wording it missed 4 of 5 spellings, and the one it
 * caught was the one the original test used -- a test that picks the passing
 * case cannot see the bug.
 *
 * This row only ever opens on a résumé that ALREADY evidences the credential,
 * so the duplicate is the common case, not the edge case.
 */
const doc = (...degrees: string[]): StructuredResume =>
  ({
    full_name: "Jane", experience: [], projects: [], skills: [], extra_sections: [],
    education: degrees.map((degree) => ({
      institution: "UMBC", degree, dates: "", location: "", bullets: [],
    })),
  }) as unknown as StructuredResume;

const seeded = educationDraftToEntry({
  degree: "Bachelor's", field: "Computer Science", institution: "UMBC", year: "",
});

describe("duplicate detection survives real résumé wording", () => {
  it.each([
    "Bachelor of Science in Computer Science",
    "B.S. in Computer Science",
    "BSc Computer Science",
    "Bachelor of Science, Computer Science",
    "Bachelors in Computer Science",
    "B.Sc. Computer Science",
  ])("spots it when the résumé says %s", (degree) => {
    expect(educationAlreadyPresent(doc(degree), seeded)).toBe(true);
  });

  it("still folds punctuation in the school name", () => {
    const umbc = {
      ...doc("Bachelor of Science"),
      education: [{ institution: "U.M.B.C.", degree: "Bachelor of Science", dates: "", location: "", bullets: [] }],
    } as StructuredResume;
    expect(educationAlreadyPresent(umbc, seeded)).toBe(true);
  });
});

describe("what must NOT read as a duplicate", () => {
  it("does not let a Master's shadow the Bachelor's being added", () => {
    // Two degrees from one university is ordinary. If any degree at the school
    // counted, someone could never add the second one.
    expect(educationAlreadyPresent(doc("Master of Science in Computer Science"), seeded)).toBe(false);
  });

  it("finds the Bachelor's even when a Master's is listed first", () => {
    expect(
      educationAlreadyPresent(doc("Master of Science", "Bachelor of Science"), seeded),
    ).toBe(true);
  });

  it("does not call a different school a duplicate", () => {
    const mit = {
      ...doc("Bachelor of Science"),
      education: [{ institution: "MIT", degree: "Bachelor of Science", dates: "", location: "", bullets: [] }],
    } as StructuredResume;
    expect(educationAlreadyPresent(mit, seeded)).toBe(false);
  });

  it("falls back to spelling when neither side names a known level", () => {
    const cert = educationDraftToEntry({
      degree: "Certificate", field: "Data Analytics", institution: "UMBC", year: "",
    });
    expect(educationAlreadyPresent(doc("Certificate in Data Analytics"), cert)).toBe(true);
    expect(educationAlreadyPresent(doc("Diploma in Design"), cert)).toBe(false);
  });
});
