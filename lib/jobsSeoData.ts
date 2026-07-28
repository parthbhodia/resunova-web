import generated from "@/lib/jobsSeoData.generated.json";

export type PublicJob = {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  companyDomain: string;
  url: string;
  location: string;
  postedAt: string | null;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  workModel: string | null;
  employmentType: string | null;
  industry: string | null;
};

const data = generated as { generatedAt: string | null; jobs: PublicJob[] };

export const PUBLIC_JOBS = data.jobs;
export const JOBS_GENERATED_AT = data.generatedAt;

export function getPublicJob(id: string): PublicJob | undefined {
  return PUBLIC_JOBS.find((job) => job.id === id);
}

export function jobHref(id: string): string {
  return `/jobs/${encodeURIComponent(id)}`;
}
