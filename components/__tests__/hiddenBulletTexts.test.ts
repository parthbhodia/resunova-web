import { describe, expect, it } from "vitest";
import { hiddenBulletTextsFromStructured } from "@/components/AnalyzeLiveResumeBody";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "",
  location: "Jersey City",
  email: "p@example.com",
  phone: "123",
  linkedin: "",
  github: "",
  summary: "Full Stack Engineer with 5+ years of experience.",
  skills: [],
  experience: [
    {
      company: "Eccalon",
      role: "Fullstack Developer",
      dates: "May 2022 – Present",
      location: "Remote",
      bullets: [
        "Built and maintained scalable frontend UIs in Vue.js for federal platforms.",
        "Designed a PostgreSQL schema supporting a high-traffic CMS.",
      ],
    },
  ],
  education: [],
  projects: [
    { name: "Quill", tech: "TypeScript", bullets: ["Open-source collaborative markdown editor."] },
  ],
  extra_sections: [],
};

describe("hiddenBulletTextsFromStructured", () => {
  it("resolves a bullet path to its rendered text (marker stripped)", () => {
    const texts = hiddenBulletTextsFromStructured(structured, { "exp.0.bullets.1": true });
    expect(texts).toHaveLength(1);
    expect(texts[0]).toBe("Designed a PostgreSQL schema supporting a high-traffic CMS.");
    expect(texts[0].startsWith("•")).toBe(false);
  });

  it("resolves a project bullet path", () => {
    const texts = hiddenBulletTextsFromStructured(structured, { "proj.0.bullets.0": true });
    expect(texts).toEqual(["Open-source collaborative markdown editor."]);
  });

  it("resolves multiple hidden paths across sections", () => {
    const texts = hiddenBulletTextsFromStructured(structured, {
      "exp.0.bullets.0": true,
      "proj.0.bullets.0": true,
    });
    expect(texts).toContain("Built and maintained scalable frontend UIs in Vue.js for federal platforms.");
    expect(texts).toContain("Open-source collaborative markdown editor.");
  });

  it("returns [] for no deletions, empty map, or null structured", () => {
    expect(hiddenBulletTextsFromStructured(structured, {})).toEqual([]);
    expect(hiddenBulletTextsFromStructured(structured, undefined)).toEqual([]);
    expect(hiddenBulletTextsFromStructured(null, { "exp.0.bullets.0": true })).toEqual([]);
  });

  it("ignores paths that don't match any rendered bullet", () => {
    expect(hiddenBulletTextsFromStructured(structured, { "exp.9.bullets.9": true })).toEqual([]);
  });
});
