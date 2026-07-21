import { describe, expect, it } from "vitest";
import { boostedResumeFromAccepted } from "@/lib/boostToVersion";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const base: { structured: StructuredResume; extractedText: string } = {
  structured: {
    full_name: "Jordan Rivera", headline: "PM", location: "SF", email: "j@x.com",
    phone: "", linkedin: "", github: "", summary: "PM.",
    skills: [],
    experience: [{
      company: "Notion", role: "PM", dates: "2022", location: "SF",
      bullets: ["Ran weekly discovery with customers", "Shipped onboarding revamp"],
    }],
    education: [], projects: [], extra_sections: [],
  },
  extractedText: "Jordan Rivera\nEXPERIENCE\n• Ran weekly discovery with customers\n• Shipped onboarding revamp",
};

describe("boostedResumeFromAccepted", () => {
  it("bakes accepted rewrites into the structured doc AND the flat text (matched by original)", () => {
    const out = boostedResumeFromAccepted(base, [
      { original: "Ran weekly discovery with customers", suggested: "Built an A/B experimentation practice with customers" },
    ]);
    expect(out.structured?.experience[0].bullets[0]).toBe("Built an A/B experimentation practice with customers");
    // untouched bullet stays
    expect(out.structured?.experience[0].bullets[1]).toBe("Shipped onboarding revamp");
    expect(out.extractedText).toContain("Built an A/B experimentation practice");
  });

  it("only applies the pairs it's given (rejected suggestions never leak in)", () => {
    const out = boostedResumeFromAccepted(base, []); // nothing accepted
    expect(out.structured?.experience[0].bullets[0]).toBe("Ran weekly discovery with customers");
  });

  it("ignores empty/blank pairs", () => {
    const out = boostedResumeFromAccepted(base, [{ original: "  ", suggested: "x" }, { original: "y", suggested: "  " }]);
    expect(out.structured?.experience[0].bullets).toEqual(base.structured.experience[0].bullets);
  });
});
