"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { fetchJobDetail } from "@/lib/jobsApi";
import { inAppJobHref, jobIdFromPath } from "@/lib/staleJobLink";

/**
 * What the 404 page shows when the address is a retired public job link.
 *
 * Google keeps showing `/jobs/<id>/` URLs that a later deploy stopped
 * generating (see `lib/staleJobLink.ts`), and the role behind them is usually
 * still open. So instead of "the page does not exist" this asks the API about
 * the posting and answers the question the visitor actually has: is it still
 * open, and where can I read it.
 *
 * It reports only what it learned. A failed lookup is its own state, so an
 * outage never reads as "this job has closed".
 *
 * Any other 404 renders `children` unchanged.
 */

type Outcome =
  | { id: string; kind: "open"; title: string; company: string; location: string }
  | { id: string; kind: "gone" }
  | { id: string; kind: "unknown" };

const noopSubscribe = () => () => {};

const primaryLink = "rounded-lg bg-accent px-5 py-3 text-sm font-bold no-underline";
const secondaryLink = "rounded-lg border border-border px-5 py-3 text-sm font-bold text-text no-underline";

export default function StaleJobRescue({ children }: { children: ReactNode }) {
  // The address is only known in the browser. The server snapshot is empty, so
  // the prerendered 404.html carries the generic message and React swaps it
  // after hydration without a mismatch.
  const pathname = useSyncExternalStore(noopSubscribe, () => window.location.pathname, () => "");
  const id = jobIdFromPath(pathname);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchJobDetail(id)
      .then((job) => {
        if (cancelled) return;
        setOutcome(
          job.isActive
            ? { id, kind: "open", title: job.title, company: job.company, location: job.location }
            : { id, kind: "gone" },
        );
      })
      .catch(() => {
        if (!cancelled) setOutcome({ id, kind: "unknown" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <>{children}</>;

  const result = outcome && outcome.id === id ? outcome : null;

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-xl text-left text-text">
      {result === null && (
        <>
          <h1 className="text-3xl font-bold tracking-tight">Looking for this job</h1>
          <p className="mt-3 text-base text-rn-muted">Checking whether it is still open.</p>
        </>
      )}

      {result?.kind === "open" && (
        <>
          <h1 className="text-3xl font-bold tracking-tight">This job is still open</h1>
          <p className="mt-4 text-lg font-bold">{result.title}</p>
          <p className="mt-1 text-base text-rn-muted">
            {[result.company, result.location].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 text-base text-rn-muted">
            Our public job pages are replaced as new postings come in, so this link no longer works. The posting itself
            is still live.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={inAppJobHref(result.id)} className={primaryLink} style={{ color: "var(--on-fill)" }}>
              View this job
            </Link>
            <Link href="/jobs/" className={secondaryLink}>
              Browse current jobs
            </Link>
          </div>
        </>
      )}

      {result?.kind === "gone" && (
        <>
          <h1 className="text-3xl font-bold tracking-tight">This job is no longer listed</h1>
          <p className="mt-4 text-base text-rn-muted">
            It has probably been filled or taken off the company&apos;s career site. Other roles are open.
          </p>
          <BrowseLinks />
        </>
      )}

      {result?.kind === "unknown" && (
        <>
          <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find this job</h1>
          <p className="mt-4 text-base text-rn-muted">
            The link may be out of date, or we couldn&apos;t reach the job service just now. Here is what is open.
          </p>
          <BrowseLinks />
        </>
      )}
    </section>
  );
}

function BrowseLinks() {
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Link href="/jobs/" className={primaryLink} style={{ color: "var(--on-fill)" }}>
        Browse current jobs
      </Link>
      <Link href="/?view=jobs" className={secondaryLink}>
        Search all jobs
      </Link>
    </div>
  );
}
