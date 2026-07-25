"use client";

/**
 * FeaturedCompaniesRail — "Top companies hiring" shelf at the top of the Jobs
 * feed. A curated set of recognizable companies that have LIVE openings right
 * now (counts come from the server, computed live — a company that empties out
 * drops off, so a tile is never dead). Clicking a card scopes the feed to that
 * company; clicking the active card (or the Clear control) removes the scope.
 *
 * Secondary discovery strip, not the primary content — a horizontal rail keeps
 * the job feed below it visible instead of a 100-tile grid pushing it off-screen.
 */
import { useEffect, useState } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import { fetchFeaturedCompanies, type FeaturedCompany } from "@/lib/jobsApi";

export default function FeaturedCompaniesRail({
  selected = "",
  onSelect,
}: {
  /** Currently-scoped company (case-insensitive) — its card is highlighted. */
  selected?: string;
  /** Toggle a company scope. Passing the already-selected company clears it. */
  onSelect: (company: string) => void;
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

  // Loading: reserve the rail height (no layout shift) with skeleton tiles.
  if (companies === null) {
    return (
      <div style={{ margin: "2px 0 6px" }}>
        <div style={{ height: 15, width: 150, background: "var(--surface2)", borderRadius: 6, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ width: 162, height: 86, flexShrink: 0, borderRadius: 12, background: "var(--surface2)" }} />
          ))}
        </div>
      </div>
    );
  }
  // Endpoint returned nothing (or failed) → render nothing. Never a dead rail.
  if (companies.length === 0) return null;

  return (
    <section aria-label="Top companies hiring" style={{ margin: "2px 0 8px" }}>
      <style>{`
        .rn-co-rail::-webkit-scrollbar{height:8px}
        .rn-co-rail::-webkit-scrollbar-thumb{background:var(--surface2);border-radius:4px}
        .rn-co-card{transition:transform .16s ease,border-color .16s ease}
        .rn-co-card:hover{transform:translateY(-2px);border-color:var(--accent)}
        .rn-co-card:focus-visible{outline:none;box-shadow:0 0 0 2px var(--accent)}
      `}</style>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Top companies hiring</span>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(selected)}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          >
            Clear ✕
          </button>
        )}
      </div>
      <div
        className="rn-co-rail"
        role="list"
        style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x proximity" }}
      >
        {companies.map((c) => {
          const active = selected.toLowerCase() === c.company.toLowerCase();
          return (
            <button
              key={c.company}
              type="button"
              role="listitem"
              aria-pressed={active}
              aria-label={`${c.company}, ${c.activeCount.toLocaleString()} open roles`}
              onClick={() => onSelect(c.company)}
              className="rn-co-card"
              style={{
                flexShrink: 0,
                width: 162,
                scrollSnapAlign: "start",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                // -1px padding on the active card offsets the 2px border so the
                // tile size stays fixed (no layout shift on select).
                padding: active ? 11 : 12,
                borderRadius: 12,
                border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: active
                  ? "var(--accent-bg, color-mix(in srgb, var(--accent) 7%, transparent))"
                  : "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <CompanyLogo company={c.company} companyDomain={c.domain} slug="" size={40} radius={10} />
                {active && <span aria-hidden style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>✓</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.company}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
                  {c.activeCount.toLocaleString()} open roles
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
