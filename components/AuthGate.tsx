"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import {
  clearForceLandingAfterSignOut,
  readForceLandingAfterSignOut,
  subscribeForceLandingAfterSignOut,
} from "@/lib/authSignOut";
import { isPublicAppView, urlRequestsPublicAppView } from "@/lib/anonScan";
import { nextGateSession } from "@/lib/authGateSession";
import LandingPage from "./LandingPage";
import SignInRequiredPage from "./auth/SignInRequiredPage";
import AppShellSkeleton from "./app-shell/AppShellSkeleton";
import { VIEW_LABELS, type AppView } from "./app-shell/nav-config";

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
  // /profile is NOT here: it is the signed-in account hub (plan, usage,
  // referral alerts, Career Memory) and ProfilePage has no signed-out state.
  // While it was public, an anonymous visitor got the full dashboard with a
  // "Signed in account" header and a working "Sign out" button.
  "/reset-password",
  // /refer is the public referral directory. Anonymous visitors get the page,
  // the company grid and the open referrers; the ask form prompts sign-in at
  // the action. See migration 061 for the matching anon read grant.
  "/refer",
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
      if (accountView) return <SignInRequiredPage pathname={pathname} view={accountView} />;
      return <LandingPage />;
    }
    return <>{children}</>;
  }

  // Session still resolving on a non-home route: draw the shell that is about
  // to appear rather than a spinner on an empty page.
  if (!checked) return <AppShellSkeleton />;

  // A gated route while signed out: say so, keep the URL. Rendering the
  // marketing page here read as an unexplained bounce to the homepage.
  if (!session) return <SignInRequiredPage pathname={pathname} />;

  return <>{children}</>;
}
