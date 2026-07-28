import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import ResumeExamplesMarketplace from "@/components/ResumeExamplesMarketplace";
import { SITE_URL } from "@/lib/brand";
import { ROLE_RESUME_DATA, roleResumeHref, roleDataYear } from "@/lib/roleResumeData";
import { TOTAL_RESUME_EXAMPLES, TOTAL_RESUME_CATEGORIES } from "@/lib/resumeExampleCategories";

const YEAR = roleDataYear();

export const metadata: Metadata = {
  title: `${TOTAL_RESUME_EXAMPLES}+ Resume Examples by Role (${YEAR})`,
  description: `Browse ${TOTAL_RESUME_EXAMPLES}+ real, scored resume examples across ${TOTAL_RESUME_CATEGORIES} careers, each built from the skills employers actually ask for. Free to tailor your own — no sign-up required.`,
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
          <Link href="/skills-for-resume" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Skills for Resume
          </Link>
          <Link href="/blog" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Blog
          </Link>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            App
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 90px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--dim)", marginBottom: 24 }}>
          <Link href="/" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Home
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span style={{ color: "var(--muted)" }}>Resume Examples</span>
        </nav>

        <ResumeExamplesMarketplace />

        <p style={{ marginTop: 8, fontSize: 13, color: "var(--dim)", lineHeight: 1.6, textAlign: "center" }}>
          These examples use fictional candidates and employers. Contact details and license numbers are
          intentionally omitted. Replace every detail with your own accurate, verifiable information before
          applying. Don&rsquo;t see your role yet? Run your résumé through the{" "}
          <Link href="/ats-resume-checker" style={{ color: "var(--accent)" }}>
            free ATS resume checker
          </Link>{" "}
          instead.
        </p>
      </main>
    </div>
  );
}
