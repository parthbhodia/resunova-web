import { describe, expect, it } from "vitest";
import { extractedProfileFromStructured, resumeFingerprint } from "@/components/analyze/saveToProfile";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const sr = (over: Partial<StructuredResume> = {}): StructuredResume => ({
  full_name: "Jane Doe",
  headline: "Full-stack engineer",
  location: "San Francisco, CA",
  email: "jane@example.com",
  phone: "+1 555 0100",
  linkedin: "linkedin.com/in/janedoe",
  github: "github.com/janedoe",
  summary: "Five years building web apps.",
  skills: [{ category: "Core", items: ["React", "TypeScript"] }, { category: "Data", items: ["SQL"] }],
  experience: [{ company: "Acme", role: "SWE", dates: "2021–now", location: "SF", bullets: ["Improved X by 40%"] }],
  education: [{ institution: "State U", degree: "BS CS", dates: "2017–2021", location: "", bullets: [] }],
  projects: [{ name: "Sidegig", tech: "Next.js", bullets: ["Shipped it"] }],
  extra_sections: [],
  ...over,
});

describe("extractedProfileFromStructured", () => {
  it("maps all the primary fields", () => {
    const out = extractedProfileFromStructured(sr());
    expect(out.name).toBe("Jane Doe");
    expect(out.email).toBe("jane@example.com");
    expect(out.phone).toBe("+1 555 0100");
    expect(out.location).toBe("San Francisco, CA");
    expect(out.headline).toBe("Full-stack engineer");
    expect(out.role).toBe("Full-stack engineer"); // no separate role on StructuredResume
    expect(out.linkedin).toBe("linkedin.com/in/janedoe");
    expect(out.github).toBe("github.com/janedoe");
    expect(out.summary).toBe("Five years building web apps.");
    expect(out.portfolio).toBe("");
  });

  it("flattens skill groups into a flat list", () => {
    expect(extractedProfileFromStructured(sr()).skills).toEqual(["React", "TypeScript", "SQL"]);
  });

  it("maps experience / education / projects arrays", () => {
    const out = extractedProfileFromStructured(sr());
    expect(out.experience).toEqual([
      { company: "Acme", role: "SWE", dates: "2021–now", location: "SF", bullets: ["Improved X by 40%"] },
    ]);
    expect(out.education).toEqual([
      { institution: "State U", degree: "BS CS", dates: "2017–2021", bullets: [] },
    ]);
    expect(out.projects).toEqual([{ name: "Sidegig", tech: "Next.js", bullets: ["Shipped it"] }]);
  });

  it("tolerates empty / missing arrays", () => {
    const out = extractedProfileFromStructured(sr({ skills: [], experience: [], education: [], projects: [] }));
    expect(out.skills).toEqual([]);
    expect(out.experience).toEqual([]);
    expect(out.education).toEqual([]);
    expect(out.projects).toEqual([]);
  });
});

describe("resumeFingerprint", () => {
  it("is stable + case/space-insensitive on name+email", () => {
    expect(resumeFingerprint(sr())).toBe("jane doe|jane@example.com");
    expect(resumeFingerprint(sr({ full_name: "  JANE DOE ", email: "Jane@Example.com" })))
      .toBe("jane doe|jane@example.com");
  });
  it("differs for a different résumé", () => {
    expect(resumeFingerprint(sr({ email: "other@x.com" }))).not.toBe(resumeFingerprint(sr()));
  });
});
