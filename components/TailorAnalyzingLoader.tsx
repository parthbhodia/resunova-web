"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Polished loading state for the Tailor match analysis (~20s LLM pass).
 * Replaces the bare "Analysing your résumé…" card with a stepped progress
 * experience that shows what's happening and fills the workspace calmly.
 *
 * The steps are illustrative of the real pipeline (read → score → gaps →
 * fixes); the last step holds until the actual result arrives and this
 * component unmounts, so it never implies completion early.
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

const STEP_MS = 4600; // advance cadence; last step holds until unmount

const iconWrap: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
  display: "grid", placeItems: "center", transition: "background .3s, color .3s, border-color .3s",
};

export default function TailorAnalyzingLoader() {
  const reduce = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setActive((a) => Math.min(a + 1, STEPS.length - 1));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

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
            Analysing your résumé
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 1 }}>
            Usually about 20 seconds — hang tight, no need to refresh.
          </div>
        </div>
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
        {STEPS.map((s, i) => {
          const done = i < active;
          const current = i === active;
          const tone = done ? "var(--green, #34d399)" : current ? "var(--accent)" : "var(--dim)";
          return (
            <div
              key={s.key}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 6px", borderRadius: 10,
                background: current ? "var(--accent-bg)" : "transparent",
                opacity: done || current ? 1 : 0.6, transition: "background .3s, opacity .3s",
              }}
            >
              <span
                style={{
                  ...iconWrap,
                  border: `1px solid ${done ? "var(--green, #34d399)" : current ? "var(--accent)" : "var(--border)"}`,
                  background: done ? "var(--green-bg, rgba(52,211,153,.14))" : current ? "var(--surface)" : "var(--surface2)",
                  color: tone,
                }}
                aria-hidden
              >
                <span style={{ width: 17, height: 17, display: "grid", placeItems: "center" }}>
                  {done ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : current ? (
                    <span className="rb-an-spin" style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid var(--accent-bg)", borderTopColor: "var(--accent)", animation: "rbAnSpin .8s linear infinite" }} />
                  ) : (
                    s.icon
                  )}
                </span>
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: current || done ? 700 : 600,
                  color: current ? "var(--text)" : done ? "var(--text)" : "var(--muted)",
                }}>
                  {s.label}
                </div>
                {current && (
                  <div className="rb-an-pulse" style={{ fontSize: 12, color: "var(--muted)", marginTop: 1, animation: "rbAnPulse 1.6s ease-in-out infinite" }}>
                    {s.sub}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
