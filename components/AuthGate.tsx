"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { SVGProps } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearForceLandingAfterSignOut,
  readForceLandingAfterSignOut,
} from "@/lib/authSignOut";
import { signInWithGoogle, urlRequestsPublicAppView } from "@/lib/anonScan";
import { nextGateSession } from "@/lib/authGateSession";
import { useSignInDialog } from "./SignInDialog";
import LandingPage from "./LandingPage";
import AppShellSkeleton from "./app-shell/AppShellSkeleton";

/** Human name for a gated route, so the prompt says what you were heading to. */
const GATED_ROUTE_LABELS: Record<string, string> = {
  "/interview-prep": "Interview Prep",
  "/my-resumes": "My Résumés",
  "/account": "your account",
};

function gatedRouteLabel(pathname: string | null): string | null {
  if (!pathname) return null;
  const trimmed = pathname.replace(/\/$/, "");
  for (const [prefix, label] of Object.entries(GATED_ROUTE_LABELS)) {
    if (trimmed === prefix || trimmed.startsWith(prefix + "/")) return label;
  }
  return null;
}

/**
 * Shown when a signed-out visitor opens a route that needs an account.
 *
 * The previous behaviour rendered the marketing landing page here while the
 * URL still read /interview-prep — indistinguishable from being silently
 * teleported home. Keeping the URL and naming the destination means the
 * visitor knows what happened and lands where they meant to after signing in.
 */
