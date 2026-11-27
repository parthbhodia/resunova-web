"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import { useSignInDialog } from "@/components/SignInDialog";
import { JOBS_ENABLED } from "@/lib/featureFlags";
import { T, useLandingTheme } from "@/components/landing/landingTheme";

const SCORE_CTA = "Score my résumé free";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Resume Analyzer", href: "/?view=analyze" },
  ...(JOBS_ENABLED ? [{ label: "Job Board", href: "/jobs/" }] : []),
  { label: "Templates", href: "/templates" },
  { label: "Interview Prep", href: "/interview-prep" },
  { label: "Pricing", href: "/pricing" },
];

/**
 * Homepage marketing header. One bar: five destinations, sign in, and the
 * score action. The signed-in app keeps its own rail.
 */
export default function LandingHeader({
  dark,
  toggleTheme,
  signIn,
}: {
  dark: boolean;
  toggleTheme: () => void;
  signIn: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ink = dark ? T.dInk : T.ink;
  const muted = dark ? T.dMuted : T.muted;
  const border = dark ? "rgba(255,255,255,0.16)" : T.border;

  const goScore = () => {
    window.location.href = "/?view=analyze";
  };

  return (
    <header className="lp-header" style={{
      position: "sticky", top: 0, zIndex: 100, width: "100%",
      height: 72,
      background: dark
        ? "linear-gradient(180deg, rgba(13,17,23,0.98) 0%, rgba(13,17,23,0.95) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)",
      backdropFilter: "blur(16px) saturate(150%)",
      WebkitBackdropFilter: "blur(16px) saturate(150%)",
      borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: dark
        ? "0 4px 16px rgba(0,0,0,0.2)"
        : "0 4px 12px rgba(0,0,0,0.04)",
    }}>
      <div className="lp-header-inner" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "100%", maxWidth: 1320, margin: "0 auto", padding: "0 16px", gap: 16,
      }}>
        <style>{`
          @media (min-width: 768px) { .lp-header-inner { padding: 0 40px !important; } }
          @media (min-width: 1024px) { .md-flex { display: flex !important; } }
          @media (min-width: 1024px) { .md-hide { display: none !important; } }
        `}</style>

        <Link
          href="/?view=analyze"
          prefetch={false}
          style={{ flexShrink: 0, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center" }}
          aria-label="Resunova, resume analyzer"
        >
          <LogoFull markSize={32} textColor={dark ? "#ffffff" : "#0f172a"} />
        </Link>

        <nav className="lp-nav hidden md-flex" aria-label="Primary" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 4, height: "100%", flex: "1 1 auto", minWidth: 0 }}>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: dark ? "rgba(255,255,255,0.82)" : T.muted,
                fontSize: 14, fontWeight: 600, textDecoration: "none",
                padding: "8px 10px", borderRadius: 8, whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={toggleTheme}
            title={dark ? "Light mode" : "Dark mode"}
            aria-label={dark ? "Light mode" : "Dark mode"}
            style={{
              width: 44, height: 44, borderRadius: 10,
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: muted,
            }}
          >
            {dark
              ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11 6 6 0 008-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            }
          </button>

          <div className="md-flex hidden" style={{ display: "none", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={signIn}
              style={{
                background: "transparent",
                border: `1.5px solid ${border}`,
                color: ink,
                fontSize: 14,
                fontWeight: 650,
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={goScore}
              style={{
                background: T.hot,
                color: T.hotInk,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {SCORE_CTA}
            </button>
          </div>

          <button
            type="button"
            className="lp-nav-burger md-hide"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              width: 44, height: 44, borderRadius: 8,
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer", alignItems: "center", justifyContent: "center", display: "flex",
              color: ink,
            }}
          >
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="lp-nav-menu"
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99,
            background: dark ? "rgba(13,17,23,0.98)" : "rgba(255,255,255,0.98)",
            borderBottom: `1px solid ${dark ? T.dBorder : T.border}`,
            display: "flex", flexDirection: "column",
            maxHeight: "calc(100vh - 72px)", overflowY: "auto",
            padding: "8px 20px 24px",
          }}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "14px 0", fontSize: 17, fontWeight: 600, color: ink,
                textDecoration: "none", borderBottom: `1px solid ${dark ? T.dBorder : T.border}`,
                minHeight: 44, display: "flex", alignItems: "center",
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 20 }}>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); signIn(); }}
              style={{
                width: "100%", background: "transparent", border: `1.5px solid ${border}`, color: ink,
                minHeight: 44, fontSize: 16, fontWeight: 650, borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); goScore(); }}
              style={{
                width: "100%", background: T.hot, border: "none", color: T.hotInk,
                minHeight: 44, fontSize: 16, fontWeight: 700, borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {SCORE_CTA}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/** Homepage header with its own theme toggle and sign-in, for public pages. */
export function HomepageHeader() {
  const [theme, toggleTheme] = useLandingTheme();
  const { openSignIn } = useSignInDialog();
  return <LandingHeader dark={theme === "dark"} toggleTheme={toggleTheme} signIn={() => openSignIn()} />;
}
