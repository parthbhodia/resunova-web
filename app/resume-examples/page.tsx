import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/brand";
import { ROLE_RESUME_DATA, roleResumeHref, roleDataYear } from "@/lib/roleResumeData";

const YEAR = roleDataYear();

export const metadata: Metadata = {
  title: `Resume Examples by Role (${YEAR})`,
  description:
    "Real resume examples by role, each built from the skills employers actually ask for in live job postings — with a scored sample, salary data, and ATS keywords. Free to tailor your own.",
  alternates: { canonical: `${SITE_URL}/resume-examples/` },
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function ResumeExamplesHubPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Resume Examples by Role",
    itemListElement: ROLE_RESUME_DATA.map((role, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${role.label} Resume Example`,
      url: `${SITE_URL}${roleResumeHref(role.slug)}/`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Resume Examples", item: `${SITE_URL}/resume-examples/` },
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
          <Link href="/blog" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Blog
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
          Resume Examples
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, margin: "0 0 14px" }}>
          Resume examples by role
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 36px" }}>
          Every example below is built from the skills employers actually ask for in live job postings for that role —
          frequency-ranked, with a scored sample résumé, salary data, and the keywords that pass ATS. Pick your role,
          then tailor your own in seconds.
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {ROLE_RESUME_DATA.map((role) => (
            <li key={role.slug}>
              <Link
                href={`${roleResumeHref(role.slug)}/`}
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>
                    {`${role.label} Resume Example`}
                  </h2>
                  <span style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap" }}>
                    {role.postingsAnalyzed.toLocaleString("en-US")} postings
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
                  Top skills:{" "}
                  {role.topSkills.slice(0, 4).map((s) => s.name).join(", ")} · Median {role.salary.rangeLabel}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p style={{ marginTop: 32, fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
          Don’t see your role yet? More are being added. In the meantime, run your résumé through the{" "}
          <Link href="/" style={{ color: "var(--accent)" }}>
            free ATS resume checker
          </Link>{" "}
          or read our{" "}
          <Link href="/blog" style={{ color: "var(--accent)" }}>
            ATS guides
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
