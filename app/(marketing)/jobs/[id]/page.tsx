import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import JsonLd from "@/components/seo/JsonLd";
import { AccountAction, PublicApplyLink, ResumeCheckLink } from "@/components/seo/PublicJobActions";
import { JobChip, JobDescriptionBlocks, JobFact } from "@/components/jobs/JobPresentation";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_URL } from "@/lib/brand";
import { SEN_LABEL, WM_LABEL, employmentTypeLabel, formatPostedAt, formatSalaryFull } from "@/lib/jobFacts";
import { FREE_SCAN_DAILY_LIMIT } from "@/lib/planLimits";
import { fetchPublicJob, isIndexablePosting, jobHref, type PublicJob } from "@/lib/publicJobs";

// Rendered when first asked for, then cached for an hour. Nothing is generated
// at build time, so a deploy never depends on the API being up and never
// replaces the set of pages that exist: any posting the API holds as open has a
// page, whether or not it existed at the last deploy. These must stay literals
// (Next reads them statically); `lib/__tests__/jobPageOnDemand.test.ts` pins
// the 3600 to JOB_REVALIDATE_SECONDS.
export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

function canonicalFor(id: string) {
  return `${SITE_URL}${jobHref(id)}/`;
}

function summary(job: PublicJob) {
  const text = job.description.replace(/\s+/g, " ").trim();
  const prefix = `${job.title} at ${job.company}${job.location ? ` in ${job.location}` : ""}. `;
  return `${prefix}${text}`.slice(0, 158).trimEnd();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchPublicJob(id);
  if (!job) return { title: "Job not found", robots: { index: false, follow: false } };
  const canonical = canonicalFor(job.id);
  const description = summary(job);
  return {
    title: `${job.title} at ${job.company}`,
    description,
    alternates: { canonical },
    // An open posting with no date, apply link or real location is thin. It
    // still renders for the person who has the link; it is just not offered to
    // a search index.
    robots: { index: isIndexablePosting(job), follow: true },
    openGraph: { type: "website", url: canonical, title: `${job.title} at ${job.company}`, description },
  };
}

function jobPostingSchema(job: PublicJob) {
  const domain = /^[a-z0-9.-]+$/i.test(job.companyDomain) ? `https://${job.companyDomain}` : undefined;
  const salaryPeriod = job.salaryPeriod?.toUpperCase();
  const salaryUnit = salaryPeriod && ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"].includes(salaryPeriod)
    ? salaryPeriod
    : undefined;
  const hasSalary = !!salaryUnit && (typeof job.salaryMin === "number" || typeof job.salaryMax === "number");
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    directApply: false,
    employmentType: job.employmentType?.replace(/[^a-z0-9]+/gi, "_").toUpperCase() || undefined,
    hiringOrganization: { "@type": "Organization", name: job.company, sameAs: domain },
    jobLocation: job.location ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } } : undefined,
    industry: job.industry || undefined,
    baseSalary: hasSalary ? {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin ?? undefined,
        maxValue: job.salaryMax ?? undefined,
        unitText: salaryUnit,
      },
    } : undefined,
    url: canonicalFor(job.id),
    isAccessibleForFree: true,
  };
}

// ── Look ───────────────────────────────────────────────────────────────────
// Same shapes as the in-app job pane (`components/JobDetail.tsx`), so a person
// who arrives from search and then signs in sees one product, not two.

const CARD_PAD: CSSProperties = { padding: "24px 28px" };
const H2: CSSProperties = { fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" };
const BODY: CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "var(--muted)", margin: 0 };
const PRIMARY: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
  minHeight: 44, padding: "0 22px", borderRadius: 10, border: "none", cursor: "pointer",
  background: "var(--accent)", color: "var(--on-fill)", fontSize: 14, fontWeight: 600, textDecoration: "none",
};
const SECONDARY: CSSProperties = {
  ...PRIMARY,
  background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)",
};

