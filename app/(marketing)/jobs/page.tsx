import type { Metadata } from "next";
import { SITE_URL } from "@/lib/brand";
import PublicJobsBoard from "@/components/PublicJobsBoard";
import { preparePublicJobs } from "@/lib/publicJobDisplay";
import { fetchPublicJobIndex } from "@/lib/publicJobs";

// Rendered per request so a build never depends on the API. The API response
// itself is cached for 15 minutes (INDEX_REVALIDATE_SECONDS), so this does not
// query the database per visitor.
export const dynamic = "force-dynamic";

const JOBS_TITLE = "Resume–Job Match Board | Resunova";
const JOBS_DESCRIPTION =
  "Browse fresh job openings sourced from company career sites. Filter by function, level, and location, then apply on the company site.";

export const metadata: Metadata = {
  title: { absolute: JOBS_TITLE },
  description: JOBS_DESCRIPTION,
  openGraph: { title: JOBS_TITLE, description: JOBS_DESCRIPTION },
  twitter: { title: JOBS_TITLE, description: JOBS_DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/jobs/` },
  robots: { index: true, follow: true },
};

export default async function JobsIndexPage() {
  // Throws when the API cannot be reached, rather than drawing an empty board
  // that reads as "there are no jobs".
  const { jobs: rawJobs, generatedAt } = await fetchPublicJobIndex();
  const jobs = preparePublicJobs(rawJobs);
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-text sm:px-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Direct from employers</p>
      <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif" }}>Fresh jobs, open to everyone.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-rn-muted">
        Read the full posting and apply on the company site. No subscription is required. Sign in only if you want Resunova to rank jobs against your resume.
      </p>
      {generatedAt && <p className="mt-3 text-xs text-dim">Updated {new Date(generatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}</p>}

      <PublicJobsBoard jobs={jobs} />
    </div>
  );
}
