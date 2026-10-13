"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useSignInDialog } from "@/components/SignInDialog";
import { TAILOR_ROUTE } from "@/lib/tailorRoute";
import { T, useLandingTheme } from "@/components/landing/landingTheme";

/**
 * Homepage marketing header. Public pages that should feel like the homepage
 * render this instead of a one-off bar.
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
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const C = {
    bg: dark ? T.dBg : T.bg,
    bg2: dark ? T.dBg2 : T.bg2,
    ink: dark ? T.dInk : T.ink,
    muted: dark ? T.dMuted : T.muted,
    border: dark ? T.dBorder : T.border,
    surface: dark ? T.dSurface : T.surface,
    glow: dark ? "rgba(37,99,235,0.10)" : T.blueGlow,
    shadow: dark ? "0 28px 72px rgba(0,0,0,0.60)" : "0 28px 72px rgba(13,17,23,0.10)",
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
          height: "100%", maxWidth: 1320, margin: "0 auto", padding: "0 16px"
        }}>
          <style>{`
            @media (min-width: 768px) { .lp-header-inner { padding: 0 40px !important; } }
          `}</style>
          {/* Logo — shared SVG mark + wordmark */}
          <Link href="/" prefetch={false} style={{ flexShrink: 0, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", transition: "opacity 0.2s" }} aria-label="Resunova home" onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
            <LogoFull markSize={32} textColor={dark ? "#ffffff" : "#0f172a"} />
          </Link>

          {/* Center Nav */}
          {/* IN FLOW, deliberately. This nav used to be `position: absolute;
              left: 0; right: 0`, which took it out of the flex row and stretched
              it across the whole header — so it centred on the viewport while
              the logo and the action buttons laid themselves out underneath it.
              Between the 1024px breakpoint and roughly 1200px the two groups
              simply drew on top of each other ("ATS Checker" over "Log In").
              As a flex child it negotiates width like everything else, so the
              overlap is not possible at any viewport. */}
          <nav className="lp-nav hidden md-flex" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 36, height: "100%", flex: "1 1 auto", minWidth: 0 }}>
            <style>{`
              @media (min-width: 1024px) { .md-flex { display: flex !important; } }
              .mega-menu-dropdown {
                position: fixed;
                top: 76px;
                left: 0;
                width: 100vw;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-4px);
                transition: background-color 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.2s ease-out, opacity 0.2s ease-out;
                z-index: 1000;
                pointer-events: none;
                display: flex;
                justify-content: center;
              }
              .mega-menu-trigger:hover .mega-menu-dropdown,
              .mega-menu-dropdown:hover {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
                pointer-events: auto;
              }
              .mega-menu-trigger:hover .mega-chevron {
                transform: rotate(180deg);
              }
              .mega-menu-trigger:hover .features-btn {
                color: #2563eb !important;
              }
            `}</style>
            
            {/* Resume Tools Dropdown */}
            <div className="mega-menu-trigger" style={{ height: "100%", display: "flex", alignItems: "center", position: "relative", cursor: "pointer", pointerEvents: "auto" }}>
              <button
                type="button"
                className="features-btn"
                style={{
                  background: "none", border: "none", color: dark ? "rgba(255,255,255,0.8)" : "#475569", display: "flex", alignItems: "center", gap: 6,
                  fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 500, transition: "color 0.2s ease-out", padding: "8px 12px",
                  borderRadius: "6px", marginRight: "-12px"
                }}
              >
                Features
                <svg className="mega-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {/* Dropdown Container (Attached to navbar) */}
              <div className="mega-menu-dropdown">
                <div style={{
                  width: "100%",
                  background: dark 
                    ? "linear-gradient(180deg, rgba(13,17,23,0.98) 0%, rgba(13,17,23,0.96) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.97) 100%)",
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  boxShadow: dark 
                    ? "0 24px 64px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05)" 
                    : "0 24px 64px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "center",
                  padding: "48px 0",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)"
                }}>
                  <div style={{
                    width: 1216,
                    maxWidth: "100%",
                    display: "grid",
                    gridTemplateColumns: "3fr 2fr 2fr",
                    gap: 64,
                    padding: "0 32px"
                  }}>
                    {/* Column 1: Tools */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {[
                      { title: "ATS Checker", desc: "Get instant feedback for your resume.", icon: <path d="M12 20v-6M6 20V10M18 20V4"/>, href: "/?view=analyze" },
                      { title: "Resume Builder", desc: "Create your best resume yet. Get hired.", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>, href: TAILOR_ROUTE },
                      { title: "Cover Letter", desc: "Let AI write your cover letter.", icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>, href: "/?view=cover-letter" },
                      { title: "Resume Templates", desc: "Designed by typographers, approved by recruiters.", icon: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>, href: "/template-builder" }
                    ].map((item) => (
                      <a
                        key={item.title}
                        href={item.href}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 16,
                          background: "transparent", border: "none",
                          textAlign: "left", cursor: "pointer", transition: "opacity 0.2s",
                          textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, flexShrink: 0,
                          color: T.blue
                        }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {item.icon}
                          </svg>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", fontFamily: "inherit" }}>{item.title}</span>
                          <span style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.6)" : "#64748b", lineHeight: 1.4 }}>{item.desc}</span>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Column 2: Resume Examples */}
                  <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", marginBottom: 20 }}>Resume Examples</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {[
                        { label: "Software Engineer", href: "/resume-examples/software-engineer" },
                        { label: "Data Analyst", href: "/resume-examples/data-analyst" },
                        { label: "Registered Nurse", href: "/resume-examples/registered-nurse" },
                        { label: "Sales Representative", href: "/resume-examples/sales-representative" }
                      ].map(item => (
                        <Link
                          key={item.label}
                          href={item.href}
                          style={{
                            background: "transparent", border: "none", textAlign: "left",
                            fontSize: 14, color: dark ? "rgba(255,255,255,0.7)" : "#475569", cursor: "pointer",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontWeight: 500, textDecoration: "none"
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = dark ? "#ffffff" : "#0f172a"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.7)" : "#475569"; }}
                        >
                          {item.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </Link>
                      ))}
                      <Link
                        href="/resume-examples"
                        style={{
                          background: "transparent", border: "none", textAlign: "left",
                          fontSize: 14, color: T.blue, cursor: "pointer", marginTop: 8,
                          fontWeight: 600, textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        View all examples
                      </Link>
                      <Link
                        href="/skills-for-resume"
                        style={{
                          background: "transparent", border: "none", textAlign: "left",
                          fontSize: 14, color: T.blue, cursor: "pointer",
                          fontWeight: 600, textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        Skills by role
                      </Link>
                    </div>
                  </div>

                  {/* Column 3: Guides */}
                  <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: dark ? "#ffffff" : "#0f172a", marginBottom: 20 }}>Guides</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {[
                        { title: "How to Tailor Your Resume to a Job Description", href: "/blog/tailor-resume-to-job-description" },
                        { title: "How ATS Really Works (And Why You're Invisible, Not Rejected)", href: "/blog/how-ats-really-works" },
                        { title: "Optimizing Résumés for Applicant Tracking Systems", href: "/blog/optimizing-resumes-for-ats" }
                      ].map(post => (
                        <Link
                          key={post.title}
                          href={post.href}
                          style={{
                            background: "transparent", border: "none", textAlign: "left",
                            fontSize: 14, color: dark ? "rgba(255,255,255,0.7)" : "#475569", cursor: "pointer",
                            lineHeight: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                            fontWeight: 500, textDecoration: "none"
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = dark ? "#ffffff" : "#0f172a"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.7)" : "#475569"; }}
                        >
                          {post.title}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0, marginTop: 4 }}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </Link>
                      ))}
                      <Link
                        href="/blog"
                        style={{
                          background: "transparent", border: "none", textAlign: "left",
                          fontSize: 14, color: T.blue, cursor: "pointer", marginTop: 8,
                          fontWeight: 600, textDecoration: "none"
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
                      >
                        View all guides
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {[
              ["Resume Builder", "templates", TAILOR_ROUTE],
              ["Resume Examples", "resume-examples-nav", "/resume-examples/"],
              ["Cover Letter", "cover-letter", "/?view=cover-letter"],
              ["ATS Checker", "analyze", "/?view=analyze"],
              ["Blog", "blog-nav", "/blog/"]
            ].map(([lbl, id, href]) => (
              <Link
                key={id}
                href={href}
                style={{
                  background: "none", border: "none", color: dark ? "rgba(255,255,255,0.8)" : "#475569",
                  fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 500, transition: "color 0.2s ease-out", padding: "8px 12px",
                  textDecoration: "none", pointerEvents: "auto", borderRadius: "6px",
                  marginRight: "-12px"
                }}
                onMouseEnter={e => { 
                  (e.currentTarget as HTMLElement).style.color = T.blue;
                  (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(47,129,247,0.08)" : "rgba(47,129,247,0.06)";
                }}
                onMouseLeave={e => { 
                  (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.8)" : "#475569";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >{lbl}</Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme toggle — kept from the previous header (all breakpoints) */}
            <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"} style={{
              width: 40, height: 40, borderRadius: 10,
              background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: dark ? "rgba(255,255,255,0.6)" : "#64748b", transition: "all 0.2s ease-out",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)";
              (e.currentTarget as HTMLElement).style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
              (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.8)" : "#1e293b";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
              (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.6)" : "#64748b";
            }}
            >
              {dark
                ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11 6 6 0 008-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              }
            </button>
            <div className="md-flex hidden" style={{ display: "none", alignItems: "center", gap: 16 }}>
            <button
              onClick={signIn}
              style={{
                background: "transparent",
                border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
                color: dark ? "rgba(255,255,255,0.8)" : "#475569",
                fontSize: 15,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s ease-out",
                fontFamily: "inherit"
              }}
              onMouseEnter={e => { 
                (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
                (e.currentTarget as HTMLElement).style.color = dark ? "#ffffff" : "#0f172a";
              }}
              onMouseLeave={e => { 
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
                (e.currentTarget as HTMLElement).style.color = dark ? "rgba(255,255,255,0.8)" : "#475569";
              }}
            >
              Sign In
            </button>

            <Button onClick={signIn}
              aria-label="Create My Resume"
              title="Create My Resume"
              style={{
                background: T.hot,
                color: T.hotInk,
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                padding: "10px 28px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.2s ease-out",
                fontFamily: "inherit",
                boxShadow: "0 8px 20px rgba(212,119,47,0.3)"
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.background = T.hotHover;
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 28px rgba(212,119,47,0.4)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.background = T.hot;
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(212,119,47,0.3)";
              }}
            >
              Create Resume
            </Button>
            </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="lp-nav-burger md-hide"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: "transparent",
              border: `1px solid transparent`,
              cursor: "pointer", alignItems: "center", justifyContent: "center", display: "flex",
              color: C.ink, transition: "background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s",
            }}
            onMouseEnter={e => { 
              (e.currentTarget as HTMLElement).style.backgroundColor = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; 
            }}
            onMouseLeave={e => { 
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <style>{`
              @media (min-width: 1024px) { .md-hide { display: none !important; } }
            `}</style>
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
          </div>
        </div>

        {/* Mobile dropdown menu (hamburger target) */}
        {menuOpen && (
          <div
            className="lp-nav-menu"
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 99,
              background: dark ? "rgba(13,17,23,0.98)" : "rgba(255,255,255,0.98)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              borderBottom: `1px solid ${C.border}`,
              boxShadow: dark ? "0 16px 32px rgba(0,0,0,0.5)" : "0 16px 32px rgba(13,17,23,0.12)",
              display: "flex", flexDirection: "column",
              height: "calc(100vh - 76px)", overflowY: "auto",
              padding: "16px 20px 32px",
              animation: "lpMenuIn 0.22s cubic-bezier(0.22,1,0.36,1) both",
              transformOrigin: "top",
            }}
          >
            {/* Features Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Features" ? null : "Features")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Features
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Features" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Features" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { title: "ATS Checker", desc: "Get instant feedback for your resume.", href: "/?view=analyze" },
                    { title: "Resume Builder", desc: "Create your best resume yet. Get hired.", href: TAILOR_ROUTE },
                    { title: "Cover Letter", desc: "Let AI write your cover letter.", href: "/?view=cover-letter" },
                    { title: "Resume Templates", desc: "Designed by typographers, approved by recruiters.", href: "/template-builder" }
                  ].map(item => (
                    <Link key={item.title} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{item.title}</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{item.desc}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Resume Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Resume" ? null : "Resume")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Resume
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Resume" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Resume" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { title: "Software Engineering", desc: "Modern technical resume example.", href: "/template-builder/?preset=modern" },
                    { title: "Business & Strategy", desc: "Executive layout with strong hierarchy.", href: "/template-builder/?preset=executive" },
                    { title: "Academic CV", desc: "Classic styling for formal applications.", href: "/template-builder/?preset=classic" },
                  ].map(item => (
                    <Link key={item.title} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>{item.title}</span>
                        <span style={{ fontSize: 13, color: C.muted }}>{item.desc}</span>
                      </div>
                    </Link>
                  ))}
                  <Link href="/template-builder" onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: T.blue, textDecoration: "none", fontWeight: 600, marginTop: 4 }}>
                    View all templates →
                  </Link>
                </div>
              )}
            </div>

            <Link href="/resume-examples/" onClick={() => setMenuOpen(false)} style={{ padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              Resume Examples
            </Link>

            {/* Cover Letter Accordion */}
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <button
                type="button"
                onClick={() => setMobileExpanded(o => o === "Cover Letter" ? null : "Cover Letter")}
                style={{
                  width: "100%", background: "none", border: "none", textAlign: "left",
                  padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink,
                  fontFamily: "inherit", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                Cover Letter
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: mobileExpanded === "Cover Letter" ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {mobileExpanded === "Cover Letter" && (
                <div style={{ paddingBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  <Link href="/?view=cover-letter" onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 16, fontWeight: 500, color: C.ink }}>AI Cover Letter Writer</span>
                      <span style={{ fontSize: 13, color: C.muted }}>Generate a tailored cover letter in seconds.</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/?view=analyze" onClick={() => setMenuOpen(false)} style={{ padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              ATS Checker
            </Link>
            
            <Link href="/blog/" onClick={() => setMenuOpen(false)} style={{ padding: "16px 0", fontSize: 18, fontWeight: 500, color: C.ink, textDecoration: "none", borderBottom: `1px solid ${C.border}` }}>
              Blog
            </Link>

            {/* Bottom Actions */}
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12, paddingTop: 32 }}>
              <button
                onClick={() => { setMenuOpen(false); signIn(); }}
                style={{
                  width: "100%", background: "transparent", border: `1px solid ${C.border}`, color: C.ink,
                  padding: "12px", fontSize: 16, fontWeight: 600, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.2s"
                }}
              >
                Log In
              </button>
              <button
                onClick={() => { setMenuOpen(false); signIn(); }}
                style={{
                  width: "100%", background: T.hot, border: "none", color: T.hotInk,
                  padding: "12px", fontSize: 16, fontWeight: 700, borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                  transition: "opacity 0.2s"
                }}
              >
                Create My Resume
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
