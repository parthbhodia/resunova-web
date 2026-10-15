import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleLayout, { Section, List } from "@/components/blog/BlogArticleLayout";
import { BLOG_RSS_URL } from "@/lib/atsBlogPosts";
import { SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How We Measure",
  description:
    "The corpus behind Resunova's job-market research: where the postings come from, how requirements and salaries are extracted, what the numbers exclude, and how to cite the findings.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/blog/methodology/",
    types: { "application/rss+xml": BLOG_RSS_URL },
  },
  openGraph: {
    type: "article",
    url: `${SITE_URL}/blog/methodology/`,
    siteName: "Resunova",
    title: "How We Measure: Resunova Research Methodology",
    description:
      "Where our job-postings corpus comes from, how requirements and salaries are extracted, and what the figures exclude.",
  },
};

export default function BlogMethodologyPage() {
  return (
    <BlogArticleLayout
      title="How We Measure"
      subtitle="Every data post on this blog is queried against one corpus of live job postings. This page describes that corpus once, so each post can link here instead of restating it, and so anyone checking our numbers can see the limits before they cite them."
    >
      <Section title="Where the postings come from">
        <p style={{ margin: "0 0 14px" }}>
          Postings are pulled directly from each company&apos;s own public applicant tracking system or career-site
          API (Greenhouse, Ashby, Lever, Workday, iCIMS, SmartRecruiters, and others), not scraped from job boards
          and not bought from a data vendor. That matters for two reasons: the text is the employer&apos;s own, and a
          posting disappears from our corpus when the employer takes it down rather than when an aggregator gets
          around to noticing.
        </p>
        <p style={{ margin: 0 }}>
          The corpus refreshes several times a day and holds roughly 270,000 active postings, of which the US subset
          is what our research reports on. Individual posts quote the exact active count on the day they were
          measured, because that number moves with the crawl cycle.
        </p>
      </Section>

      <Section title="Deduplication">
        <p style={{ margin: "0 0 14px" }}>
          The same job is frequently posted many times: one description replicated across hundreds of store or
          branch locations. We collapse these by an exact match on the job-description text (an MD5 hash of the raw
          body), and the pass runs server-side after every scan.
        </p>
        <p style={{ margin: 0 }}>
          Exact matching is the conservative choice and it undercounts. Two postings for the same role worded
          differently are not treated as duplicates, so the true rate of phantom volume in any job board, ours
          included, is higher than the figure we report. We would rather understate it than merge two genuinely
          different jobs.
        </p>
      </Section>

      <Section title="How requirements are extracted">
        <p style={{ margin: "0 0 14px" }}>
          Each posting gets one language-model pass that turns its description into a typed requirement graph: each
          requirement classified as a technical skill, tool, certification, license, degree, domain knowledge, or
          years of experience, and marked required or preferred. When a post says a posting &quot;asks for 13 things,&quot;
          that is the count of extracted requirements typed as hard requirements.
        </p>
        <p style={{ margin: 0 }}>
          This is an approximation, not a hand-audited count. The extraction runs once per posting and is not
          reviewed by a human. Coverage is high (99.7% on the S&amp;P 100 cut), but the per-posting count should be
          read as an estimate. We do not re-extract a corpus with a different model mid-analysis, because
          requirement counts are not comparable across extraction models.
        </p>
      </Section>

      <Section title="How salary is read">
        <List
          items={[
            { text: "The midpoint of the posted US range, base pay only." },
            { text: "Sanity bounds of $30,000 to $900,000; anything outside is dropped rather than winsorized." },
            { text: "Hourly rates are annualized at 2,080 hours." },
            {
              text: "No equity, bonus, or benefits. Companies that pay heavily in stock therefore read low, and we do not correct for it.",
            },
            {
              text: "A posting counts as disclosing pay if it carries a figure either as structured data or stated in the description text.",
            },
          ]}
        />
      </Section>

      <Section title="Outside data we use">
        <p style={{ margin: 0 }}>
          Where a post compares advertised pay against what employers report to the government, the comparison uses
          the public Department of Labor H-1B LCA disclosure file (roughly one million rows for FY2026), matched to
          employers by normalized name. Those filings are historical while postings are current, so part of any gap
          between the two is timing and seniority mix rather than a discrepancy. Posts that use borrowed survey
          figures name the survey, its sample, and its publication date inline.
        </p>
      </Section>

      <Section title="What the corpus does not cover">
        <List
          items={[
            {
              text: "Companies on closed career portals (Apple, Google, Meta, and Microsoft among them) publish through systems our pipeline does not read. They are excluded from counts rather than estimated.",
            },
            {
              text: "This is each company's public careers pipeline, not every internal requisition. Roles filled without a public posting are invisible to us, as they are to every job seeker.",
            },
            {
              text: "Role and industry classification is done by title pattern matching, which is a rough cut: it misses some roles and catches some adjacent ones. Posts say so where a cut depends on it.",
            },
            { text: "Non-US postings are excluded from US figures by a location classifier, which is not perfect at the margins." },
          ]}
        />
      </Section>

      <Section title="Corrections">
        <p style={{ margin: 0 }}>
          If a figure here is wrong we would rather know. Posts carry a published and, where it applies, an updated
          date, and a material correction gets a note in the post itself rather than a silent edit.{" "}
          <Link href="/contact/" style={{ color: "var(--accent)" }}>
            Tell us what looks off
          </Link>
          .
        </p>
      </Section>

      <Section title="Citing this research">
        <p style={{ margin: "0 0 14px" }}>
          Journalists and researchers are welcome to quote any figure on this blog. Please link to the specific post
          rather than the blog index, so readers can reach the methodology note attached to that number. A cut we
          have not published (by role family, industry, or metro) is usually a query rather than a project;{" "}
          <Link href="/contact/" style={{ color: "var(--accent)" }}>
            ask
          </Link>
          .
        </p>
        <p
          style={{
            margin: 0,
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--muted)",
          }}
        >
          Resunova. &quot;[Post title].&quot; Resunova Blog, [date]. {SITE_URL}/blog/[slug]/
        </p>
      </Section>

      <Section title="Following the research">
        <p style={{ margin: 0 }}>
          New findings go out by{" "}
          <a href={BLOG_RSS_URL} style={{ color: "var(--accent)" }}>
            RSS
          </a>{" "}
          and to the list below, and every post is indexed on the{" "}
          <Link href="/blog/" style={{ color: "var(--accent)" }}>
            blog
          </Link>
          .
        </p>
      </Section>
    </BlogArticleLayout>
  );
}
