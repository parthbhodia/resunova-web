"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { SVGProps } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearForceLandingAfterSignOut,
  readForceLandingAfterSignOut,
  subscribeForceLandingAfterSignOut,
} from "@/lib/authSignOut";
import { isPublicAppView, signInWithGoogle, urlRequestsPublicAppView } from "@/lib/anonScan";
import { nextGateSession } from "@/lib/authGateSession";
import { useSignInDialog } from "./SignInDialog";
import LandingPage from "./LandingPage";
import AppShellSkeleton from "./app-shell/AppShellSkeleton";
import { VIEW_LABELS, type AppView } from "./app-shell/nav-config";

/** Human name for a gated route, so the prompt says what you were heading to. */
const GATED_ROUTE_LABELS: Record<string, string> = {
  "/interview-prep": "Interview Prep",
  "/my-resumes": "My Résumés",
  "/refer": "referrals",
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

  const content = pathname?.includes("interview-prep")
    ? {
        title: "Sign in to continue",
        body: "Interview Prep saves your question sets, progress, and practice history to your account.",
        features: [
          { icon: "timer", text: "Save each practice session" },
          { icon: "target", text: "Keep role-specific question sets" },
          { icon: "chart", text: "Track progress over time" },
        ],
      }
    : pathname?.includes("refer")
      ? {
          title: "Sign in to view referrals",
          body: "Sign in to browse employees who can refer you, send a request, and track it from your profile.",
          features: [
            { icon: "list", text: "Find employees at participating companies" },
            { icon: "save", text: "Track requests from your profile" },
            { icon: "lock", text: "Keep your referral requests attached to your account" },
          ],
        }
      : pathname?.includes("my-resumes")
      ? {
          title: "Sign in to continue",
          body: "My Résumés needs an account so your saved resumes, versions, and exports stay attached to you.",
          features: [
            { icon: "save", text: "Keep all saved resume versions" },
            { icon: "list", text: "Access templates and exports" },
            { icon: "refresh", text: "Pick up where you left off" },
          ],
        }
      : {
          title: "Sign in to continue",
          body: "Create an account to save your work and come back to it anytime.",
          features: [
            { icon: "save", text: "Save your work" },
            { icon: "sparkles", text: "Use every AI workflow" },
            { icon: "lock", text: "Keep it attached to your account" },
          ],
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
        width: "min(460px, 100%)",
        maxWidth: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "18px",
        padding: "40px 32px",
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.12)",
      }}>
        <div style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "60px",
            borderRadius: "14px",
            background: "var(--accent-bg)",
          }}
          >
            {getIcon()}
          </div>
        </div>

        <h1 style={{
          margin: "0 0 12px",
          fontSize: "30px",
          fontWeight: "800",
          letterSpacing: "-0.8px",
          color: "var(--text)",
          lineHeight: 1.2,
        }}>
          {content.title}
        </h1>

        <p style={{
          fontSize: "15px",
          color: "var(--muted)",
          lineHeight: "1.7",
          maxWidth: "380px",
          margin: "0 auto 28px",
        }}>
          {content.body}
        </p>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "32px",
        }}>
          {content.features.map((f) => (
            <div
              key={f.text}
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}>
                {renderFeatureIcon(f.icon)}
              </div>
              <div style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--text)",
                lineHeight: 1.4,
                textAlign: "left",
              }}>
                {f.text}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleGoogle()}
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
          {oauthBusy ? "Opening Google…" : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => openSignIn({ reason: `Sign in or create a free account to open ${label?.toLowerCase() || "your account"}.` })}
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
          Use email instead
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
      </div>
    </div>
  );
}

// Routes that intentionally bypass auth — design-system / preview pages.
// Marketing chrome for the free open subset lives in app/(marketing)/layout.tsx
// (PublicSiteFrame). Not every public path uses that frame (/r, /profile, previews).
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
  // /extension is the public install explainer. /extension/connect is the auth
  // handshake page and MUST stay gated: its only job is to mint a connection
  // code, so rendering it to a signed-out visitor would be a dead end. It is
  // intentionally absent here rather than covered by a prefix.
  "/extension",
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

/**
 * The `?view=` a signed-out visitor asked for that needs an account to open —
 * `cover-letter` today, reached from three CTAs on the public /cover-letter page.
 *
 * Both halves are lookups, never a second hand-kept list: `VIEW_LABELS` is the
 * set of views AppShell can actually render (a `?view=` it doesn't know falls
 * back to "home"), and `isPublicAppView` is the same allowlist AuthGate and the
 * sidebar already share. A marketing surface advertising a view that is missing
 * from PUBLIC_APP_VIEWS is exactly how `/?view=cover-letter` used to answer a
 * signed-out visitor with the marketing hero.
 *
 * `home` is excluded: it's the hub behind the landing page, not something a
 * visitor was denied.
 */
function accountOnlyView(): AppView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = (new URLSearchParams(window.location.search).get("view") || "").toLowerCase();
    if (!raw || raw === "home") return null;
    if (!(raw in VIEW_LABELS)) return null;
    if (isPublicAppView(raw)) return null;
    return raw as AppView;
  } catch {
    return null;
  }
}

