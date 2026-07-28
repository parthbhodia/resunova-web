import { RESUME_EXAMPLES_DATA } from "@/components/ResumeExamplesData";
import type { TBResumeData, TBStylePreset } from "@/components/TemplateBuilder/types";

export type ResumeCatalogExample = {
  title: string;
  category: string;
  level: string;
  desc: string;
  score: number;
  tags: string[];
  data: TBResumeData;
  isTealDemo?: boolean;
};

function builderPresetFor(level?: string): TBStylePreset {
  if (level === "Executive" || level === "Lead") return "executive";
  if (level === "Entry Level") return "classic";
  return "modern";
}

export const PUBLIC_RESUME_EXAMPLES: ResumeCatalogExample[] = RESUME_EXAMPLES_DATA.map((example: any) => {
  const isTeal = Boolean(
    example.isTealDemo ||
    (example.data?.customization?.stylePreset && String(example.data.customization.stylePreset).startsWith("teal-"))
  );
  return {
    title: example.title,
    category: example.category,
    level: example.level || "Professional",
    desc: example.desc || example.description || "",
    score: example.score || 85,
    tags: example.tags || [],
    isTealDemo: isTeal,
    data: {
      ...example.data,
      profile: {
        ...example.data?.profile,
        name: example.data?.profile?.name || "Sample Candidate",
        email: example.data?.profile?.email || "candidate@example.com",
        phone: example.data?.profile?.phone || "",
        website: example.data?.profile?.website || "",
        linkedin: example.data?.profile?.linkedin || "",
        github: example.data?.profile?.github || "",
      },
      workExperiences: (example.data?.workExperiences || []).map((experience: any, index: number) => ({
        ...experience,
        id: `sample-work-${index + 1}`,
        bullets: (experience.bullets || "").replace(/\\n/g, "\n"),
      })),
      educations: (example.data?.educations || []).map((education: any, index: number) => ({
        ...education,
        id: `sample-education-${index + 1}`,
      })),
      projects: (example.data?.projects || []).map((project: any, index: number) => ({
        ...project,
        id: `sample-project-${index + 1}`,
      })),
      customization: {
        ...example.data?.customization,
        stylePreset: isTeal ? example.data.customization.stylePreset : builderPresetFor(example.level),
      },
    },
  };
});
