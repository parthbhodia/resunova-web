import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import {
  ROLE_RESUME_DATA,
  ROLE_DATA_LAST_UPDATED,
  skillsForResumeHref,
  roleDataYear,
} from "@/lib/roleResumeData";

const CANONICAL = `${SITE_URL}/skills-for-resume/`;
const YEAR = roleDataYear();

export const metadata: Metadata = {
  title: `Skills for Your Resume (${YEAR}): Ranked by Real Job-Posting Data, per Role`,
  description: `Which skills to put on a resume, by role — ranked by how often employers actually request each skill in published job-posting research, not by opinion. Pick your role for the exact list, then check your resume against it free.`,
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: `Skills for Your Resume (${YEAR}): Ranked by Real Job Postings`,
    description:
      "Data-backed skills lists per role, ranked by frequency across live job postings. Pick your role and check your resume against the list free.",
  },
};

export const dynamic = "force-static";

export default function SkillsForResumeIndexPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Skills for Resume", item: CANONICAL },
    ],
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Skills for your resume by role (${YEAR})`,
    numberOfItems: ROLE_RESUME_DATA.length,
    itemListElement: ROLE_RESUME_DATA.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Skills for a ${r.label} resume`,
      url: `${SITE_URL}${skillsForResumeHref(r.slug)}/`,
    })),
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      <JsonLd data={[breadcrumbJsonLd, itemListJsonLd]} />

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
          <span style={{ color: "var(--muted)" }}>Skills for Resume</span>
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
          Ranked by real job-posting data · Updated {ROLE_DATA_LAST_UPDATED.slice(0, 10)}
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, margin: "0 0 16px" }}>
          Skills for your resume, ranked by real demand
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 32px" }}>
          The right skills for a resume depend entirely on the role — so instead of one generic list, each page below
          ranks skills by how often employers actually request them in job postings, drawn from published hiring
          research (each page cites its source). Pick your role, get the exact list, then check your resume against it
          free.
        </p>

        <section style={{ marginBottom: 44 }}>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 10,
            }}
          >
            {ROLE_RESUME_DATA.map((r) => (
              <li key={r.slug}>
                <Link
                  href={skillsForResumeHref(r.slug)}
                  style={{
                    display: "block",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                    {r.label}
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>
                    Top: {r.topSkills.slice(0, 3).map((s) => s.name).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, margin: "0 0 12px" }}>
              The three rules that apply to every role
            </h2>
            <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <strong style={{ color: "var(--text)" }}>List skills twice</strong> — once in a Skills section for the
                ATS keyword match, once inside an experience bullet that proves it with an outcome.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Mirror the job description&rsquo;s exact wording</strong> —
                ATS matching is literal, so use the posting&rsquo;s name for the skill.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>8–15 genuinely-held skills, grouped</strong> — padding
                dilutes the signal, and every listed skill is a potential interview question.
              </li>
            </ul>
          </section>

          <section
            style={{
              padding: "22px 24px",
              borderRadius: 14,
              border: "1px solid var(--accent)",
              background: "var(--accent-bg)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, margin: "0 0 8px" }}>
              Does your resume already show the right skills?
            </h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Upload it and Resunova scores it against a real job description — found skills, missing skills, and a
              rewrite for each weak bullet. Free, no credit card.
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
        </article>
      </main>
    </div>
  );
}
