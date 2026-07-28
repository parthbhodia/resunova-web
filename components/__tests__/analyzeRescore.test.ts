import { describe, expect, it } from "vitest";
import { patchAppliedEditsIntoResume } from "@/lib/analyzeRescore";
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

const extractedText = [
  "Parth Bhodia",
  "SUMMARY",
  "Full Stack Engineer with 5+ years of experience.",
  "EXPERIENCE",
  "Fullstack Developer · Eccalon · Remote",
  "• Built and maintained scalable frontend UIs in Vue.js for federal platforms.",
  "• Designed a PostgreSQL schema supporting a high-traffic CMS.",
  "PROJECTS",
  "• Open-source collaborative markdown editor.",
].join("\n");

describe("patchAppliedEditsIntoResume", () => {
  it("bakes an applied bullet override into text (marker preserved) and structured experience", () => {
    const { patchedText, patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [
        { originalBullet: "Built and maintained scalable frontend UIs in Vue.js for federal platforms." },
      ],
      lineOverrides: { 0: "Built scalable Vue.js frontends serving 12 federal platforms, cutting load times 40%." },
    });
    expect(appliedCount).toBe(1);
    expect(patchedText).toContain("• Built scalable Vue.js frontends serving 12 federal platforms, cutting load times 40%.");
    expect(patchedText).not.toContain("Built and maintained scalable frontend UIs");
    expect(patchedStructured!.experience[0].bullets[0]).toBe(
      "Built scalable Vue.js frontends serving 12 federal platforms, cutting load times 40%.",
    );
    // Untouched sibling bullet survives.
    expect(patchedStructured!.experience[0].bullets[1]).toContain("PostgreSQL schema");
  });

  it("patches project bullets by original-text match", () => {
    const { patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [{ originalBullet: "Open-source collaborative markdown editor." }],
      lineOverrides: { 0: "Shipped an open-source markdown editor with 1,200+ GitHub stars." },
    });
    expect(appliedCount).toBe(1);
    expect(patchedStructured!.projects[0].bullets[0]).toContain("1,200+ GitHub stars");
  });

  it("ignores no-op overrides and unmatched originals", () => {
    const noop = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [{ originalBullet: "Built and maintained scalable frontend UIs in Vue.js for federal platforms." }],
      lineOverrides: { 0: "Built and maintained scalable frontend UIs in Vue.js for federal platforms." },
    });
    expect(noop.appliedCount).toBe(0);
    expect(noop.patchedText).toBe(extractedText);

    const unmatched = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [{ originalBullet: "A bullet that is not in the resume at all." }],
      lineOverrides: { 0: "Replacement text." },
    });
    expect(unmatched.appliedCount).toBe(0);
    expect(unmatched.patchedText).toBe(extractedText);
  });

  it("applies the summary override to both text and structured summary", () => {
    const { patchedText, patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [],
      lineOverrides: {},
      summaryOverride: "Senior Full Stack Engineer specializing in low-latency SaaS platforms.",
    });
    expect(appliedCount).toBe(1);
    expect(patchedStructured!.summary).toBe("Senior Full Stack Engineer specializing in low-latency SaaS platforms.");
    expect(patchedText).toContain("Senior Full Stack Engineer specializing in low-latency SaaS platforms.");
    expect(patchedText).not.toContain("Full Stack Engineer with 5+ years of experience.");
  });

  it("drops a hidden bullet from structured experience and the flat text", () => {
    const { patchedText, patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [],
      lineOverrides: {},
      hiddenBulletTexts: ["Designed a PostgreSQL schema supporting a high-traffic CMS."],
    });
    expect(appliedCount).toBeGreaterThanOrEqual(1);
    expect(patchedStructured!.experience[0].bullets).toHaveLength(1);
    expect(patchedStructured!.experience[0].bullets[0]).toContain("Vue.js");
    expect(patchedText).not.toContain("PostgreSQL schema supporting a high-traffic CMS");
    // Sibling content untouched.
    expect(patchedText).toContain("Vue.js for federal platforms");
  });

  it("hiding + rewrite compose (hide one bullet, rewrite the sibling)", () => {
    const { patchedText, patchedStructured } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: structured,
      analysisBullets: [
        { originalBullet: "Built and maintained scalable frontend UIs in Vue.js for federal platforms." },
      ],
      lineOverrides: { 0: "Built Vue.js frontends for 12 federal platforms, cutting load times 40%." },
      hiddenBulletTexts: ["Designed a PostgreSQL schema supporting a high-traffic CMS."],
    });
    expect(patchedStructured!.experience[0].bullets).toEqual([
      "Built Vue.js frontends for 12 federal platforms, cutting load times 40%.",
    ]);
    expect(patchedText).toContain("cutting load times 40%");
    expect(patchedText).not.toContain("PostgreSQL schema supporting");
  });

  it("hides from a null structured resume via the flat text only", () => {
    const { patchedText, patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: null,
      analysisBullets: [],
      lineOverrides: {},
      hiddenBulletTexts: ["Open-source collaborative markdown editor."],
    });
    expect(appliedCount).toBeGreaterThanOrEqual(1);
    expect(patchedStructured).toBeNull();
    expect(patchedText).not.toContain("Open-source collaborative markdown editor");
  });

  it("handles a null structured resume (text-only patch)", () => {
    const { patchedText, patchedStructured, appliedCount } = patchAppliedEditsIntoResume({
      extractedText,
      structuredResume: null,
      analysisBullets: [{ originalBullet: "Designed a PostgreSQL schema supporting a high-traffic CMS." }],
      lineOverrides: { 0: "Designed a PostgreSQL schema serving 100,000+ users with sub-second queries." },
    });
    expect(appliedCount).toBe(1);
    expect(patchedStructured).toBeNull();
    expect(patchedText).toContain("100,000+ users");
  });
});
