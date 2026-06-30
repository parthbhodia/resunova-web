/**
 * Single source of truth for the homepage FAQ.
 *
 * Used in two places that must stay in sync:
 *   - app/page.tsx        → FAQPage JSON-LD (SEO / rich results)
 *   - components/HomeMarketingScroll.tsx → the visible <details> accordion
 *
 * Google flags FAQ rich results whose visible copy doesn't match the
 * structured data, so both render from this list.
 */
export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is Resunova free to use?",
    a: "Yes, Resunova is completely free for students and the broader job-seeking community. Upload your resume, paste any job description, and get a match score, gap analysis, and ATS-friendly PDF export — no credit card required.",
  },
  {
    q: "What is an ATS resume score?",
    a: "An ATS (Applicant Tracking System) score measures how well your resume matches a specific job description. Resunova scores keyword coverage, achievement quality, readability, language, and ATS formatting across 8 categories, then shows you exactly which bullets to improve.",
  },
  {
    q: "How does resume tailoring work in Resunova?",
    a: "Upload your resume PDF and paste the job description. Resunova's AI extracts keywords, scores your match, identifies gaps between your experience and the role's requirements, and suggests specific bullet-level rewrites. You can apply fixes directly in the editor and download the updated resume as a PDF.",
  },
  {
    q: "Does Resunova work with any job description?",
    a: "Yes — paste any text-based job description from any industry or role. Resunova dynamically extracts the requirements and keywords from the posting, so it adapts to engineering, design, finance, marketing, healthcare, and any other field.",
  },
  {
    q: "How long does it take to tailor a resume?",
    a: "Most users see their match score and gap analysis within 60 seconds of uploading. Applying the suggested fixes and downloading an updated PDF typically takes 5–15 minutes depending on how many changes are needed.",
  },
];