/**
 * Sign-in prompt for a view that needs an account, shown IN PLACE at the URL the
 * visitor asked for.
 *
 * The alternative — bouncing to the marketing page — threw away the reason they
 * came: they wanted this view, and the CTA that sent them here said so. Worse,
 * it read as a broken link, because the URL still said `?view=cover-letter`
 * under a hero that has nothing to do with cover letters.
 *
 * Signing in here rather than redirecting is what makes the destination work
 * with no extra plumbing: `signInWithGoogle` stashes the post-login destination
 * and builds its OAuth `redirectTo` from `window.location`, so both already
 * point at `/?view=cover-letter`. The visitor signs in once and lands on the
 * view they clicked.
 *
 * Deliberately NOT an account-bound surface: no dashboard, no résumé list — the
 * same promise `/templates` makes ("open any of them in the builder, no sign-up
 * required"), one step closer to the thing they came for.
 */
function SignInToOpenView({ view }: { view: AppView }) {
  const { openSignIn } = useSignInDialog();
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const label = VIEW_LABELS[view].toLowerCase();

  const handleGoogle = async () => {
    setOauthBusy(true);
    setOauthError(null);
    const err = await signInWithGoogle();
    if (err) {
      setOauthError(err);
      setOauthBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      background: "var(--bg)",
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "16px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "60px",
            borderRadius: "14px",
            background: "var(--accent-bg)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9h6M7 13h10" />
            </svg>
          </div>
        </div>

        <h1 style={{
          margin: "0 0 12px",
          fontSize: "30px",
          fontWeight: "800",
          letterSpacing: "-0.8px",
          color: "var(--text)",
          lineHeight: 1.2,
        }}>
          Sign in to open {label}
        </h1>

        <p style={{
          fontSize: "15px",
          color: "var(--muted)",
          lineHeight: "1.7",
          maxWidth: "380px",
          margin: "0 auto 28px",
        }}>
          {`Create a free account to use the ${label}. Signing in takes you straight there, so this page is not lost.`}
        </p>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "24px",
        }}>
          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={oauthBusy}
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: "12px",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.2s ease-out",
              opacity: oauthBusy ? 0.7 : 1,
            }}
          >
            {oauthBusy ? "Opening Google…" : "Continue with Google"}
          </button>

          <button
            type="button"
            onClick={() => openSignIn({ reason: `Sign in or create a free account to open ${label}.` })}
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
              opacity: oauthBusy ? 0.7 : 1,
            }}
          >
            Use email instead
          </button>
        </div>

        {oauthError && (
          <p style={{ fontSize: "14px", color: "#c0392b", margin: 0 }}>{oauthError}</p>
        )}
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);

  // IMPORTANT: initial state is `null` (signed-out) so the static HTML contains
  // the full landing page — crawlable by Google. The effect below swaps in the
  // dashboard once we confirm the user is signed in on the client.
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const forceLanding = useSyncExternalStore(
    subscribeForceLandingAfterSignOut,
    readForceLandingAfterSignOut,
    () => false,
  );
  // Anonymous free-scan entry: `/?view=analyze` renders the app shell without a
  // session (one free scan; full report locks behind sign-in). Read from
  // window.location — NOT useSearchParams, which would swap the prerendered
  // landing HTML for a Suspense fallback in the static export. Entry points use
  // full navigations, so a mount-time read (+popstate) is sufficient. Sticky for
  // the JS session so in-app view switches don't bounce the user to landing.
  const [anonView, setAnonView] = useState(false);

  // A view the app can render but signed-out visitors may not open. Kept beside
  // anonView because both are answers to the same question ("what did this URL
  // ask for?") read from the same place, on the same trigger.
  const [accountView, setAccountView] = useState<AppView | null>(null);

  // Re-check when the path changes: client navigations from a marketing route
  // (e.g. /pricing → /?view=analyze) do not fire popstate, and a one-shot mount
  // read would leave anonView false and trap the visitor on the marketing home.
  useEffect(() => {
    const check = () => {
      if (urlRequestsPublicAppView()) setAnonView(true);
      setAccountView(accountOnlyView());
    };
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, [pathname]);

  useEffect(() => {
    // Still resolve the session on public routes; without a session here, a
    // signed-in visitor who then opens /?view=analyze flashes (or sticks on)
    // the marketing landing until a full remount. Missing env is non-fatal so
    // static SEO previews keep working.
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) {
          clearForceLandingAfterSignOut();
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
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setChecked(true);
      });
    }
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
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
      // A view that needs an account (cover letter, today). Same reasoning as
      // the gated routes below, and for the same reason: say so and KEEP THE
      // URL, so signing in here lands the visitor on the view they asked for.
      // Rendering the marketing page left `?view=cover-letter` in the address
      // bar above a hero that had nothing to do with cover letters.
      if (accountView) return <SignInToOpenView view={accountView} />;
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
