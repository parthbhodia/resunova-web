import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoFull } from "@/components/BrandLogo";
import JsonLd from "@/components/seo/JsonLd";
import SkillFrequencyTable from "@/components/seo/SkillFrequencyTable";
import { SITE_URL } from "@/lib/brand";
import {
  ROLE_RESUME_DATA,
  ROLE_DATA_LAST_UPDATED,
  getRoleResumeData,
  roleResumeHref,
  skillsForResumeHref,
  roleDataYear,
} from "@/lib/roleResumeData";

// Static export: every dynamic route must enumerate its params at build time,
// and we never serve a role we don't have real skill data for (anti-thin-content).
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
  if (!data) return { title: "Skills for Resume" };
  const canonical = `${SITE_URL}${skillsForResumeHref(data.slug)}/`;
  const top3 = data.topSkills.slice(0, 3).map((s) => s.name).join(", ");
  const description = data.skillsSource
    ? `The skills to put on a ${data.label.toLowerCase()} resume in ${YEAR}, ranked by how often employers request each in published job-posting research: ${top3}, and more — plus where to put them so an ATS finds them.`
    : `The skills to put on a ${data.label.toLowerCase()} resume in ${YEAR}, ranked by how often ${data.postingsAnalyzed.toLocaleString("en-US")} live job postings ask for each: ${top3}, and more — plus where to put them so an ATS finds them.`;
  return {
    title: `Top Skills for a ${data.label} Resume (${YEAR}): Ranked by Real Job Postings`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      url: canonical,
      title: `Top Skills for a ${data.label} Resume (${YEAR})`,
      description,
    },
  };
}

export default async function SkillsForResumePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const data = getRoleResumeData(role);
  if (!data) notFound();

  const canonical = `${SITE_URL}${skillsForResumeHref(data.slug)}/`;
  const formattedCount = data.postingsAnalyzed.toLocaleString("en-US");
  const top3 = data.topSkills.slice(0, 3);
  const siblings = ROLE_RESUME_DATA.filter((r) => r.slug !== data.slug).slice(0, 8);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top skills for a ${data.label} resume (${YEAR})`,
    numberOfItems: data.topSkills.length,
    itemListElement: data.topSkills.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
    })),
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What skills should I put on a ${data.label.toLowerCase()} resume?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: data.skillsSource
            ? `Lead with the skills employers actually request. Per published job-posting research, the most-requested are ${top3.map((s) => `${s.name} (${s.sharePct}%)`).join(", ")}. List the ones you genuinely have in a Skills section, and prove the top two or three inside your experience bullets with a measurable outcome.`
            : `Lead with the skills employers actually request. Across ${formattedCount} live ${data.label.toLowerCase()} postings, the most-requested are ${top3.map((s) => `${s.name} (${s.sharePct}%)`).join(", ")}. List the ones you genuinely have in a Skills section, and prove the top two or three inside your experience bullets with a measurable outcome.`,
        },
      },
      {
        "@type": "Question",
        name: "Where should skills go on a resume?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Twice. A dedicated Skills section gives the ATS exact keyword matches; your experience bullets prove the important ones with real outcomes. A skill that appears only in the Skills list reads as unverified — back the ones the job description emphasizes with a bullet.",
        },
      },
      {
        "@type": "Question",
        name: "How many skills should a resume list?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "8–15 genuinely-held skills, grouped (e.g. languages, tools, methods). Padding the list dilutes the signal and invites interview questions you can't answer. Match the wording the job description uses.",
        },
      },
    ],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Skills for Resume", item: `${SITE_URL}/skills-for-resume/` },
      { "@type": "ListItem", position: 3, name: data.label, item: canonical },
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
      <JsonLd data={[itemListJsonLd, faqJsonLd, breadcrumbJsonLd]} />

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
            All Roles
          </Link>
          <Link href={roleResumeHref(data.slug)} style={{ color: "var(--dim)", textDecoration: "none" }}>
            {data.label} Example
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
          <Link href="/skills-for-resume" style={{ color: "var(--dim)", textDecoration: "none" }}>
            Skills for Resume
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
          {data.skillsSource
            ? `From published hiring research · Updated ${ROLE_DATA_LAST_UPDATED.slice(0, 10)}`
            : `From ${formattedCount} live job postings · Updated ${ROLE_DATA_LAST_UPDATED.slice(0, 10)}`}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.14, margin: "0 0 16px" }}>
          Top skills for a {data.label.toLowerCase()} resume ({YEAR})
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 28px" }}>
          {data.skillsSource ? (
            <>
              Not a generic listicle: these are the skills employers request most in {data.label.toLowerCase()} job
              postings, ranked by published hiring research (source cited below).{" "}
            </>
          ) : (
            <>
              Not a generic listicle: these are the skills employers request most across {formattedCount} live{" "}
              {data.label.toLowerCase()} job postings in Resunova&rsquo;s jobs dataset, ranked by how often each
              appears.{" "}
            </>
          )}
          {top3.map((s) => s.name).join(", ")} lead the field — list the ones you genuinely have, and prove the top
          two or three with a measurable bullet.
        </p>

        <section style={{ marginBottom: 40 }}>
          <SkillFrequencyTable
            skills={data.topSkills}
            postingsAnalyzed={data.postingsAnalyzed}
            roleLabel={data.label}
            sourceNote={data.skillsSource}
          />
        </section>

        <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)" }}>
          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>How to put these skills on your resume</h2>
            <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <strong style={{ color: "var(--text)" }}>List them twice.</strong> A Skills section gives the ATS an
                exact keyword match; an experience bullet proves it. &ldquo;{top3[0]?.name}&rdquo; in a bullet with a
                number beats &ldquo;{top3[0]?.name}&rdquo; in a comma list.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Mirror the job description&rsquo;s wording.</strong> If the
                posting says a skill by a specific name, use that exact name — ATS keyword matching is literal.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Don&rsquo;t pad.</strong> 8–15 genuinely-held skills,
                grouped. Every listed skill is an interview question waiting to happen.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Quantify the proof.</strong> The strongest pattern is
                skill&nbsp;+&nbsp;scope&nbsp;+&nbsp;outcome: what you used, on what, and what changed (%, $, time, scale).
              </li>
            </ul>
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
            <h2 style={{ ...sectionTitle, margin: "0 0 8px" }}>Check your resume against these skills</h2>
            <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
              Upload your resume and Resunova scores it against a real job description — including which of these
              skills it finds, which are missing, and a rewrite for each weak bullet. Free.
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

          <section style={{ marginBottom: 40 }}>
            <h2 style={sectionTitle}>See a full {data.label.toLowerCase()} resume</h2>
            <p style={{ margin: 0 }}>
              Want these skills in context? See the{" "}
              <Link href={roleResumeHref(data.slug)} style={{ color: "var(--accent)" }}>
                {data.label.toLowerCase()} resume example
              </Link>{" "}
              — a scored sample with salary data and ATS keywords for the same role.
            </p>
          </section>

          <section style={{ marginBottom: 8 }}>
            <h2 style={sectionTitle}>Skills for other roles</h2>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 8,
              }}
            >
              {siblings.map((r) => (
                <li key={r.slug}>
                  <Link href={skillsForResumeHref(r.slug)} style={{ color: "var(--accent)", fontSize: 14 }}>
                    Skills for a {r.label.toLowerCase()} resume
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