function SignInRequired({ pathname }: { pathname: string | null }) {
  const { openSignIn } = useSignInDialog();
  const label = gatedRouteLabel(pathname);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  
  // Context-aware features based on route
  const getFeaturesByRoute = () => {
    if (pathname?.includes("interview-prep")) {
      return [
        { icon: "timer", text: "5-10 min sessions" },
        { icon: "target", text: "Role-specific scenarios" },
        { icon: "chart", text: "Track improvement" },
        { icon: "sparkles", text: "AI feedback" },
      ];
    } else if (pathname?.includes("my-resumes")) {
      return [
        { icon: "save", text: "Save all versions" },
        { icon: "list", text: "Multiple templates" },
        { icon: "zap", text: "Quick access" },
        { icon: "refresh", text: "Easy updates" },
      ];
    }
    return [
      { icon: "timer", text: "Start instantly" },
      { icon: "sparkles", text: "AI-powered tools" },
      { icon: "chart", text: "Real-time feedback" },
      { icon: "lock", text: "Always private" },
    ];
  };

  // SVG icon renderer
  const renderFeatureIcon = (iconType: string) => {
    const svgProps: SVGProps<SVGSVGElement> = {
      width: 20,
      height: 20,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
    switch (iconType) {
      case "timer":
        return <svg {...svgProps}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /></svg>;
      case "target":
        return <svg {...svgProps}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
      case "chart":
        return <svg {...svgProps}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>;
      case "sparkles":
        return <svg {...svgProps}><path d="M9.26 9a2 2 0 0 0 2.36-2.75.5.5 0 0 1 .87-.5A3 3 0 0 1 8 9.75.5.5 0 0 1 9.26 9z" /><path d="M6.27 4.27a1 1 0 0 0 1.46 1.46" /><path d="M17.27 19.27a1 1 0 0 0 1.46 1.46" /><path d="M18.27 7.27a1 1 0 0 0 1.46 1.46" /><path d="M5.27 16.27a1 1 0 0 0 1.46 1.46" /></svg>;
      case "save":
        return <svg {...svgProps}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>;
      case "list":
        return <svg {...svgProps}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
      case "zap":
        return <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
      case "refresh":
        return <svg {...svgProps}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36" /></svg>;
      case "lock":
        return <svg {...svgProps}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
      default:
        return null;
    }
  };

  const features = getFeaturesByRoute();
  
  // Social proof based on route
  const getSocialProof = () => {
    if (pathname?.includes("interview-prep")) {
      return { stat: "5,000+", desc: "students practicing with Resunova", achievement: "95% report improved confidence" };
    } else if (pathname?.includes("my-resumes")) {
      return { stat: "50,000+", desc: "resumes saved and improved", achievement: "3x higher interview rate" };
    }
    return { stat: "100,000+", desc: "students and job seekers trust Resunova", achievement: "Trusted by students at 500+ universities" };
  };

  const socialProof = getSocialProof();

  const handleGoogle = async () => {
    setOauthBusy(true);
    setOauthError(null);
    const err = await signInWithGoogle();
    if (err) {
      setOauthError(err);
      setOauthBusy(false);
    }
  };
  
  // Get icon based on route
  const getIcon = () => {
    if (pathname?.includes("interview-prep")) {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    } else if (pathname?.includes("my-resumes")) {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="13" x2="8" y2="13" />
          <line x1="12" y1="17" x2="8" y2="17" />
        </svg>
      );
    }
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "linear-gradient(135deg, var(--bg) 0%, var(--surface) 100%)",
    }}>
      <div style={{
        width: "min(520px, 100%)",
        maxWidth: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "20px",
        padding: "48px 40px",
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.12)",
      }}>
        {/* Icon badge with animation */}
        <div style={{
          marginBottom: "28px",
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "72px",
            height: "72px",
            borderRadius: "16px",
            background: "var(--accent-bg)",
            transition: "all 0.3s ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px var(--accent-bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
          >
            {getIcon()}
          </div>
        </div>

        {/* Social proof stats */}
        <div style={{
          marginBottom: "24px",
          padding: "16px",
          borderRadius: "12px",
          background: "var(--accent-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)", marginRight: "4px" }}>
            <polygon points="12 2 15.09 10.26 24 10.27 17.77 16.14 20.16 24.29 12 18.53 3.84 24.29 6.23 16.14 0 10.27 8.91 10.26 12 2" />
          </svg>
          <span style={{
            fontSize: "16px",
            fontWeight: "800",
            color: "var(--accent)",
            marginRight: "4px",
          }}>
            {socialProof.stat}
          </span>
          <span style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--text)",
          }}>
            {socialProof.desc}
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          margin: "0 0 12px",
          fontSize: "32px",
          fontWeight: "800",
          letterSpacing: "-0.8px",
          color: "var(--text)",
          lineHeight: 1.2,
        }}>
          {label ? `Start ${label.toLowerCase()}` : "Unlock your potential"}
        </h1>

        {/* Achievement badge */}
        <p style={{
          margin: "0 0 24px",
          fontSize: "14px",
          color: "var(--accent)",
          fontWeight: "700",
          letterSpacing: "0.3px",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {socialProof.achievement}
        </p>

        {/* Subheading */}
        <p style={{
          fontSize: "15px",
          color: "var(--muted)",
          lineHeight: "1.7",
          maxWidth: "420px",
          margin: "0 auto 32px",
        }}>
          {label
            ? `Create your free account to save progress, track improvements, and unlock all ${label.toLowerCase()} features instantly.`
            : "Create your free account in 30 seconds. No credit card. Full access to all features."}
        </p>

        {/* Feature grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "32px",
        }}>
          {features.map((f) => (
            <div
              key={f.text}
              style={{
                padding: "14px 12px",
                borderRadius: "12px",
                background: "var(--accent-bg)",
                border: "1px solid rgba(47, 129, 247, 0.2)",
                transition: "all 0.2s ease-out",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent-bg)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(47, 129, 247, 0.4)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent-bg)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(47, 129, 247, 0.2)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{
                marginBottom: "8px",
                display: "flex",
                justifyContent: "center",
                color: "var(--accent)",
              }}>
                {renderFeatureIcon(f.icon)}
              </div>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                lineHeight: 1.3,
              }}>
                {f.text}
              </div>
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => openSignIn({ reason: `Ready to ${label?.toLowerCase() || "get started"}?` })}
          disabled={oauthBusy}
          style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: "12px",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "700",
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.2s ease-out",
            marginBottom: "12px",
            letterSpacing: "-0.3px",
            opacity: oauthBusy ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 32px rgba(47, 129, 247, 0.35)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(47, 129, 247, 0.3)";
          }}
        >
          Create free account
        </button>

        {/* Secondary CTA — Google OAuth inline */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          fontSize: "13px",
          color: "var(--dim)",
        }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span>or</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={oauthBusy}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: "15px",
            fontWeight: "600",
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.2s ease-out",
            marginBottom: "20px",
            opacity: oauthBusy ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-bg)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(47, 129, 247, 0.3)";
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--muted)";
          }}
        >
          {oauthBusy ? "Opening Google…" : "Continue with Google"}
        </button>

        {oauthError ? (
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--red)", lineHeight: 1.5 }}>
            {oauthError}
          </p>
        ) : null}

        {/* Footer link */}
        <Link
          href="/"
          style={{
            display: "block",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--accent)",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLElement).style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLElement).style.textDecoration = "none";
          }}
        >
          ← Back to home
        </Link>

        {/* Trust badges */}
        <p style={{
          marginTop: "20px",
          fontSize: "11px",
          color: "var(--dim)",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}>
          <span>✓ No credit card</span>
          <span>•</span>
          <span>✓ Free forever</span>
          <span>•</span>
          <span>✓ Privacy first</span>
        </p>
      </div>
    </div>
  );
}

