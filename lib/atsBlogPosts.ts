/** Blog index metadata for ATS / career content. */

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  readMinutes: number;
  tag: string;
  publishedAt?: string;
};

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "salary-transparency-by-seniority",
    title: "The Higher the Job, the More They Hide the Pay",
    description:
      "Salary disclosure across 109,159 active US postings: entry-level roles list pay 41% of the time, directors 14%. The gap survives industry controls, and it changes how you should job hunt.",
    readMinutes: 5,
    tag: "Data",
    publishedAt: "2026-07-14",
  },
  {
    slug: "sp100-tech-hiring-2026",
    title: "What 13,128 Live Job Postings at S&P 100 Companies Reveal About Tech Hiring",
    description:
      "Live data from ~50 S&P 100 career APIs: remote is 3x rarer at the giants, the big-company pay premium is gone, and two companies advertise below their own federal wage filings.",
    readMinutes: 6,
    tag: "Data",
    publishedAt: "2026-07-06",
  },
  {
    slug: "tailor-resume-to-job-description",
    title: "How to Tailor Your Resume to a Job Description (Step-by-Step)",
    description:
      "Keyword extraction, bullet rewrites, ATS checks, and the mistakes that get you filtered out: a complete tailoring playbook.",
    readMinutes: 7,
    tag: "Guide",
    publishedAt: "2026-06-10",
  },
  {
    slug: "how-ats-really-works",
    title: "How ATS Really Works (And Why You're Invisible, Not Rejected)",
    description:
      "Parsing tests across Workday, Greenhouse, Lever, and more: exact job titles, keyword bands, layout traps, and the quick-fix checklist.",
    readMinutes: 8,
    tag: "Research",
    publishedAt: "2026-05-15",
  },
  {
    slug: "optimizing-resumes-for-ats",
    title: "Optimizing Résumés for Applicant Tracking Systems",
    description:
      "UIC Office of Career Services guidance: formatting, keywords in context, and what parsers can and cannot read.",
    readMinutes: 6,
    tag: "Guide",
    publishedAt: "2026-05-01",
  },
];

export function blogPostHref(slug: string): string {
  return `/blog/${slug}`;
}
