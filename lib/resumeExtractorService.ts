import { apiUrl } from "./utils";

export type ExtractedExperience = {
  company: string;
  role: string;
  dates: string;
  location: string;
  bullets: string[];
  /** Free-text override typed in the profile editor; takes priority over `bullets` for display. */
  description?: string;
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
  /** Free-text override typed in the profile editor. */
  description?: string;
};

export type ExtractedProfileState = {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  headline: string;
  summary: string;
  linkedin: string;
  github: string;
  portfolio: string;
  /** Free-text job-preferences note, set from the profile dashboard's edit modal. */
  preferences: string;
  /** Free-text tailoring-defaults note, set from the profile dashboard's edit modal. */
  tailoring: string;
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
  linkedin: "",
  github: "",
  portfolio: "",
  preferences: "",
  tailoring: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

/** Shape of `structuredResume` as returned by `/api/upload-resume`
 * (see `_resume_doc_to_dict` in resunova-api's `extract/structured_doc.py`). */
type RawSkillGroup = { category?: string; items?: string[] };
type RawStructuredResume = {
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  role?: string;
  headline?: string;
  summary?: string;
  linkedin?: string;
  github?: string;
  skills?: Array<string | RawSkillGroup>;
  experience?: ExtractedExperience[];
  education?: ExtractedEducation[];
  projects?: ExtractedProject[];
};

/**
 * Uploads a resume and returns the parsed structured data.
 */
export async function extractResumeData(file: File): Promise<ExtractedProfileState> {
  const formData = new FormData();
  formData.append("file", file);

  const resp = await fetch(apiUrl("/api/upload-resume"), {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const errorJson = await resp.json().catch(() => ({}));
    throw new Error(errorJson.error || "Failed to extract resume data");
  }

  const json = await resp.json();
  const sr = json.structuredResume as RawStructuredResume | undefined;

  if (!sr) {
    throw new Error(
      "Unable to perform structured extraction on this resume. Try a different format.",
    );
  }

  return {
    name: sr.full_name || sr.name || "",
    email: sr.email || "",
    phone: sr.phone || "",
    location: sr.location || "",
    role: sr.role || sr.headline || "",
    headline: sr.headline || "",
    summary: sr.summary || "",
    linkedin: sr.linkedin || "",
    github: sr.github || "",
    portfolio: "",
    preferences: "",
    tailoring: "",
    skills: Array.isArray(sr.skills)
      ? sr.skills.flatMap((s) =>
          typeof s === "string" ? [s] : Array.isArray(s.items) ? s.items : [],
        )
      : [],
    experience: sr.experience || [],
    education: sr.education || [],
    projects: sr.projects || [],
  };
}
