"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearForceLandingAfterSignOut,
  readForceLandingAfterSignOut,
} from "@/lib/authSignOut";
import { urlRequestsPublicAppView } from "@/lib/anonScan";
import LandingPage from "./LandingPage";
import AppShellSkeleton from "./app-shell/AppShellSkeleton";

// Routes that intentionally bypass auth — design-system / preview pages.
const PUBLIC_ROUTES = new Set<string>([
  "/editor-preview",
  "/profile-mockup",
  "/landing-preview",
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

  if (!session) return <LandingPage />;

  return <>{children}</>;
}
