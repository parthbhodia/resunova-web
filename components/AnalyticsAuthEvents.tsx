"use client";

/**
 * Reports `sign_up` / `login` to GA4.
 *
 * Nothing in the app reported a conversion before this: `gtag('config')` sends
 * page views only, so GA could not join any traffic to an account being
 * created. Supabase is the only source of truth for that, and this listens to
 * it.
 *
 * Two details matter for the numbers to mean anything:
 *
 *  - `INITIAL_SESSION` also fires on every page load for an already-signed-in
 *    visitor, and `SIGNED_IN` fires again on tab focus in some browsers.
 *    sessionStorage remembers the accounts already reported in this tab, so a
 *    refresh is not a second login.
 *  - The current `?view=` rides along as an event param. App views all live at
 *    `/?view=...` under the homepage's title, so without it a sign-up cannot
 *    be attributed to the surface that produced it.
 */

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { authEventFor } from "@/lib/authAnalytics";

const SEEN_PREFIX = "rn_ga_auth:";

function currentView(): string {
  if (typeof window === "undefined") return "home";
  return new URLSearchParams(window.location.search).get("view") || "home";
}

interface AuthUserLike {
  id: string;
  created_at?: string;
}

export default function AnalyticsAuthEvents() {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    function report(user: AuthUserLike | null | undefined) {
      if (!user || cancelled) return;

      const key = `${SEEN_PREFIX}${user.id}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Private mode or storage disabled: report anyway. A duplicate on the
        // next load in the same tab is better than never counting the sign-up.
      }

      trackEvent(authEventFor(user.created_at), { view: currentView() });
    }

    try {
      const sb = getSupabaseClient();
      void sb.auth
        .getSession()
        .then(({ data }) => report(data.session?.user))
        .catch(() => {});
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") report(session?.user);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // No Supabase configuration in this build: nothing to authenticate.
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
