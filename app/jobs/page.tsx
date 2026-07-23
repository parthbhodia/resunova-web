import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import { SITE_URL } from "@/lib/brand";
import { JOBS_GENERATED_AT, PUBLIC_JOBS, jobHref } from "@/lib/jobsSeoData";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Fresh Jobs from Company Career Sites | Resunova",
  description: "Browse fresh job openings sourced from company career sites. Read each full job description and apply directly, without a subscription or paywall.",
  alternates: { canonical: `${SITE_URL}/jobs/` },
  robots: { index: true, follow: true },
};

export default function JobsIndexPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-text sm:px-8">
      <header className="mb-12 flex items-center justify-between border-b border-border pb-5">
        <Link href="/" aria-label="Resunova home"><LogoFull /></Link>
        <Link href="/?view=jobs" className="text-sm font-semibold text-accent">Personalized job matches</Link>
      </header>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Direct from employers</p>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Fresh jobs, open to everyone.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-rn-muted">
        Read the full posting and apply on the company site. No subscription is required. Sign in only if you want Resunova to rank jobs against your resume.
      </p>
      {JOBS_GENERATED_AT && <p className="mt-3 text-xs text-dim">Updated {new Date(JOBS_GENERATED_AT).toLocaleDateString("en-US", { dateStyle: "long" })}</p>}

      <section aria-label="Current job openings" className="mt-10 grid gap-3">
        {PUBLIC_JOBS.map((job) => (
          <article key={job.id} className="rounded-xl border border-border bg-surface p-5">
            <Link href={jobHref(job.id)} className="text-lg font-bold text-text no-underline hover:text-accent">{job.title}</Link>
            <p className="mt-1 text-sm font-semibold text-rn-muted">{job.company}</p>
            <p className="mt-2 text-sm text-dim">{[job.location, job.workModel].filter(Boolean).join(" · ") || "Location not specified"}</p>
          </article>
        ))}
        {PUBLIC_JOBS.length === 0 && <p className="rounded-xl border border-border bg-surface p-6 text-rn-muted">The latest job index is being refreshed.</p>}
      </section>
    </main>
  );
}
