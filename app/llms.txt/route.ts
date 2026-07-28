import { SITE_URL } from "@/lib/brand";
import { BLOG_POSTS } from "@/lib/atsBlogPosts";
import { COMPARISONS, comparisonHref } from "@/lib/competitorComparison";
import { ROLE_RESUME_DATA, roleResumeHref } from "@/lib/roleResumeData";

export const dynamic = "force-static";

export function GET(): Response {
  const blogLines = BLOG_POSTS.map(
    (p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}/): ${p.description}`,
  ).join("\n");

  const compareLines = COMPARISONS.map(
    (c) => `- [Resunova vs ${c.competitor}](${SITE_URL}${comparisonHref(c.slug)}/): feature and pricing comparison, verified as of ${c.asOf}`,
  ).join("\n");

  const roleLines = ROLE_RESUME_DATA.map(
    (r) => `- [${r.label} resume example](${SITE_URL}${roleResumeHref(r.slug)}/)`,
  ).join("\n");

  const body = `# Resunova

> Resunova is an AI resume tailoring platform. It scores a resume against a specific job description using a deterministic match model built from a corpus of real US job postings, then helps rewrite bullets honestly (no keyword stuffing), checks ATS parseability, and surfaces live job postings with disclosed salary, H-1B sponsorship, and skill requirements.

Key facts:
- Free ATS resume checker at ${SITE_URL}/ats-resume-checker/
- Resume template builder at ${SITE_URL}/template-builder/
- Match scoring and tailoring are grounded in analysis of 100,000+ active US job postings, refreshed daily
- Data research (salary transparency, hiring trends) is published on the blog with methodology notes

## Blog and research

${blogLines}

## Product pages

- [ATS resume checker](${SITE_URL}/ats-resume-checker/): free instant check of how applicant tracking systems parse a resume PDF
- [Resume template builder](${SITE_URL}/template-builder/): ATS-safe resume templates
- [Resume examples](${SITE_URL}/resume-examples/): role-specific resume examples with real posting data

## Comparisons

${compareLines}

## Resume examples by role

${roleLines}

## Legal

- [Terms](${SITE_URL}/terms/)
- [Privacy](${SITE_URL}/privacy/)
- [Contact](${SITE_URL}/contact/)
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
