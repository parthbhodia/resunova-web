import { TBResumeData } from "@/components/TemplateBuilder/types";

export interface ResumeExample {
  id: string;
  persona: {
    name: string;
    location: string;
    email: string;
  };
  headline: string;
  resumeData: TBResumeData;
  critique: string;
}

export interface RolePageData {
  slug: string;
  title: string;
  category: string;
  pageTitle: string;
  metaDescription: string;
  
  marketInsights: {
    medianSalary: string;
    education: string;
    yearsExperience: string;
    workStyle: string;
    careerPath: string;
    certifications: string[];
  };

  examples: ResumeExample[];

  writingGuide: {
    intro: string;
    tips: string[];
    headlineExamples: { strong: string; weak: string; explanation?: string }[];
    summaryExamples: { strong: string; weak: string; explanation?: string }[];
    bulletGuidance: string;
    expertQuote: string;
    faq: { q: string; a: string }[];
    relatedRoles: { title: string; slug: string }[];
  };
}
