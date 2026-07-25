import { beforeEach, describe, expect, it } from "vitest";
import { prefillPrepFromTailor } from "@/lib/interviewPrepLaunch";
import { useInterviewPrepStore } from "@/store/interviewPrepStore";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

const structured: StructuredResume = {
  full_name: "Parth Bhodia",
  headline: "Senior Fullstack Developer",
  location: "Jersey City",
  email: "p@example.com",
  phone: "",
  linkedin: "",
  github: "",
  summary: "",
  skills: [{ category: "Languages", items: ["Python", "TypeScript"] }],
  experience: [],
  education: [],
  projects: [],
  extra_sections: [],
};

describe("prefillPrepFromTailor", () => {
  beforeEach(() => {
    useInterviewPrepStore.getState().reset();
  });

  it("carries résumé, job description, company and role across", () => {
    prefillPrepFromTailor({
      resumeText: "Senior Fullstack Developer with 7 years…",
      structured,
      jobDescription: "We are hiring a Software Engineer III…",
      company: "Google",
      role: "Software Engineer III",
    });

    const s = useInterviewPrepStore.getState();
    expect(s.company).toBe("Google");
    expect(s.role).toBe("Software Engineer III");
    expect(s.jobDescription).toBe("We are hiring a Software Engineer III…");
    expect(s.extractedText).toBe("Senior Fullstack Developer with 7 years…");
    expect(s.structuredResume).toEqual(structured);
  });

  it("names the résumé after the company so the prep screen is not anonymous", () => {
    prefillPrepFromTailor({
      resumeText: "…", structured: null, jobDescription: "", company: "Google", role: "",
    });
    expect(useInterviewPrepStore.getState().fileName).toBe("Résumé for Google");
  });

  it("falls back to a generic name when there is no company", () => {
    prefillPrepFromTailor({
      resumeText: "…", structured: null, jobDescription: "", company: "  ", role: "",
    });
    expect(useInterviewPrepStore.getState().fileName).toBe("Your tailored résumé");
  });

  it("leaves the résumé unset when Tailor has neither text nor structure", () => {
    prefillPrepFromTailor({
      resumeText: "   ", structured: null, jobDescription: "JD", company: "Google", role: "SWE",
    });
    const s = useInterviewPrepStore.getState();
    expect(s.fileName).toBeNull();
    expect(s.extractedText).toBe("");
    expect(s.structuredResume).toBeNull();
    expect(s.company).toBe("Google");
  });

  it("clears any earlier session so a second tailor run does not inherit it", () => {
    useInterviewPrepStore.getState().setCompany("Old Corp");
    useInterviewPrepStore.getState().setSessionId("stale-session");

    prefillPrepFromTailor({
      resumeText: "…", structured, jobDescription: "JD", company: "Google", role: "SWE",
    });

    const s = useInterviewPrepStore.getState();
    expect(s.company).toBe("Google");
    expect(s.sessionId).toBeNull();
  });
});
