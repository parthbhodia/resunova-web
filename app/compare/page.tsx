import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import { COMPARISONS, comparisonHref } from "@/lib/competitorComparison";

export const metadata: Metadata = {
  title: "Compare Resunova vs Other Resume Builders",
  description:
    "Honest, dated comparisons of Resunova against Kickresume, Teal, and Zety — price, ATS scoring, job-description tailoring, templates, and what's free vs paywalled.",
  alternates: { canonical: `${SITE_URL}/compare/` },
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function CompareHubPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Resunova comparisons",
    itemListElement: COMPARISONS.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Resunova vs ${c.competitor}`,
      url: `${SITE_URL}${comparisonHref(c.slug)}/`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare/` },
    ],
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
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} />

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

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 90px" }}>
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
          Compare
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, margin: "0 0 14px" }}>
          Resunova vs other resume builders
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 36px" }}>
          Honest, dated comparisons — price, ATS scoring, job-description tailoring, templates, and what each tool gives
          you free vs behind a paywall. Every competitor fact is research-verified and sourced.
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {COMPARISONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${comparisonHref(c.slug)}/`}
                style={{
                  display: "block",
                  padding: "20px 22px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.3 }}>
                  {`Resunova vs ${c.competitor}`}
                </h2>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{c.intro}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
