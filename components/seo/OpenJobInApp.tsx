"use client";

import { useEffect } from "react";
import { useReaderSignedIn } from "@/hooks/useReaderSignedIn";
import { JOBS_ENABLED } from "@/lib/featureFlags";
import { goTo } from "@/lib/navigate";
import { inAppJobHref } from "@/lib/staleJobLink";

/**
 * Takes a signed-in visitor from the public job page to the same job inside the
 * app, where they get the match, Boost, save and tracking. A guest stays on the
 * public page, which is the whole point of it.
 *
 * Why it runs in the browser: the public page is rendered once and cached for an
 * hour, so the server cannot know who is looking. The session only exists here.
 * A signed-in visitor sees the public page for an instant first; that is the
 * price of keeping the page cacheable and readable by search.
 *
 * Three ways it stays out of the way:
 * - until the session is known (`null`) nothing happens, so a guest is never moved;
 * - when the in-app Jobs section is switched off, `/?view=jobs` would only show
 *   Home, so the public page is the better place to be;
 * - `?public=1` keeps a signed-in person on the public page, for looking at
 *   what search shows without signing out.
 *
 * `replace`, not `assign`: Back must not return to the page that sent you away.
 */
export default function OpenJobInApp({ id }: { id: string }) {
  const signedIn = useReaderSignedIn();

  useEffect(() => {
    if (!JOBS_ENABLED || signedIn !== true) return;
    if (new URLSearchParams(window.location.search).get("public") === "1") return;
    goTo(inAppJobHref(id));
  }, [signedIn, id]);

  return null;
}
