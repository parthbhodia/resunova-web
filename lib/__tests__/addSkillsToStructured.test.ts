import { describe, expect, it } from "vitest";
import {
  addSkillsToStructured,
  skillCategoryOptions,
  DEFAULT_SKILL_CATEGORY,
} from "@/lib/addSkillsToStructured";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

function resume(skills: StructuredResume["skills"]): StructuredResume {
  return {
    full_name: "Parth Bhodia",
    headline: "",
    location: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    summary: "",
    skills,
    experience: [],
    education: [],
    projects: [],
    extra_sections: [],
  };
}

describe("addSkillsToStructured", () => {
  it("appends to an existing category", () => {
    const before = resume([{ category: "Languages", items: ["Python"] }]);
    const { structured, added, skipped } = addSkillsToStructured(before, ["Go", "C++"], "Languages");
    expect(structured.skills).toEqual([{ category: "Languages", items: ["Python", "Go", "C++"] }]);
    expect(added).toEqual(["Go", "C++"]);
    expect(skipped).toEqual([]);
  });

  it("creates the category when it is absent", () => {
    const before = resume([{ category: "Languages", items: ["Python"] }]);
    const { structured } = addSkillsToStructured(before, ["Docker"], "Tools");
    expect(structured.skills).toEqual([
      { category: "Languages", items: ["Python"] },
      { category: "Tools", items: ["Docker"] },
    ]);
  });

  it("matches an existing category case-insensitively rather than duplicating it", () => {
    const before = resume([{ category: "Tools", items: ["Git"] }]);
    const { structured } = addSkillsToStructured(before, ["Docker"], "tools");
    expect(structured.skills).toHaveLength(1);
    expect(structured.skills[0].items).toEqual(["Git", "Docker"]);
  });

  it("skips skills the résumé already lists, in any category or casing", () => {
    const before = resume([
      { category: "Languages", items: ["Python", "go"] },
      { category: "Tools", items: ["Docker"] },
    ]);
    const { structured, added, skipped } = addSkillsToStructured(before, ["Go", "Docker", "Rust"], "Languages");
    expect(added).toEqual(["Rust"]);
    expect(skipped).toEqual(["Go", "Docker"]);
    expect(structured.skills[0].items).toEqual(["Python", "go", "Rust"]);
  });

  it("keeps symbol-bearing names distinct", () => {
    const before = resume([{ category: "Languages", items: ["C#"] }]);
    const { added, skipped } = addSkillsToStructured(before, ["C++", "C#"], "Languages");
    expect(added).toEqual(["C++"]);
    expect(skipped).toEqual(["C#"]);
  });

  it("dedupes repeats within one call", () => {
    const before = resume([]);
    const { added } = addSkillsToStructured(before, ["Go", "go", " GO "], DEFAULT_SKILL_CATEGORY);
    expect(added).toEqual(["Go"]);
  });

  it("ignores blank input and returns the document untouched when nothing is added", () => {
    const before = resume([{ category: "Languages", items: ["Python"] }]);
    const { structured, added } = addSkillsToStructured(before, ["", "   ", "Python"], "Languages");
    expect(added).toEqual([]);
    expect(structured).toBe(before);
  });

  it("does not mutate the input document", () => {
    const before = resume([{ category: "Languages", items: ["Python"] }]);
    const snapshot = JSON.parse(JSON.stringify(before));
    addSkillsToStructured(before, ["Go"], "Languages");
    expect(before).toEqual(snapshot);
  });
});

describe("skillCategoryOptions", () => {
  it("lists the résumé's own categories", () => {
    const r = resume([{ category: "Languages", items: [] }, { category: "Tools", items: [] }]);
    expect(skillCategoryOptions(r)).toEqual(["Languages", "Tools"]);
  });

  it("falls back to a default when there are none", () => {
    expect(skillCategoryOptions(resume([]))).toEqual([DEFAULT_SKILL_CATEGORY]);
    expect(skillCategoryOptions(null)).toEqual([DEFAULT_SKILL_CATEGORY]);
  });

  it("ignores blank category names", () => {
    const r = resume([{ category: "  ", items: [] }, { category: "Tools", items: [] }]);
    expect(skillCategoryOptions(r)).toEqual(["Tools"]);
  });
});
