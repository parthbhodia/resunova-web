"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import {
  classifyAuthEvent,
  consumeSignUpPending,
  loginReported,
  markLoginReported,
  markSignUpReported,
  signUpReported,
} from "@/lib/analyticsAuth";

/**
 * The ONLY place `sign_up` and `login` are reported.
 *
 * ⚠️ WHY A SEVENTEENTH `onAuthStateChange` SUBSCRIBER IS THE RIGHT ANSWER
 * ---------------------------------------------------------------------
 * There are already sixteen in this tree (AuthGate, AppShell, JobsFeed,
 * ResumeBuilder, AdvisorDashboard, useScansRemaining, …) and the obvious
 * cheaper move is to hang the analytics call off one of them. Every one of
 * those is mounted CONDITIONALLY — on a route, on a feature flag, on a view —
 * so which of them observes a given sign-in depends on where the user happened
 * to land. Reporting from a component that may not be mounted is how a funnel
 * acquires a silent, systematic hole that looks exactly like users not
 * converting.
 *
 * This one is mounted in app/layout.tsx beside GoogleOneTap, so it is present
 * for every route, and `SUBSCRIBED` makes the subscription a singleton — React
 * strict mode mounts effects twice in development, and two subscriptions would
 * double every event.
 */

let SUBSCRIBED = false;

/**
 * The surface the visitor is on when the account event lands. App views all
 * live at `/?view=...` under the homepage's title, so without this a sign-up
 * cannot be attributed to the surface that produced it. Carried across from the
 * competing implementation main shipped in #341, which had this and we did not.
 */
function currentView(): string {
  if (typeof window === "undefined") return "home";
  try {
    return new URLSearchParams(window.location.search).get("view") || "home";
  } catch {
    return "home";
  }
}

export default function AnalyticsAuthEvents() {
  useEffect(() => {
    // No Supabase env (bare marketing builds, local SEO previews) means no
    // auth to observe. AuthGate avoids initializing the client on public
    // routes for the same reason: these pages must render without it.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    if (SUBSCRIBED) return;

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return;
    }
    SUBSCRIBED = true;

    const report = (user: { id?: string; created_at?: string; app_metadata?: { provider?: string } } | null | undefined) => {
      try {
        const uid = user?.id;
        if (!uid) return;
        const decision = classifyAuthEvent({
          createdAt: user?.created_at ?? null,
          provider: user?.app_metadata?.provider ?? null,
          now: Date.now(),
          signUpAlreadyReported: signUpReported(uid),
          loginAlreadyReported: loginReported(uid),
          // Consumed here rather than peeked: the marker explains one arrival,
          // and leaving it set would relabel the user's next login too.
          signUpPending: consumeSignUpPending(),
        });
        if (!decision) return;
        trackEvent(decision.name, { method: decision.method, view: currentView() });
        // Mark AFTER reporting, and mark both: a new account's first session
        // reports sign_up, and without also sealing the login key the very
        // next refocus re-emit would report a login seconds later.
        if (decision.name === "sign_up") markSignUpReported(uid);
        markLoginReported(uid);
      } catch {
        /* analytics is never load-bearing */
      }
    };

    // An existing session at mount is the OAuth return and the ordinary
    // already-signed-in reload. Both are deduped by the storage keys.
    supabase.auth.getSession().then(({ data }) => report(data.session?.user)).catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, s) => {
      // Deliberately NOT filtered on the event name. supabase-js is
      // inconsistent about which name carries a fresh session, and the storage
      // dedupe already makes a duplicate arrival a no-op — so keying off the
      // session's presence is both simpler and harder to get wrong than
      // enumerating event names.
      if (s?.user) report(s.user);
    });

    return () => {
      subscription.unsubscribe();
      SUBSCRIBED = false;
    };
  }, []);

  return null;
}
