import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import SkillFrequencyTable from "@/components/seo/SkillFrequencyTable";
import RolePrefillCTA from "@/components/RolePrefillCTA";
import { SITE_URL } from "@/lib/brand";
import {
  ROLE_RESUME_DATA,
  ROLE_DATA_LAST_UPDATED,
  getRoleResumeData,
  roleResumeHref,
  roleDataYear,
} from "@/lib/roleResumeData";

// Static export: every dynamic route must enumerate its params at build time,
// and we never want to serve a role we don't have data for.
export const dynamic = "force-static";
export const dynamicParams = false;

const YEAR = roleDataYear();

export function generateStaticParams() {
  return ROLE_RESUME_DATA.map((r) => ({ role: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const data = getRoleResumeData(role);
  if (!data) return { title: "Resume Example" };
  const canonical = `${SITE_URL}${roleResumeHref(data.slug)}/`;
  const description = `${data.label} resume example with the skills employers ask for most in ${YEAR}, a scored sample, salary data, and ATS keywords, from ${data.postingsAnalyzed.toLocaleString("en-US")} live job postings. Free to tailor your own.`;
  return {
    title: `${data.label} Resume Example & Skills Employers Want (${YEAR})`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: "article", url: canonical, title: `${data.label} Resume Example (${YEAR})`, description },
  };
}

export default async function RoleResumeExamplePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const data = getRoleResumeData(role);
  if (!data) notFound();

  const canonical = `${SITE_URL}${roleResumeHref(data.slug)}/`;
  const siblings = ROLE_RESUME_DATA.filter((r) => r.slug !== data.slug);
  const formattedSalary = `$${data.salary.medianUsd.toLocaleString("en-US")}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${data.label} Resume Example & Most-Requested Skills (${YEAR})`,
    description: `The skills, salary, and ATS keywords that make a strong ${data.label} résumé, from ${data.postingsAnalyzed.toLocaleString("en-US")} live job postings.`,
    author: { "@type": "Organization", name: "Resunova", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Resunova" },
    datePublished: ROLE_DATA_LAST_UPDATED,
    dateModified: ROLE_DATA_LAST_UPDATED,
    mainEntityOfPage: canonical,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: "Resume Examples", item: `${SITE_URL}/resume-examples/` },
      { "@type": "ListItem", position: 3, name: `${data.label} Resume Example`, item: canonical },
    ],
  };

  const sectionTitle: CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: -0.4,
    margin: "0 0 12px",
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
      <JsonLd data={[articleJsonLd, faqJsonLd, breadcrumbJsonLd]} />

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
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--dim)", marginBottom: 18 }}>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Home
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/resume-examples" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Resume Examples
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--muted)" }}>{data.label}</span>
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
          {data.label} · Updated{" "}
          {new Date(ROLE_DATA_LAST_UPDATED).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.14, margin: "0 0 16px" }}>
          {`${data.label} Resume Example & the Skills Employers Want`}
        </h1>

        {/* Direct-answer intro block (40–60 words; snippet / AI-citation bait) */}
        <p
          style={{
            fontSize: 16,
            color: "var(--muted)",
            lineHeight: 1.7,
            margin: "0 0 36px",
            paddingBottom: 28,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {data.intro}
        </p>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          {/* Skills employers ask for most */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>Skills employers ask for most</h2>
            <p style={{ margin: "0 0 18px" }}>
              These are the most-requested requirements across live {data.label.toLowerCase()} postings. Put the ones
              you have in a dedicated Skills section and prove the top few in your bullets.
            </p>
            <SkillFrequencyTable
              skills={data.topSkills}
              postingsAnalyzed={data.postingsAnalyzed}
              roleLabel={data.label.toLowerCase()}
            />
          </section>

          {/* Scored example */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <h2 style={{ ...sectionTitle, margin: 0 }}>Example {data.label.toLowerCase()} résumé</h2>
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent)",
                  background: "var(--accent-bg)",
                  borderRadius: 999,
                  padding: "4px 12px",
                }}
              >
                Resunova score {data.example.score}/100
              </span>
            </div>
            <div
              style={{
                padding: "22px 24px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <p style={{ margin: "0 0 14px", color: "var(--text)", fontWeight: 600 }}>Summary</p>
              <p style={{ margin: "0 0 20px" }}>{data.example.summary}</p>
              <p style={{ margin: "0 0 10px", color: "var(--text)", fontWeight: 600 }}>Experience bullets</p>
              <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                {data.example.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--dim)" }}>
              Notice every bullet leads with a strong verb and ends in a measurable outcome. That pattern is what earns
              the score above.{" "}
              <Link href="/" style={{ color: "var(--accent)" }}>
                Score your own résumé free →
              </Link>
            </p>
          </section>

          {/* Salary + work model */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>Salary &amp; where these roles work</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "Median base", value: formattedSalary },
                { label: "Typical range", value: data.salary.rangeLabel },
                { label: "Remote", value: `${data.workModel.remotePct}%` },
                { label: "Hybrid", value: `${data.workModel.hybridPct}%` },
                { label: "On-site", value: `${data.workModel.onsitePct}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    flex: "1 1 120px",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--dim)" }}>
              From {data.postingsAnalyzed.toLocaleString("en-US")} analyzed {data.label.toLowerCase()} postings. Figures
              vary by location and seniority.
            </p>
          </section>

          {/* FAQ */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>{data.label} resume FAQ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {data.faq.map((f) => (
                <div key={f.question}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{f.question}</h3>
                  <p style={{ margin: 0 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section
            style={{
              marginBottom: 40,
              padding: "22px 24px",
              borderRadius: 14,
              border: "1px solid var(--accent)",
              background: "var(--accent-bg)",
            }}
          >
            <h2 style={{ ...sectionTitle, margin: "0 0 8px" }}>Build your {data.label.toLowerCase()} résumé</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Paste a job description and Resunova tailors your résumé to it: match score, gap analysis, and an
              ATS-friendly PDF in under a minute. Start free.
            </p>
            <RolePrefillCTA role={data} />
          </section>

          {/* Sibling links (no orphans) */}
          {siblings.length > 0 && (
            <section>
              <h2 style={sectionTitle}>More resume examples by role</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`${roleResumeHref(s.slug)}/`}
                      style={{
                        display: "inline-block",
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
