/**
 * Google OAuth return URLs and post-login routing.
 *
 * Supabase only honors `redirectTo` when it matches the project's redirect
 * allowlist. If the user starts on www.resunova.io but Supabase's Site URL is
 * still parthbhodia.github.io, they land on the github.io origin without the
 * original query string — and localStorage from the custom domain is lost.
 *
 * Fixes:
 *  - Build `redirectTo` with the full current path (e.g. /?view=jobs).
 *  - Stash the destination before leaving for OAuth (same-origin restore).
 *  - Canonicalize *.github.io → custom domain on load (preserves hash tokens).
 */

import { SITE_URL } from "@/lib/brand";

/** localStorage key: where to send the user after OAuth (e.g. "/?view=jobs"). */
export const POST_LOGIN_DEST_KEY = "rn_post_login_dest";

export function resolveSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
}

/** App-relative path (pathname + search + hash), with basePath stripped. */
export function getAppRelativeLocation(): string {
  if (typeof window === "undefined") return "/";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  let loc = window.location.pathname + window.location.search + window.location.hash;
  if (basePath && loc.startsWith(basePath)) {
    loc = loc.slice(basePath.length) || "/";
  }
  return loc;
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * OAuth `redirectTo` — must include the route the user was on so Supabase can
 * return them to ?view=jobs (etc.) instead of the bare Site URL root.
 */
export function buildOAuthReturnUrl(): string {
  if (typeof window === "undefined") return `${resolveSiteUrl()}/`;
  const path = getAppRelativeLocation();
  const { hostname, origin } = window.location;
  if (isLocalDevHost(hostname)) return origin + path;

  const canonical = resolveSiteUrl();
  try {
    const canonicalHost = new URL(canonical).hostname;
    if (hostname === canonicalHost) return origin + path;
  } catch {
    /* ignore */
  }

  // Signing in from the GitHub Pages default host — keep origin + path so an
  // allowlisted github.io URL still carries the view query; canonicalizeHost()
  // upgrades to the custom domain immediately after load.
  if (hostname.endsWith(".github.io")) return origin + path;

  return canonical + path;
}

/** Post-login destination without origin — used for router.replace(). */
export function getPostLoginDestFromWindow(): string {
  return getAppRelativeLocation();
}

/** True when the browser should move off *.github.io to the custom domain. */
export function shouldCanonicalizeHost(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  if (isLocalDevHost(hostname)) return false;
  if (!hostname.endsWith(".github.io")) return false;
  try {
    return hostname !== new URL(resolveSiteUrl()).hostname;
  } catch {
    return true;
  }
}

/**
 * After OAuth, Supabase may land on parthbhodia.github.io even though the user
 * started on www.resunova.io. Replace host with the custom domain while keeping
 * path, query, and hash (access_token lives in the hash).
 */
export function canonicalizeHostIfNeeded(): void {
  if (!shouldCanonicalizeHost()) return;
  const target = resolveSiteUrl() + getAppRelativeLocation();
  if (target !== window.location.href) {
    window.location.replace(target);
  }
}

/** Persist where to restore the user if Supabase strips the query on redirect. */
export function stashPostLoginDest(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POST_LOGIN_DEST_KEY, getPostLoginDestFromWindow());
  } catch {
    /* quota / private mode */
  }
}
