import { RESUME_EXAMPLES_DATA } from "@/components/ResumeExamplesData";
import type { TBResumeData, TBStylePreset } from "@/components/TemplateBuilder/types";

export type ResumeCatalogExample = {
  title: string;
  category: string;
  level: string;
  desc: string;
  tags: string[];
  data: TBResumeData;
};

function builderPresetFor(level: string): TBStylePreset {
  if (level === "Executive" || level === "Lead") return "executive";
  if (level === "Entry Level") return "classic";
  return "modern";
}

export const PUBLIC_RESUME_EXAMPLES: ResumeCatalogExample[] = RESUME_EXAMPLES_DATA.map((example) => ({
  title: example.title,
  category: example.category,
  level: example.level,
  desc: example.desc,
  tags: example.tags,
  data: {
    ...example.data,
    profile: {
      ...example.data.profile,
      name: "Sample Candidate",
      email: "candidate@example.com",
      phone: "",
      website: "",
      linkedin: "",
      github: "",
    },
    workExperiences: example.data.workExperiences.map((experience, index) => ({
      ...experience,
      id: `sample-work-${index + 1}`,
      bullets: experience.bullets.replace(/\\n/g, "\n"),
    })),
    educations: example.data.educations.map((education, index) => ({
      ...education,
      id: `sample-education-${index + 1}`,
    })),
    projects: example.data.projects.map((project, index) => ({
      ...project,
      id: `sample-project-${index + 1}`,
    })),
    customization: {
      ...example.data.customization,
      stylePreset: builderPresetFor(example.level),
    },
  },
}));
