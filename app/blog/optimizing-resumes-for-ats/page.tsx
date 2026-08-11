import Link from "next/link";
import BlogArticleLayout, { Section, List, CTACard } from "@/components/blog/BlogArticleLayout";
import {
  ATS_GUIDE_ATTRIBUTION,
  ATS_GUIDE_DONTS,
  ATS_GUIDE_DOS,
  ATS_GUIDE_FORMAT_CHECKLIST,
  ATS_GUIDE_TOP_TIPS,
} from "@/lib/atsBestPracticesContent";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";

export const metadata = createBlogPostMetadata("optimizing-resumes-for-ats");

export default function OptimizingResumesForAtsPage() {
  return (
    <BlogArticleLayout
      slug="optimizing-resumes-for-ats"
      title="Optimizing Résumés for Applicant Tracking Systems"
      subtitle={`Guidance adapted from the ${ATS_GUIDE_ATTRIBUTION.org}. Resunova’s ATS panel applies the detectable rules to your exported PDF.`}
    >
      <p style={{ margin: "0 0 24px" }}>
        Applicant tracking systems extract plain text from your file and map it into fields recruiters search.
        Fancy layouts often parse poorly even when they look great to humans.
      </p>

      <Section title="Top tips">
        <List items={ATS_GUIDE_TOP_TIPS.map((item) => ({ text: item.text }))} />
      </Section>

      <Section title="Format checklist">
        <List items={ATS_GUIDE_FORMAT_CHECKLIST.map((item) => ({ text: item.text }))} />
      </Section>

      <Section title="Do">
        <List items={ATS_GUIDE_DOS.map((item) => ({ text: item.text }))} />
      </Section>

      <Section title="Don’t">
        <List items={ATS_GUIDE_DONTS.map((item) => ({ text: item.text }))} />
      </Section>

      <CTACard
        heading="Check your resume against these rules"
        body="Resunova's free ATS checker reads your PDF the way a parser does and flags the formatting, heading, and keyword problems on this page. No account needed."
        href="/ats-resume-checker/"
        cta="Run a free ATS check"
      />

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
        Source:{" "}
        <a href={ATS_GUIDE_ATTRIBUTION.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
          {ATS_GUIDE_ATTRIBUTION.org}
        </a>
        . For parsing research and the 25–35 keyword band, see{" "}
        <Link href="/blog/how-ats-really-works" style={{ color: "var(--accent)" }}>
          How ATS really works
        </Link>
        .
      </p>
    </BlogArticleLayout>
  );
}
