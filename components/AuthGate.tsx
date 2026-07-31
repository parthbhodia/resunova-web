"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearForceLandingAfterSignOut,
  readForceLandingAfterSignOut,
} from "@/lib/authSignOut";
import { urlRequestsPublicAppView } from "@/lib/anonScan";
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
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "var(--bg)",
    }}>
      <div style={{
        width: "min(420px, 100%)", textAlign: "center",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "30px 26px",
      }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
          Sign in to continue
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
          {label
            ? `${label} needs a free account so your work is saved to it.`
            : "This page needs a free account so your work is saved to it."}
        </p>
        <button
          type="button"
          onClick={() => openSignIn()}
          style={{
            width: "100%", padding: "11px 18px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "#fff",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Sign in, it&apos;s free
        </button>
        <Link
          href="/"
          style={{
            display: "inline-block", marginTop: 14,
            fontSize: 13, fontWeight: 600, color: "var(--muted)", textDecoration: "none",
          }}
        >
          Back to home
        </Link>
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
    } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
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
