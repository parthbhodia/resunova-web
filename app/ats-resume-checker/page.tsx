import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";

const CANONICAL = `${SITE_URL}/ats-resume-checker/`;

export const metadata: Metadata = {
  title: "Free ATS Resume Checker — Score Your Resume Instantly",
  description:
    "Check your resume against applicant tracking system (ATS) rules for free. Upload your PDF and get an instant score across ATS compatibility, keywords, quantified impact, and formatting — plus the exact fixes to pass.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Free ATS Resume Checker — Score Your Resume Instantly",
    description:
      "Upload your resume and get an instant ATS score with the fixes to pass. Completely free.",
  },
};

export const dynamic = "force-static";

/** The dimensions the Resunova analyzer scores — kept generic but faithful to the product. */
const SCORING_DIMENSIONS: { name: string; blurb: string }[] = [
  { name: "ATS compatibility", blurb: "Whether a parser can read your contact info, headings, and layout without choking on columns, tables, or graphics." },
  { name: "Keyword match", blurb: "How well your resume reflects the skills and terms recruiters and ATS filters actually search for in your field." },
  { name: "Quantified impact", blurb: "Whether your bullets carry real numbers — %, $, counts, scale — instead of vague duties." },
  { name: "Achievement quality", blurb: "Whether bullets lead with a strong verb and end in an outcome, not a list of responsibilities." },
  { name: "Language quality", blurb: "Pronouns, filler, tense, and clichés that weaken otherwise good experience." },
  { name: "Readability", blurb: "Bullet length and density — can a recruiter scan it in the six seconds they actually spend?" },
  { name: "Section structure", blurb: "Standard, well-ordered headings an ATS recognizes (Experience, Education, Skills…)." },
];

const ATS_CHECKS: string[] = [
  "Standard section headings the parser recognizes",
  "A single-column layout (multi-column resumes scramble in many ATS)",
  "Real text, not text baked into an image or graphic",
  "Contact details in the body, not the header/footer region some parsers drop",
  "Job titles and dates in a consistent, parseable format",
  "Keywords from the job description, in context — not stuffed",
];

const FAQ: { question: string; answer: string }[] = [
  {
    question: "What is an ATS resume checker?",
    answer:
      "An ATS resume checker scores your resume the way an applicant tracking system would read it — testing whether the software can parse your sections, contact info, and keywords, and flagging formatting that gets resumes filtered out before a human sees them.",
  },
  {
    question: "Is Resunova's ATS resume checker free?",
    answer:
      "Yes. Upload your resume and get a full score and fix list for free — no credit card. Resunova is built for students and the job-seeking community.",
  },
  {
    question: "What is a good ATS resume score?",
    answer:
      "Aim for 80+ out of 100. Below that usually means missing metrics, weak verb-led bullets, non-standard formatting, or a keyword gap against your target role — all of which the checker pinpoints with specific fixes.",
  },
  {
    question: "Will an ATS-friendly resume actually pass the filter?",
    answer:
      "ATS rarely auto-rejects — it ranks and surfaces. An ATS-friendly resume parses cleanly and matches the role's keywords, so you land higher in the recruiter's search results instead of buried. The checker scores both parseability and keyword match.",
  },
  {
    question: "How long does the check take?",
    answer:
      "Seconds. Upload a PDF and you'll see your score, the weakest bullets, and the top fixes right away — then you can tailor and download an ATS-friendly version.",
  },
];

export default function AtsResumeCheckerPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Resunova ATS Resume Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free ATS resume checker that scores your resume on parseability, keywords, quantified impact, and formatting, with specific fixes.",
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "ATS Resume Checker", item: CANONICAL },
    ],
  };

  const sectionTitle = {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: -0.4,
    margin: "0 0 12px",
  } as const;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <JsonLd data={[softwareJsonLd, faqJsonLd, breadcrumbJsonLd]} />

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 56,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <LogoFull markSize={26} textColor="var(--text)" />
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
          <Link href="/resume-examples" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Resume Examples
          </Link>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            App
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 100px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--dim)", marginBottom: 18 }}>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Home
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--muted)" }}>ATS Resume Checker</span>
        </nav>

        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 12,
          }}
        >
          Free tool
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, margin: "0 0 16px" }}>
          Free ATS resume checker
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--muted)",
            lineHeight: 1.7,
            margin: "0 0 28px",
          }}
        >
          Upload your resume and get an instant score for how an applicant tracking system reads it — parseability,
          keywords, quantified impact, and formatting — with the specific fixes to climb the recruiter&rsquo;s search
          results. Completely free, no credit card.
        </p>

        {/* Primary CTA */}
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "13px 24px",
            borderRadius: 12,
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
            marginBottom: 44,
          }}
        >
          Check my resume free →
        </Link>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>What an ATS actually checks</h2>
            <p style={{ margin: "0 0 16px" }}>
              An applicant tracking system parses your resume into structured fields, then lets recruiters search and
              rank candidates. It rarely auto-rejects — but a resume it can&rsquo;t read, or one that misses the
              role&rsquo;s keywords, sinks to the bottom of the results. The big things it cares about:
            </p>
            <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {ATS_CHECKS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>How Resunova scores your resume</h2>
            <p style={{ margin: "0 0 18px" }}>
              Resunova reads your PDF the way a parser does, then scores it across the dimensions recruiters and ATS
              filters actually weigh — and shows you the weakest bullets with a rewrite for each.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SCORING_DIMENSIONS.map((d) => (
                <div
                  key={d.name}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{d.name}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>{d.blurb}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>ATS resume checker FAQ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {FAQ.map((f) => (
                <div key={f.question}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{f.question}</h3>
                  <p style={{ margin: 0 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              marginBottom: 40,
              padding: "22px 24px",
              borderRadius: 14,
              border: "1px solid var(--accent)",
              background: "var(--accent-bg)",
            }}
          >
            <h2 style={{ ...sectionTitle, margin: "0 0 8px" }}>Score your resume now</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Upload your PDF and see your ATS score, weakest bullets, and the fixes to pass — in under a minute, free.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                padding: "10px 18px",
                borderRadius: 10,
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Check my resume free →
            </Link>
          </section>

          <p style={{ fontSize: 13, color: "var(--dim)" }}>
            Want examples first? See{" "}
            <Link href="/resume-examples" style={{ color: "var(--accent)" }}>
              resume examples by role
            </Link>{" "}
            or read our{" "}
            <Link href="/blog/how-ats-really-works" style={{ color: "var(--accent)" }}>
              guide to how ATS really works
            </Link>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
