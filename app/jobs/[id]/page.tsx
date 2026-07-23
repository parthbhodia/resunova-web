import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import { LogoFull } from "@/components/BrandLogo";
import { SITE_URL } from "@/lib/brand";
import { PUBLIC_JOBS, getPublicJob, jobHref, type PublicJob } from "@/lib/jobsSeoData";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_JOBS.map((job) => ({ id: job.id }));
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
  const job = getPublicJob(id);
  if (!job) return { title: "Job not found", robots: { index: false, follow: false } };
  const canonical = canonicalFor(job.id);
  const description = summary(job);
  return {
    title: `${job.title} at ${job.company}`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
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

export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getPublicJob(id);
  if (!job) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 text-text sm:px-8">
      <JsonLd data={jobPostingSchema(job)} />
      <header className="mb-9 flex items-center justify-between border-b border-border pb-5">
        <Link href="/" aria-label="Resunova home"><LogoFull /></Link>
        <Link href="/jobs/" className="text-sm font-semibold text-rn-muted">All jobs</Link>
      </header>

      <article>
        <p className="text-sm font-bold text-accent">{job.company}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{job.title}</h1>
        <p className="mt-4 text-base text-rn-muted">{[job.location, job.workModel, job.employmentType?.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p>
        {job.postedAt && <p className="mt-2 text-xs text-dim">Posted {new Date(job.postedAt).toLocaleDateString("en-US", { dateStyle: "long" })}</p>}

        <div className="mt-7 flex flex-wrap gap-3">
          <a href={job.url} rel="nofollow noopener" className="rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white no-underline">Apply on company site</a>
          <Link href={`/?view=jobs&job=${encodeURIComponent(job.id)}`} className="rounded-lg border border-border px-5 py-3 text-sm font-bold text-text no-underline">Match this job to your resume</Link>
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-2xl font-bold">Job description</h2>
          <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-rn-muted">{job.description}</div>
        </section>
      </article>
    </main>
  );
}
