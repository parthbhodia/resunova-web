"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /my-resumes is retired as a destination — the Library hub (/?view=library)
 * is the one résumés home (2026-07 reverse-merge decision). Old deep links and
 * bookmarks still resolve here, and GH Pages static export has no server
 * redirects, so the route must keep exporting this thin client redirect.
 * AuthGate wraps this path, so signed-out visitors see the landing/sign-in
 * flow before this component ever runs.
 */
export function MyResumesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?view=library");
  }, [router]);
  return null;
}