// Routes that intentionally bypass auth — design-system / preview pages.
const PUBLIC_ROUTES = new Set<string>([
  "/editor-preview",
  "/profile-mockup",
  "/landing-preview",
  "/tailor-preview",
  "/terms",
  "/privacy",
  "/contact",
  "/pricing",
  "/blog",
  "/resume-examples",
  "/jobs",
  "/ats-resume-checker",
  "/cover-letter",
  "/skills-for-resume",
  "/template-builder",
  "/templates",
  "/profile",
  "/reset-password",
]);
// Path prefixes that bypass auth — recipient share pages live at /r/<shortid>,
// programmatic SEO role pages at /resume-examples/<role>, comparisons at /compare/<slug>.
const PUBLIC_PREFIXES = ["/r/", "/blog/", "/resume-examples/", "/skills-for-resume/", "/compare/", "/jobs/"];

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const trimmed = pathname.replace(/\/$/, "");
  if (PUBLIC_ROUTES.has(trimmed)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/** App shell lives at `/` (query params only). Marketing must render without waiting on auth. */
function isHomePath(pathname: string | null): boolean {
  if (!pathname) return true;
  const trimmed = pathname.replace(/\/$/, "");
  return trimmed === "" || trimmed === "/";
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);

  // IMPORTANT: initial state is `null` (signed-out) so the static HTML contains
  // the full landing page — crawlable by Google. The effect below swaps in the
  // dashboard once we confirm the user is signed in on the client.
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [forceLanding, setForceLanding] = useState(false);
  // Anonymous free-scan entry: `/?view=analyze` renders the app shell without a
  // session (one free scan; full report locks behind sign-in). Read from
  // window.location — NOT useSearchParams, which would swap the prerendered
  // landing HTML for a Suspense fallback in the static export. Entry points use
  // full navigations, so a mount-time read (+popstate) is sufficient. Sticky for
  // the JS session so in-app view switches don't bounce the user to landing.
  const [anonView, setAnonView] = useState(false);

  useEffect(() => {
    const check = () => {
      if (urlRequestsPublicAppView()) setAnonView(true);
    };
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);

  useEffect(() => {
    setForceLanding(readForceLandingAfterSignOut());
    // Public documents never need auth to render. Avoid initializing Supabase so
    // SEO/local-preview pages also work when client auth env vars are absent.
    if (publicRoute) {
      setChecked(true);
      return;
    }
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        clearForceLandingAfterSignOut();
        setForceLanding(false);
      }
      setChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((ev, s) => {
      // Only an explicit sign-out ends the session here. supabase-js re-emits
      // on tab refocus and token refresh, and those re-emits do not always
      // carry a session; taking a momentary null at face value unmounted every
      // route under this gate and destroyed whatever was in progress.
      setSession((prev) => nextGateSession(prev, ev, s));
      if (s) {
        clearForceLandingAfterSignOut();
        setForceLanding(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [publicRoute]);

  if (publicRoute) return <>{children}</>;

  const isHome = isHomePath(pathname);

  // Local dev: allow the app without login, unless the user explicitly signed out.
  if (DEV_BYPASS && !forceLanding) {
    if (!isHome || checked) {
      if (!session) return <>{children}</>;
    }
  }

  // Homepage: always ship marketing HTML first (Google OAuth reviewers, bots, signed-out users).
  // Do not show an auth spinner on `/` — static export would contain only the spinner otherwise.
  if (isHome) {
    if (forceLanding || !session) {
      // Public app views (analyze / jobs / builder) — let the signed-out
      // visitor into the app shell. Sign-in CTAs inside the shell gate the
      // actions that need an account (save, export, etc.).
      if (anonView) return <>{children}</>;
      return <LandingPage />;
    }
    return <>{children}</>;
  }

  // Session still resolving on a non-home route: draw the shell that is about
  // to appear rather than a spinner on an empty page.
  if (!checked) return <AppShellSkeleton />;

  // A gated route while signed out: say so, keep the URL. Rendering the
  // marketing page here read as an unexplained bounce to the homepage.
  if (!session) return <SignInRequired pathname={pathname} />;

  return <>{children}</>;
}
