// Maps an Analyze-flow StructuredResume into the Career-Profile
// ExtractedProfileState, so a finished analysis can be saved to the user's
// Profile in one tap (Profile-plan trigger #1 / Slice 5 of
// docs/ANALYZE_REFACTOR_PLAN.md). Pure + testable; the save IO lives in the
// SaveToProfilePrompt component.

import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { type ExtractedProfileState, INITIAL_EXTRACTED_PROFILE } from "@/lib/resumeExtractorService";

export function extractedProfileFromStructured(sr: StructuredResume): ExtractedProfileState {
  return {
    ...INITIAL_EXTRACTED_PROFILE,
    name: sr.full_name || "",
    email: sr.email || "",
    phone: sr.phone || "",
    location: sr.location || "",
    role: sr.headline || "",
    headline: sr.headline || "",
    summary: sr.summary || "",
    linkedin: sr.linkedin || "",
    github: sr.github || "",
    portfolio: "",
    skills: (sr.skills || []).flatMap((s) => s.items || []),
    experience: (sr.experience || []).map((e) => ({
      company: e.company || "",
      role: e.role || "",
      dates: e.dates || "",
      location: e.location || "",
      bullets: e.bullets || [],
    })),
    education: (sr.education || []).map((e) => ({
      institution: e.institution || "",
      degree: e.degree || "",
      dates: e.dates || "",
      bullets: e.bullets || [],
    })),
    projects: (sr.projects || []).map((p) => ({
      name: p.name || "",
      tech: p.tech || "",
      bullets: p.bullets || [],
    })),
  };
}

/** Stable-ish identity for a résumé so the prompt doesn't re-nag after the user
 * already saved or dismissed the same one. */
export function resumeFingerprint(sr: StructuredResume): string {
  return `${(sr.full_name || "").trim().toLowerCase()}|${(sr.email || "").trim().toLowerCase()}`;
}
