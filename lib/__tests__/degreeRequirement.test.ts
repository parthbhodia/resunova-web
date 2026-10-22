import { describe, expect, it } from "vitest";
import {
  degreeRequirementSatisfied,
  highestDegreeIn,
  isCredentialRequirement,
  isUnleveledDegreeRequirement,
  requiredDegreeLevel,
} from "@/lib/degreeRequirement";

/**
 * Field report 2026-08-07, with a screenshot: "Bachelor's degree" sat in
 * COULD GET YOU FILTERED OUT for a candidate whose résumé shows a higher
 * degree. Founder: "if i have a masters degree, it is quite obvious i will
 * have a bachelors."
 */
describe("a higher degree clears a lower requirement", () => {
  const masters = "EDUCATION\nMaster of Science in Computer Science, UMBC, 2024";

  it("satisfies a Bachelor's ask from a Master's résumé", () => {
    expect(degreeRequirementSatisfied("Bachelor's degree", masters)).toBe(true);
  });

  it("satisfies a Bachelor's ask from a PhD résumé", () => {
    expect(degreeRequirementSatisfied("Bachelor's degree", "Ph.D. in Physics")).toBe(true);
  });

  it("does NOT satisfy a Master's ask from a Bachelor's résumé", () => {
    // The direction that must keep working: this is a real gap.
    expect(
      degreeRequirementSatisfied("Master's degree", "B.Sc in Computer Science"),
    ).toBe(false);
  });

  it("reads 'Master's or PhD' as asking for the LOWER of the two", () => {
    // The posting states a floor. Reading it as PhD would flag a Master's
    // holder for a requirement their degree already meets.
    expect(requiredDegreeLevel("Master's degree or PhD in Computer Science")).toBe("master");
    expect(
      degreeRequirementSatisfied("Master's degree or PhD", "Master of Science, UMBC"),
    ).toBe(true);
  });

  it("says nothing about requirements that are not degrees", () => {
    expect(requiredDegreeLevel("Golang")).toBeNull();
    expect(degreeRequirementSatisfied("full stack development", masters)).toBe(false);
  });

  it("ignores field of study on purpose", () => {
    // Generous beats clever: "or related technical field" is not a regex's call,
    // and being clever tells a physics graduate they have no technical degree.
    expect(
      degreeRequirementSatisfied(
        "Bachelor's degree in Computer Science",
        "Bachelor of Arts in Philosophy",
      ),
    ).toBe(true);
  });
});

/**
 * Field report: "CS degree" was flagged for a candidate whose résumé listed a
 * Computer Science degree, because a requirement naming no level was not
 * treated as a degree requirement at all.
 */
describe("a degree requirement that names no level", () => {
  it("is a degree requirement and a credential", () => {
    expect(isUnleveledDegreeRequirement("CS degree")).toBe(true);
    expect(isUnleveledDegreeRequirement("Degree in Computer Science or related field")).toBe(true);
    expect(isCredentialRequirement("CS degree")).toBe(true);
  });

  it("is satisfied by any degree on the résumé", () => {
    expect(
      degreeRequirementSatisfied("CS degree", "EDUCATION\nBachelor of Science, Computer Science"),
    ).toBe(true);
    expect(degreeRequirementSatisfied("Degree in a related field", "M.S. in Physics")).toBe(true);
  });

  it("is not satisfied when the résumé lists no degree", () => {
    expect(degreeRequirementSatisfied("CS degree", "EXPERIENCE\nSoftware Developer.")).toBe(false);
    expect(degreeRequirementSatisfied("CS degree", "Jane Doe · Boston, MA")).toBe(false);
  });

  it("does not read 'degree' phrasings that are not degree asks", () => {
    expect(isUnleveledDegreeRequirement("360-degree feedback")).toBe(false);
    expect(isUnleveledDegreeRequirement("high degree of autonomy")).toBe(false);
    expect(isCredentialRequirement("360-degree feedback")).toBe(false);
  });
});

/**
 * The abbreviation trap. This repo already shipped this bug in another form --
 * jp_is_non_us read "Pune, IN" as Indiana -- so the guard is pinned here.
 */
describe("bare two-letter abbreviations are never read as degrees", () => {
  it("does not read a US state as a degree", () => {
    expect(highestDegreeIn("Boston, MA")).toBeNull();
    expect(highestDegreeIn("Jackson, MS")).toBeNull();
    expect(highestDegreeIn("Software Engineer · Buenos Aires, BA")).toBeNull();
  });

  it("does not let a state abbreviation satisfy a degree requirement", () => {
    // The failure this prevents: telling someone in Boston they have a Master's.
    expect(
      degreeRequirementSatisfied("Master's degree", "Jane Doe · Boston, MA · jane@x.com"),
    ).toBe(false);
  });

  it("still reads the safe abbreviations", () => {
    expect(highestDegreeIn("M.S. in Computer Science")).toBe("master");
    expect(highestDegreeIn("B.Tech, Mumbai University")).toBe("bachelor");
    expect(highestDegreeIn("MBA, Wharton")).toBe("master");
    expect(highestDegreeIn("Ph.D in Statistics")).toBe("doctorate");
    expect(highestDegreeIn("BSc Computer Science")).toBe("bachelor");
  });

  it("picks the highest when a résumé lists several", () => {
    expect(
      highestDegreeIn("Bachelor of Science, 2019\nMaster of Science, 2021"),
    ).toBe("master");
  });

  it("reads dotted B.E. and M.E.", () => {
    expect(highestDegreeIn("B.E. Computer Science, Anna University")).toBe("bachelor");
    expect(highestDegreeIn("M.E. Electrical Engineering")).toBe("master");
  });

  it("returns null for a résumé with no education at all", () => {
    expect(highestDegreeIn("Software Engineer. Built things.")).toBeNull();
    expect(highestDegreeIn("")).toBeNull();
  });
});