const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" /></svg>
);
const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M14 5h5v5M19 5l-8 8M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ ...H2, fontSize: 15, margin: 0 }}>{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // null = closed or unknown: a real 404, which the not-found page turns into
  // "no longer listed" for a person and which tells search to drop the URL.
  // An API that cannot answer throws instead, so it is never cached as a 404.
  const job = await fetchPublicJob(id);
  if (!job) notFound();

  const salary = formatSalaryFull(job);
  const jobType = employmentTypeLabel(job.employmentType);
  const workModel = job.workModel ? WM_LABEL[job.workModel] ?? null : null;
  const level = job.seniority ? SEN_LABEL[job.seniority] ?? null : null;
  const posted = formatPostedAt(job.postedAt);
  const inApp = `/?view=jobs&job=${encodeURIComponent(job.id)}`;
  const applyJob = { id: job.id, company: job.company, url: job.url, jd: job.description };
  const requirements = job.totalRequirements ?? 0;

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-text sm:px-6">
      {isIndexablePosting(job) && <JsonLd data={jobPostingSchema(job)} />}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-5">
          {/* Header: title, company, place and work model, pay and type, apply */}
          <Card>
            <CardContent style={{ ...CARD_PAD, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <CompanyLogo company={job.company} companyDomain={job.companyDomain} slug={job.companySlug} size={56} radius={12} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.2 }}>{job.title}</h1>
                  <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{job.company}</p>
                  {(job.location || workModel) && (
                    <p style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>
                      <IconPin />
                      <span>{[job.location, workModel ? `${workModel} work` : ""].filter(Boolean).join("  ·  ")}</span>
                    </p>
                  )}
                  {(salary || jobType) && (
                    <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {[salary, jobType].filter(Boolean).join("  ·  ")}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 2 }}>
                <PublicApplyLink job={applyJob} style={PRIMARY}>
                  Apply on company site <IconExternal />
                </PublicApplyLink>
                <Link href={inApp} style={SECONDARY}>Match your résumé</Link>
              </div>
              {posted && <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Posted {posted}</p>}
            </CardContent>
          </Card>

          {/* Job details: only the facts this posting actually states */}
          {(salary || jobType || workModel || level || job.industry) && (
            <Card>
              <CardContent style={CARD_PAD}>
                <h2 style={H2}>Job details</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {salary && (
                    <JobFact label="Pay">
                      <JobChip>{salary}</JobChip>
                      {job.salarySource && (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {job.salarySource === "jd" ? "Estimated from the job description" : "Listed by the company"}
                        </span>
                      )}
                    </JobFact>
                  )}
                  {jobType && <JobFact label="Job type"><JobChip>{jobType}</JobChip></JobFact>}
                  {workModel && <JobFact label="Work model"><JobChip>{workModel}</JobChip></JobFact>}
                  {level && <JobFact label="Level"><JobChip>{level}</JobChip></JobFact>}
                  {job.industry && <JobFact label="Industry"><JobChip>{job.industry}</JobChip></JobFact>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* The whole description, in the HTML: this is what search reads */}
          <Card>
            <CardContent style={CARD_PAD}>
              <h2 style={H2}>Full job description</h2>
              <JobDescriptionBlocks text={job.description} />
            </CardContent>
          </Card>
        </article>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6">
          <RailCard title="Scan to match">
            <p style={BODY}>
              {requirements > 0
                ? `${requirements} requirement${requirements === 1 ? "" : "s"} extracted from this posting. Scan your résumé to see which ones you already cover.`
                : "Scan your résumé to see how well it matches this role."}
            </p>
            <p style={BODY}>Free with an account, {FREE_SCAN_DAILY_LIMIT} scans a day.</p>
            <ResumeCheckLink jd={job.description} style={{ ...PRIMARY, width: "100%" }}>
              Upload your résumé
            </ResumeCheckLink>
            <PublicApplyLink job={applyJob} style={{ ...SECONDARY, width: "100%" }}>
              Apply on company site <IconExternal />
            </PublicApplyLink>
          </RailCard>

          <RailCard title="Prepare for your interview">
            <p style={BODY}>
              Questions for {job.company} built from your résumé and this posting, with STAR+R answer outlines.
            </p>
            <AccountAction ask="interview_prep" signedInHref={inApp} style={{ ...PRIMARY, width: "100%" }}>
              Generate prep kit
            </AccountAction>
          </RailCard>

          <RailCard title="Hiring contacts">
            <p style={BODY}>Sign in to check for a recruiter or HR contact for this role.</p>
            <AccountAction ask="contacts" signedInHref={inApp} style={{ ...SECONDARY, width: "100%" }}>
              Sign in to view contacts
            </AccountAction>
          </RailCard>
        </aside>
      </div>
    </div>
  );
}
