import { describe, expect, it } from "vitest";
import { isMissingLinkedInFlag, resumeShowsLinkedInProfile } from "@/lib/resumeLinkedIn";

describe("resume LinkedIn presence", () => {
  it("sees a profile written as LinkedIn/in/name", () => {
    expect(resumeShowsLinkedInProfile({
      lines: ["parthbhodia08@gmail.com | +1 4439294371 | LinkedIn/in/parthbhodia | Jersey City"],
    })).toBe(true);
  });

  it("sees a linkedin.com url and an in/handle stored on the contact field", () => {
    expect(resumeShowsLinkedInProfile({ linkedin: "https://www.linkedin.com/in/parthbhodia" })).toBe(true);
    expect(resumeShowsLinkedInProfile({ linkedin: "in/parthbhodia" })).toBe(true);
  });

  it("does not treat a bullet that merely mentions LinkedIn as a profile", () => {
    expect(resumeShowsLinkedInProfile({
      extractedText: "Owned the social calendar across Instagram and LinkedIn Sales Navigator.",
    })).toBe(false);
  });

  it("names the missing-url flag and leaves other flags alone", () => {
    expect(isMissingLinkedInFlag("No LinkedIn URL")).toBe(true);
    expect(isMissingLinkedInFlag("Open-ended dates")).toBe(false);
  });
});
