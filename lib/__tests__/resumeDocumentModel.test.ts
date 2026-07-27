import { describe, it, expect } from "vitest";
import { tbToStructured, splitDateRange, joinDateRange } from "@/lib/resumeDocumentModel";
import { mapStructuredResumeToTemplateData } from "@/lib/templateBuilderPrefill";
import { normalizeStructuredResume, type StructuredResume } from "@/store/resumeAnalyzeStore";

/**
 * The convergence of the two renderers depends on these two shapes converting
 * without losing the document. These are the tests that make "losslessly" a
 * claim rather than a hope — including the places it is knowingly NOT
 * lossless, which are pinned so a future change has to notice.
 */

const doc = (): StructuredResume => normalizeStructuredResume({
  full_name: "Alex Johnson",
  headline: "",
  location: "San Francisco, CA",
  email: "alex@example.com",
  phone: "(415) 555-0192",
  linkedin: "linkedin.com/in/alexjohnson",
  github: "github.com/alexjohnson",
  summary: "Full-stack engineer with 5 years building payments products.",
  skills: [
    { category: "Languages", items: ["TypeScript", "Python", "Go"] },
    { category: "Cloud", items: ["AWS", "Docker"] },
  ],
  experience: [
    {
      company: "Northgate Payments", role: "Software Engineer II",
      dates: "Jun 2022 – Present", location: "San Francisco, CA",
      bullets: ["Shipped a self-serve onboarding flow used by 40,000 merchants", "Cut failed-delivery tickets by 61%"],
    },
    {
      company: "Vantage Marketplace", role: "Software Engineer",
      dates: "Jul 2020 – Jun 2022", location: "Oakland, CA",
      bullets: ["Built a React component library adopted by 12 teams"],
    },
  ],
  education: [{
    institution: "UC Berkeley", degree: "B.S. EECS",
    dates: "Aug 2016 – May 2020", location: "Berkeley, CA",
    bullets: ["GPA: 3.87", "Coursework: Algorithms, Distributed Systems"],
  }],
  projects: [{ name: "ResumeIQ", tech: "Next.js, Python", bullets: ["Scored 10K+ résumés in beta"] }],
  extra_sections: [{ title: "Certifications", lines: ["AWS Solutions Architect, 2024"] }],
  section_order: ["summary", "experience", "education", "projects", "skills"],
})!;

describe("structured → builder → structured keeps the document", () => {
  const round = () => tbToStructured(mapStructuredResumeToTemplateData(doc()));

  it("keeps identity and contact fields", () => {
    const r = round();
    const o = doc();
    for (const k of ["full_name", "location", "email", "phone", "linkedin", "github", "summary"] as const) {
      expect(r[k], k).toBe(o[k]);
    }
  });

  it("keeps every experience entry and every bullet", () => {
    const r = round();
    const o = doc();
    expect(r.experience).toHaveLength(o.experience.length);
    o.experience.forEach((exp, i) => {
      expect(r.experience[i].company).toBe(exp.company);
      expect(r.experience[i].role).toBe(exp.role);
      expect(r.experience[i].location).toBe(exp.location);
      expect(r.experience[i].bullets).toEqual(exp.bullets);
    });
  });

  it("keeps education, projects and their bullets", () => {
    const r = round();
    const o = doc();
    expect(r.education[0].institution).toBe(o.education[0].institution);
    expect(r.education[0].degree).toBe(o.education[0].degree);
    expect(r.projects[0].name).toBe(o.projects[0].name);
    expect(r.projects[0].tech).toBe(o.projects[0].tech);
    expect(r.projects[0].bullets).toEqual(o.projects[0].bullets);
  });

  it("keeps skill categories and their items", () => {
    const r = round();
    expect(r.skills.map((s) => s.category)).toEqual(["Languages", "Cloud"]);
    expect(r.skills[0].items).toEqual(["TypeScript", "Python", "Go"]);
    expect(r.skills[1].items).toEqual(["AWS", "Docker"]);
  });

  it("keeps GPA and coursework, which the two shapes store differently", () => {
    // Separate fields on the builder, bullets in the analysis model.
    const r = round();
    expect(r.education[0].bullets).toContain("GPA: 3.87");
    expect(r.education[0].bullets.some((b) => b.startsWith("Coursework:"))).toBe(true);
  });

  it("keeps custom sections", () => {
    expect(round().extra_sections[0]).toEqual({
      title: "Certifications", lines: ["AWS Solutions Architect, 2024"],
    });
  });
});

describe("date ranges round-trip", () => {
  it.each([
    ["Jun 2022 – Present", "Jun 2022 – Present"],
    ["Jul 2020 – Jun 2022", "Jul 2020 – Jun 2022"],
    ["Aug 2016 - May 2020", "Aug 2016 – May 2020"],   // hyphen normalises to en dash
    ["2024", "2024"],
  ])("%s", (input, expected) => {
    const { startDate, endDate, current } = splitDateRange(input);
    expect(joinDateRange(startDate, endDate, current)).toBe(expected);
  });

  it("marks an open-ended range as current rather than storing the word", () => {
    expect(splitDateRange("Jun 2022 – Present")).toEqual({
      startDate: "Jun 2022", endDate: "", current: true,
    });
  });
});

describe("known lossy edges are pinned, not silently accepted", () => {
  it("drops headline, because the builder has no field for it", () => {
    // If TBProfile ever grows a headline, this test should fail and be updated
    // — that is the point of asserting a known loss.
    const r = tbToStructured(mapStructuredResumeToTemplateData(
      normalizeStructuredResume({ ...doc(), headline: "Senior Engineer" })!,
    ));
    expect(r.headline).toBe("");
  });

  it("survives an empty document without throwing", () => {
    const empty = normalizeStructuredResume({
      full_name: "", headline: "", location: "", email: "", phone: "",
      linkedin: "", github: "", summary: "",
      skills: [], experience: [], education: [], projects: [], extra_sections: [],
    })!;
    const r = tbToStructured(mapStructuredResumeToTemplateData(empty));
    expect(r.experience).toEqual([]);
    expect(r.full_name).toBe("");
  });
});
