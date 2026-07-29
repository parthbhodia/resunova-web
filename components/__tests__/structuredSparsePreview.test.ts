import { describe, expect, it } from "vitest";
import {
  isStructuredTooSparseForFlatText,
  isStructuredUsable,
} from "@/components/AnalyzeLiveResumeBody";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const FLAT_WITH_EXPERIENCE = `
PARTH BHODIA
email@example.com

SUMMARY
Senior engineer with 7+ years building AI products.

EDUCATION
University of Maryland, Baltimore County — M.S. Information Technology

WORK EXPERIENCE
Acme Corp — Senior Software Engineer
Jan 2020 - Present
- Led platform migration serving 2M users
- Built LLM evaluation pipeline cutting review time 40%
- Mentored 4 engineers on design reviews

Beta Labs — Software Engineer
- Shipped React/Node services for payments
- Reduced incident volume 30%

PROJECTS
Stock Trader
- Real-time trading dashboard with WebSockets
Resunova
- AI résumé scoring product

SKILLS
Python, TypeScript, React
`.trim();

function shellStructured(): StructuredResume {
  return {
    full_name: "PARTH BHODIA",
    email: "email@example.com",
    phone: "",
    linkedin: "",
    github: "",
    headline: "",
    location: "",
    summary: "Senior engineer with 7+ years building AI products.",
    education: [
      { institution: "Al and Data Science", degree: "", dates: "", location: "", bullets: [] },
      { institution: "Baltimore County — M.S.", degree: "Information Technology", dates: "", location: "", bullets: [] },
    ],
    experience: [],
    projects: [
      { name: "Stock Trader", tech: "", bullets: [] },
      { name: "ResuNova", tech: "", bullets: [] },
    ],
    skills: [],
    extra_sections: [],
  };
}

describe("isStructuredTooSparseForFlatText", () => {
  it("flags education/project shells with empty experience when flat text has jobs", () => {
    const s = shellStructured();
    expect(isStructuredUsable(s)).toBe(true);
    expect(isStructuredTooSparseForFlatText(s, FLAT_WITH_EXPERIENCE)).toBe(true);
  });

  it("flags employer shells that have zero bullets", () => {
    const s = shellStructured();
    s.experience = [
      {
        company: "Acme Corp",
        role: "Senior Software Engineer",
        dates: "2020-Present",
        location: "",
        bullets: [],
      },
    ];
    expect(isStructuredTooSparseForFlatText(s, FLAT_WITH_EXPERIENCE)).toBe(true);
  });

  it("keeps a populated structured extract", () => {
    const s = shellStructured();
    s.experience = [
      {
        company: "Acme Corp",
        role: "Senior Software Engineer",
        dates: "2020-Present",
        location: "",
        bullets: ["Led platform migration serving 2M users"],
      },
    ];
    s.projects = [
      { name: "Stock Trader", tech: "", bullets: ["Real-time trading dashboard"] },
    ];
    expect(isStructuredTooSparseForFlatText(s, FLAT_WITH_EXPERIENCE)).toBe(false);
  });

  it("does not flag short flat text without an experience section", () => {
    const s = shellStructured();
    expect(
      isStructuredTooSparseForFlatText(s, "PARTH\nSUMMARY\nEngineer.\nEDUCATION\nUMBC"),
    ).toBe(false);
  });
});
