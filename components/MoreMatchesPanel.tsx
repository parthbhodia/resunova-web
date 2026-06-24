"use client";

/**
 * MoreMatchesPanel — fills the empty area beneath the open job in the desktop
 * split view (HomePageClient → JobsView). It surfaces a few more openings from
 * the feed the rail is already showing — same-company roles first, then the next
 * best matches — so the otherwise-blank right column becomes useful discovery
 * without a second network call (it reads the module-level feed cache).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import CompanyLogo from "@/components/CompanyLogo";
import { getCachedFeedJobs, type FeedJob } from "@/components/JobsFeed";

const MAX_CARDS = 6;

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green-ink)";
  if (score >= 50) return "var(--amber-ink)";
  return "var(--muted)";
}

export default function MoreMatchesPanel({ currentJobId }: { currentJobId: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<FeedJob[] | null>(() => getCachedFeedJobs());

  // The cache is populated by the sibling list rail's fetch, which can land a
  // beat after this panel mounts (and module-var writes don't trigger a render).
  // Re-read on a short interval until it's available, then stop.
  useEffect(() => {
    if (jobs && jobs.length) return;
    let tries = 0;
    const t = setInterval(() => {
      const c = getCachedFeedJobs();
      tries += 1;
      if ((c && c.length) || tries > 16) {
        setJobs(c);
        clearInterval(t);
      }
    }, 300);
    return () => clearInterval(t);
  }, [jobs, currentJobId]);

  const { items, heading } = useMemo(() => {
    const all = jobs ?? [];
    const current = all.find((j) => j.id === currentJobId);
    const company = current?.company?.trim().toLowerCase();
    const others = all.filter((j) => j.id !== currentJobId);
    const sameCompany = company
      ? others.filter((j) => j.company?.trim().toLowerCase() === company)
      : [];
    const sameIds = new Set(sameCompany.map((j) => j.id));
    const rest = others.filter((j) => !sameIds.has(j.id));
    return {
      items: [...sameCompany, ...rest].slice(0, MAX_CARDS),
      heading: sameCompany.length && current?.company ? `More from ${current.company}` : "More matches",
    };
  }, [jobs, currentJobId]);

  if (!items.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase", padding: "2px" }}>
        {heading}
      </div>
      {items.map((job) => {
        const sub = [job.company, job.location].filter(Boolean).join(" · ");
        return (
          <Card
            key={job.id}
            onClick={() => router.push(`/?view=jobs&job=${encodeURIComponent(job.id)}`)}
            style={{ cursor: "pointer" }}
          >
            <CardContent style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <CompanyLogo company={job.company} companyDomain={job.companyDomain || ""} slug={job.companySlug || ""} size={38} radius={9} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {job.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sub}
                </div>
              </div>
              {job.matchScore != null && (
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: scoreColor(job.matchScore) }}>
                  {job.matchScore}%
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
