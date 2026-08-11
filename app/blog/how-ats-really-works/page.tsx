import Link from "next/link";
import BlogArticleLayout, { Section, List, CTACard } from "@/components/blog/BlogArticleLayout";
import { RESEARCH_QUICK_CHECKLIST } from "@/lib/atsBestPracticesContent";
import { createBlogPostMetadata } from "@/lib/atsBlogPosts";
import { ATS_RESEARCH_SECTIONS } from "@/lib/atsResearchContent";

export const metadata = createBlogPostMetadata("how-ats-really-works");

export default function HowAtsReallyWorksPage() {
  return (
    <BlogArticleLayout
      slug="how-ats-really-works"
      title="How ATS Really Works (And Why You’re Invisible, Not Rejected)"
      subtitle="What systematic parsing tests across Workday, Greenhouse, Lever, iCIMS, Taleo, and similar systems suggest, and how Resunova checks your PDF against these patterns."
    >
      {ATS_RESEARCH_SECTIONS.map((sec) => (
        <Section key={sec.title} title={sec.title}>
          {sec.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: "0 0 14px" }}>{p}</p>
          ))}
        </Section>
      ))}

      <Section title="TL;DR: quick-fix checklist">
        <List items={RESEARCH_QUICK_CHECKLIST.map((item) => ({ text: item.text }))} />
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--dim)" }}>
          Run an ATS check in Resunova after tailoring. The <strong style={{ color: "var(--text)" }}>ATS best practices</strong> panel
          scores many of these items automatically from your PDF text.
        </p>
      </Section>

      <CTACard
        heading="Check your resume against these rules"
        body="Resunova's free ATS checker reads your PDF the way a parser does and flags the formatting, heading, and keyword problems on this page. No account needed."
        href="/ats-resume-checker/"
        cta="Run a free ATS check"
      />

      <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 24 }}>
        Also see our{" "}
        <Link href="/blog/optimizing-resumes-for-ats" style={{ color: "var(--accent)" }}>
          UIC formatting guide
        </Link>{" "}
        for university career-center dos and don’ts.
      </p>
    </BlogArticleLayout>
  );
}
