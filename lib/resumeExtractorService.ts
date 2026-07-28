import { apiUrl } from "./utils";
import { apiFetch } from "@/lib/apiClient";

export type ExtractedExperience = {
  company: string;
  role: string;
  dates: string;
  location: string;
  bullets: string[];
};

export type ExtractedEducation = {
  institution: string;
  degree: string;
  dates: string;
  bullets: string[];
};

export type ExtractedProject = {
  name: string;
  tech: string;
  bullets: string[];
};

export type ExtractedProfileState = {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  projects: ExtractedProject[];
};

export const INITIAL_EXTRACTED_PROFILE: ExtractedProfileState = {
  name: "",
  email: "",
  phone: "",
  location: "",
  role: "",
  headline: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

/**
 * Uploads a resume and returns the parsed structured data
 */
export async function extractResumeData(file: File): Promise<ExtractedProfileState> {
  const formData = new FormData();
  formData.append("file", file);
  // Optional: add defer_analysis=1 to get faster response if available
  formData.append("defer_analysis", "1");

  const resp = await apiFetch("/api/upload-resume", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const errorJson = await resp.json().catch(() => ({}));
    throw new Error(errorJson.error || "Failed to extract resume data");
  }

  const json = await resp.json();

  if (!json.structuredResume) {
    // Attempt fallback from basic hints if backend failed to produce a structured doc
    const text = json.extractedText || json.text || "";
    if (text) {
        throw new Error("Unable to perform structured extraction on this resume. Try a different format.");
    }
    throw new Error("No structured data returned from AI");
  }

  const sr = json.structuredResume;

  return {
    name: sr.full_name || sr.name || "",
    email: sr.email || "",
    phone: sr.phone || "",
    location: sr.location || "",
    role: sr.role || sr.headline || "",
    headline: sr.headline || "",
    summary: sr.summary || "",
    skills: Array.isArray(sr.skills) 
      ? sr.skills.flatMap((s: any) => typeof s === 'string' ? [s] : (s.items && Array.isArray(s.items) ? s.items : [JSON.stringify(s)])) 
      : [],
    experience: sr.experience || [],
    education: sr.education || [],
    projects: sr.projects || [],
  };
}
