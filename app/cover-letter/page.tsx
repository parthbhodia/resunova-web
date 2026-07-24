import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";

const CANONICAL = `${SITE_URL}/cover-letter/`;

export const metadata: Metadata = {
  title: "Free AI Cover Letter Generator: Written From Your Resume",
  description:
    "Generate a tailored cover letter free. Paste the job description, and Resunova writes a letter grounded in your actual resume — no invented experience — then lets you edit every line and download a formatted PDF or DOCX.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: "Free AI Cover Letter Generator: Written From Your Resume",
    description:
      "Paste a job description, get a tailored cover letter grounded in your real resume. Edit every line, download PDF or DOCX. Free to start.",
  },
};

export const dynamic = "force-static";

const STEPS: { name: string; blurb: string }[] = [
  { name: "1 · Pick a template", blurb: "Clean, ATS-friendly letter layouts that match Resunova's resume templates, so your application looks like one document set." },
  { name: "2 · Paste the job description", blurb: "The generator reads the role's actual requirements, the same way Resunova's resume tailoring does." },
  { name: "3 · AI drafts from your resume", blurb: "The letter is grounded in the experience on your real resume — it connects your strongest bullets to the role instead of inventing generic filler." },
  { name: "4 · Edit and download", blurb: "Every line is editable in the live preview. Export a formatted PDF or DOCX that matches what you see." },
];

const DIFFERENTIATORS: string[] = [
  "Grounded in your resume: the AI works from your uploaded or built resume, not a blank page",
  "Tailored to the job description you paste, not a generic template letter",
  "WYSIWYG preview: the PDF you download is exactly what you see",
  "PDF and DOCX export, no watermark",
  "Free to start; no credit card",
];

const FAQ: { question: string; answer: string }[] = [
  {
    question: "Is Resunova's cover letter generator free?",
    answer:
      "Yes — you can build, edit, and download a cover letter free. AI drafting uses a free account (sign in with Google), and an optional Pro plan unlocks higher usage limits. No credit card required to start.",
  },
  {
    question: "How is this different from asking ChatGPT for a cover letter?",
    answer:
      "Two ways. First, the letter is grounded in your actual resume, so it cites your real experience instead of confident-sounding filler you have to fact-check. Second, you get a formatted, matching-template document — editable in a live preview and exported as a clean PDF or DOCX — not a wall of text to paste into Word.",
  },
  {
    question: "Should a cover letter repeat my resume?",
    answer:
      "No. A good letter picks the two or three strongest, most relevant points from your resume and connects them to what the job description asks for. That mapping — requirement to evidence — is exactly what the generator drafts for you.",
  },
  {
    question: "How long should a cover letter be?",
    answer:
      "Three to four short paragraphs on one page — roughly 250–350 words. Recruiters skim; the generator drafts tight letters by default and you can trim any line in the editor.",
  },
  {
    question: "Can I match my cover letter to my resume's design?",
    answer:
      "Yes. The template picker includes layouts styled to pair with Resunova's resume templates, so your resume and letter read as one consistent application.",
  },
];

export default function CoverLetterPage() {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Resunova Cover Letter Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: CANONICAL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free AI cover letter generator that drafts a tailored letter from your real resume and the job description, with editable preview and PDF/DOCX export.",
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
      { "@type": "ListItem", position: 2, name: "Cover Letter Generator", item: CANONICAL },
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
          <Link href="/ats-resume-checker" style={{ color: "var(--dim)", textDecoration: "none" }}>
            ATS Checker
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
          <span style={{ color: "var(--muted)" }}>Cover Letter Generator</span>
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
          Free AI cover letter generator
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--muted)",
            lineHeight: 1.7,
            margin: "0 0 28px",
          }}
        >
          Paste the job description and get a tailored cover letter written from your <em>actual resume</em> — your
          real experience mapped to the role&rsquo;s requirements, not generic filler. Edit every line in a live
          preview, then download a formatted PDF or DOCX. Free to start, no credit card.
        </p>

        {/* Primary CTA — deep-links into the in-app cover letter builder. */}
        <Link
          href="/?view=cover-letter"
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
          Write my cover letter free →
        </Link>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>How it works</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((s) => (
                <div
                  key={s.name}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 14, color: "var(--muted)" }}>{s.blurb}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>Why it beats a blank page (or a chatbot)</h2>
            <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {DIFFERENTIATORS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>Cover letter FAQ</h2>
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
            <h2 style={{ ...sectionTitle, margin: "0 0 8px" }}>Pair it with a tailored resume</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              A cover letter works best on top of a resume that already matches the job. Scan yours free, fix the
              weakest bullets, then generate the letter — all in one place.
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
              Scan my resume free →
            </Link>
          </section>

          <p style={{ fontSize: 13, color: "var(--dim)" }}>
            Want your resume in shape first? Try the{" "}
            <Link href="/ats-resume-checker" style={{ color: "var(--accent)" }}>
              free ATS resume checker
            </Link>{" "}
            or browse{" "}
            <Link href="/resume-examples" style={{ color: "var(--accent)" }}>
              resume examples by role
            </Link>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
