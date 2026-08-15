import { describe, expect, it } from "vitest";
import { appendSkill, skillAlreadyListed } from "@/lib/skillsEntry";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

/**
 * The Skills-section route for missing keywords (founder-asked 2026-08-15:
 * "What if a user also has a skill section, shouldnt we add it there ?").
 * The properties that matter: the write goes to the primary (first) group,
 * a term is never listed twice, and "nothing was added" is reported rather
 * than silently swallowed.
 */

function doc(skills: StructuredResume["skills"]): StructuredResume {
  return {
    full_name: "T", headline: "", location: "", email: "", phone: "",
    linkedin: "", github: "", summary: "", skills,
    experience: [], education: [], projects: [], extra_sections: [],
  };
}

describe("appendSkill", () => {
  it("appends to the FIRST group, leaving the others untouched", () => {
    const res = appendSkill(
      doc([
        { category: "Languages", items: ["Python"] },
        { category: "Tools", items: ["Docker"] },
      ]),
      "HTML",
    );
    expect(res.added).toBe(true);
    expect(res.structured.skills[0].items).toEqual(["Python", "HTML"]);
    expect(res.structured.skills[1].items).toEqual(["Docker"]);
    // One group grew; no new group appeared.
    expect(res.structured.skills).toHaveLength(2);
  });

  it("creates a plainly-titled section when the résumé has none", () => {
    const res = appendSkill(doc([]), "HTML");
    expect(res.added).toBe(true);
    expect(res.structured.skills).toEqual([{ category: "Skills", items: ["HTML"] }]);
  });

  it("refuses a duplicate, case-folded, and says so", () => {
    // "html" vs "HTML" listed in the SECOND group — the dedupe must scan all
    // groups, not just the one it writes to.
    const base = doc([
      { category: "Languages", items: ["Python"] },
      { category: "Web", items: ["html"] },
    ]);
    const res = appendSkill(base, "HTML");
    expect(res.added).toBe(false);
    expect(res.structured).toBe(base);
  });

  it("a blank term is a no-op", () => {
    const base = doc([{ category: "Skills", items: ["Go"] }]);
    expect(appendSkill(base, "   ").added).toBe(false);
  });

  it("skillAlreadyListed folds case and whitespace", () => {
    const base = doc([{ category: "Skills", items: [" Terraform "] }]);
    expect(skillAlreadyListed(base, "terraform")).toBe(true);
    expect(skillAlreadyListed(base, "Terra")).toBe(false);
  });

  it("does not mutate the input document", () => {
    const base = doc([{ category: "Skills", items: ["Go"] }]);
    appendSkill(base, "HTML");
    expect(base.skills[0].items).toEqual(["Go"]);
  });
});
