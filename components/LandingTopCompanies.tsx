"use client";

/**
 * "Top companies hiring right now" rail for the signed-out landing page.
 *
 * Reuses the same live, server-cached endpoint that powers the in-app Jobs rail
 * (fetchFeaturedCompanies → /api/jobs/featured-companies), so the counts are
 * real and a company that empties out drops off. Styled with the landing page's
 * resolved `C` color object + `accent` so it matches the surrounding band.
 *
 * Graceful: while loading it shows skeleton tiles; if the endpoint is empty or
 * unreachable (e.g. the API is down), it renders nothing rather than an orphan
 * heading. On the homepage every tile just routes into the Jobs feed.
 */

import { useEffect, useState } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import { fetchFeaturedCompanies, type FeaturedCompany } from "@/lib/jobsApi";

export default function LandingTopCompanies({
  C,
  accent,
}: {
  C: Record<string, string>;
  accent: string;
}) {
  const [companies, setCompanies] = useState<FeaturedCompany[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFeaturedCompanies().then((c) => {
      if (!cancelled) setCompanies(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loaded but empty (or API unreachable) → render nothing, no orphan heading.
  if (companies !== null && companies.length === 0) return null;

  const loading = companies === null;
  const goToJobs = () => {
    window.location.href = "/?view=jobs";
  };

  return (
    <div style={{ marginTop: 56 }}>
      <style>{`
        .lp-co-rail::-webkit-scrollbar { height: 8px; }
        .lp-co-rail::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        .lp-co-card { transition: transform .16s ease, border-color .16s ease; }
        .lp-co-card:hover { transform: translateY(-2px); border-color: ${accent}; }
        .lp-co-card:focus-visible { outline: none; box-shadow: 0 0 0 2px ${accent}; }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Top companies hiring right now</span>
        <button
          type="button"
          onClick={goToJobs}
          style={{ fontSize: 13, fontWeight: 600, color: accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        >
          See all jobs →
        </button>
      </div>

      <div
        className="lp-co-rail"
        role="list"
        style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x proximity" }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ width: 172, height: 88, flexShrink: 0, borderRadius: 12, background: C.bg2, border: `1px solid ${C.border}` }} />
            ))
          : companies!.map((c) => (
              <button
                key={c.company}
                type="button"
                role="listitem"
                onClick={goToJobs}
                aria-label={`${c.company}, ${c.activeCount.toLocaleString()} open roles — browse jobs`}
                className="lp-co-card"
                style={{
                  flexShrink: 0,
                  width: 172,
                  scrollSnapAlign: "start",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 14,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.surface,
                }}
              >
                <CompanyLogo company={c.company} companyDomain={c.domain} slug="" size={38} radius={9} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.company}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
                    {c.activeCount.toLocaleString()} open roles
                  </div>
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}
