import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import { COMPARISONS, comparisonHref, getComparison } from "@/lib/competitorComparison";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Compare" };
  const canonical = `${SITE_URL}${comparisonHref(c.slug)}/`;
  const title = `Resunova vs ${c.competitor}: Free ATS Tailoring Compared (${c.asOf})`;
  const description = `Resunova vs ${c.competitor}: price, ATS scoring, job-description tailoring, templates, and what's free vs paywalled. An honest, dated comparison.`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: "article", url: canonical, title, description },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const canonical = `${SITE_URL}${comparisonHref(c.slug)}/`;
  const title = `Resunova vs ${c.competitor}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Resunova vs ${c.competitor}: Free ATS Tailoring Compared (${c.asOf})`,
    description: `An honest, dated comparison of Resunova and ${c.competitor} across price, ATS scoring, JD tailoring, templates, and downloads.`,
    author: { "@type": "Organization", name: "Resunova", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Resunova" },
    mainEntityOfPage: canonical,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
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
      { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare/` },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  };

  const sectionTitle: CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: -0.4,
    margin: "0 0 12px",
  };
  const cell: CSSProperties = {
    padding: "12px 14px",
    borderBottom: "1px solid var(--border)",
    fontSize: 14,
    verticalAlign: "top",
    lineHeight: 1.5,
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
          <Link href="/ats-resume-checker" style={{ color: "var(--dim)", textDecoration: "none" }}>
            ATS Checker
          </Link>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            App
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 100px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--dim)", marginBottom: 18 }}>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Home
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--muted)" }}>{title}</span>
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
          Comparison · {c.asOf}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.14, margin: "0 0 16px" }}>
          {`Resunova vs ${c.competitor}`}
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--muted)",
            lineHeight: 1.7,
            margin: "0 0 32px",
            paddingBottom: 28,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {c.intro}
        </p>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>{`Resunova vs ${c.competitor} at a glance`}</h2>
            <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...cell, fontWeight: 700, color: "var(--dim)", textAlign: "left", width: "26%" }}>
                      Feature
                    </th>
                    <th style={{ ...cell, fontWeight: 800, color: "var(--accent)", textAlign: "left" }}>Resunova</th>
                    <th style={{ ...cell, fontWeight: 700, color: "var(--text)", textAlign: "left" }}>{c.competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.feature}>
                      <td style={{ ...cell, fontWeight: 600, color: "var(--text)" }}>{r.feature}</td>
                      <td style={{ ...cell, color: "var(--muted)" }}>{r.resunova}</td>
                      <td style={{ ...cell, color: "var(--muted)" }}>
                        {r.competitor}
                        {r.caveat ? <sup style={{ color: "var(--dim)" }}>†</sup> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>Which should you use?</h2>
            <p style={{ margin: 0 }}>{c.verdict}</p>
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
            <h2 style={{ ...sectionTitle, margin: "0 0 8px" }}>Try Resunova free</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Score your resume, tailor it to a job description, and download an ATS-friendly PDF (all free, no sign-up
              for the template builder).
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

          <section style={{ marginBottom: 36 }}>
            <h2 style={sectionTitle}>{`Resunova vs ${c.competitor} FAQ`}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {c.faq.map((f) => (
                <div key={f.question}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{f.question}</h3>
                  <p style={{ margin: 0 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {c.footnotes.map((fn, i) => (
            <p key={i} style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6, marginTop: 12 }}>
              <sup>†</sup> {fn}
            </p>
          ))}

          <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 20 }}>
            See also:{" "}
            <Link href="/ats-resume-checker" style={{ color: "var(--accent)" }}>
              free ATS resume checker
            </Link>{" "}
            ·{" "}
            <Link href="/resume-examples" style={{ color: "var(--accent)" }}>
              resume examples by role
            </Link>
          </p>
        </article>
      </main>
    </div>
  );
}
