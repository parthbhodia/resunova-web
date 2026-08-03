"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Honest indeterminate state for Tailor match analysis. The API is currently
 * one request, so the client cannot truthfully mark individual server stages
 * complete. We show the work included and elapsed time without fake progress.
 */

type Step = { key: string; label: string; sub: string; icon: ReactNode };

const STEPS: Step[] = [
  {
    key: "read",
    label: "Reading your résumé",
    sub: "Parsing structure, roles, and bullets",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h5M10 17h5" /></svg>
    ),
  },
  {
    key: "score",
    label: "Scoring the match",
    sub: "Comparing you against what this job asks for",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>
    ),
  },
  {
    key: "gaps",
    label: "Finding gaps & keywords",
    sub: "Qualifications, responsibilities, and missing terms",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
    ),
  },
  {
    key: "fixes",
    label: "Preparing your fixes",
    sub: "Targeted rewrites you can apply in a click",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4M3 5h4M6 17v4M4 19h4" /><path d="M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" /></svg>
    ),
  },
];

const iconWrap: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
  display: "grid", placeItems: "center", transition: "background .3s, color .3s, border-color .3s",
};

export default function TailorAnalyzingLoader() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="fade-in"
      role="status"
      aria-live="polite"
      aria-label="Analysing your résumé"
      style={{
        margin: "0 auto", maxWidth: 560, width: "100%",
        borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface)",
        boxShadow: "var(--shadow-card)", padding: "26px 26px 22px",
        display: "flex", flexDirection: "column", gap: 20,
        cursor: "default", caretColor: "transparent", userSelect: "none",
      }}
    >
      <style>{`
        @keyframes rbAnSpin { to { transform: rotate(360deg); } }
        @keyframes rbAnPulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
        @keyframes rbAnBar { from { transform: translateX(-100%); } to { transform: translateX(320%); } }
        @media (prefers-reduced-motion: reduce) {
          .rb-an-spin, .rb-an-pulse, .rb-an-bar-i { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className="rb-an-spin"
          style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            border: "2.5px solid var(--accent-bg)", borderTopColor: "var(--accent)",
            animation: "rbAnSpin .8s linear infinite",
          }}
          aria-hidden
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.4, color: "var(--text)" }}>
            Matching your résumé to this job
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 1 }}>
            Detailed evidence check in progress — no need to refresh.
          </div>
        </div>
        {elapsedSeconds >= 5 ? (
          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {elapsedSeconds}s
          </span>
        ) : null}
      </div>

      {/* Indeterminate progress sliver */}
      <div style={{ height: 4, borderRadius: 999, background: "var(--surface2)", overflow: "hidden" }}>
        <div className="rb-an-bar-i" style={{
          width: "30%", height: "100%", borderRadius: 999,
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
          animation: "rbAnBar 1.4s ease-in-out infinite",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STEPS.slice(0, 3).map((s) => {
          return (
            <div
              key={s.key}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 6px", borderRadius: 10,
                background: "var(--surface2)",
              }}
            >
              <span
                style={{
                  ...iconWrap,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                }}
                aria-hidden
              >
                <span style={{ width: 17, height: 17, display: "grid", placeItems: "center" }}>
                  {s.icon}
                </span>
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 650,
                  color: "var(--text)",
                }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
      {elapsedSeconds >= 45 ? (
        <div style={{ padding: "9px 11px", borderRadius: 9, background: "var(--amber-bg, rgba(180,83,9,0.12))", color: "var(--amber-ink, #92400e)", fontSize: 12, lineHeight: 1.45 }}>
          This is taking longer than usual. We&rsquo;re still waiting for the analysis service; you can leave this tab open.
        </div>
      ) : null}
    </div>
  );
}
