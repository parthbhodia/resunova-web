/**
 * Anonymous "try before you sign in" scan support.
 *
 * Signed-out visitors can run a free Analyze scan (`/?view=analyze`). The full
 * report stays locked behind sign-in; the finished result is stashed in
 * localStorage before OAuth so it survives the redirect and is restored (and
 * persisted to the user's history) right after the session lands.
 *
 * Enforcement lives on the backend (per-IP daily cap) — everything here is UX.
 */

import { getSupabaseClient } from "@/lib/supabase";
import { buildOAuthReturnUrl, stashPostLoginDest } from "@/lib/oauthRedirect";

export { POST_LOGIN_DEST_KEY } from "@/lib/oauthRedirect";

export const ANON_ANALYSIS_STASH_KEY = "rn_anon_analysis_v1";

/**
 * Views a signed-out visitor may enter without being bounced to the landing
 * page. The app shell renders for these; individual gated actions (saving a
 * résumé, downloading a PDF, applying) still prompt sign-in inline.
 *
 *   analyze  — free résumé scan (one free, full report behind sign-in)
 *   builder  — tailor a résumé; sign-in gates save & export
 *   jobs     — the jobs view renders for anon, but the FEED requires sign-in:
 *              JobsFeed shows an in-view "sign in to browse jobs" prompt (the
 *              backend 401s anonymous feed requests) instead of redirecting to
 *              the marketing landing. Job *detail* pages stay public for SEO.
 */
/**
 * `?view=` values a signed-out visitor may use.
 *
 * Single source of truth: AuthGate honours it when a URL is opened directly,
 * and the sidebar / bottom nav honour it when the same view is reached by
 * clicking. Those used to be separate hand-kept lists, which drifted — `jobs`
 * loaded fine when you pasted the URL but hit a sign-in wall when you clicked
 * the nav item for it.
 */
import { JOBS_ENABLED } from "@/lib/featureFlags";

export const PUBLIC_APP_VIEWS: ReadonlySet<string> = new Set(
  JOBS_ENABLED ? ["analyze", "builder", "jobs"] : ["analyze", "builder"],
);

/** True when a signed-out visitor is allowed to open this in-app view. */
export function isPublicAppView(view: string): boolean {
  return PUBLIC_APP_VIEWS.has(view.toLowerCase());
}

/** True when the URL requests a view that signed-out visitors are allowed to use. */
export function urlRequestsPublicAppView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const view = (new URLSearchParams(window.location.search).get("view") || "").toLowerCase();
    return view ? PUBLIC_APP_VIEWS.has(view) : false;
  } catch {
    return false;
  }
}

export type AnonAnalysisStash = {
  label: string;
  result: Record<string, unknown>;
  savedAt: string;
};

/** Keep the finished anonymous scan across the OAuth redirect. */
export function stashAnonAnalysis(label: string, result: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const payload: AnonAnalysisStash = {
      label,
      result: result as Record<string, unknown>,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(ANON_ANALYSIS_STASH_KEY, JSON.stringify(payload));
  } catch {
    /* quota — the user just re-scans after sign-in */
  }
}

/** Read + clear the stashed anonymous scan (one-shot). */
export function takeAnonAnalysisStash(): AnonAnalysisStash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANON_ANALYSIS_STASH_KEY);
    if (!raw) return null;
    localStorage.removeItem(ANON_ANALYSIS_STASH_KEY);
    const parsed = JSON.parse(raw) as Partial<AnonAnalysisStash>;
    if (!parsed || typeof parsed !== "object" || !parsed.result) return null;
    return {
      label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label : "Resume",
      result: parsed.result as Record<string, unknown>,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearAnonAnalysisStash(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_ANALYSIS_STASH_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Tracks whether a signed-out visitor has already spent their one free scan.
 * The first scan is free and fully unlocked; a second scan asks them to sign in.
 * UX-only — the backend per-IP cap is still the real enforcement.
 */
const ANON_SCAN_USED_KEY = "rn_anon_scan_used_v1";

export function markAnonScanUsed(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(ANON_SCAN_USED_KEY, "1"); } catch { /* quota */ }
}

export function hasUsedAnonScan(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(ANON_SCAN_USED_KEY) === "1"; } catch { return false; }
}

export function clearAnonScanUsed(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(ANON_SCAN_USED_KEY); } catch { /* ignore */ }
}

/**
 * Carries a target job's JD into the anonymous Analyze scan — e.g. a signed-out
 * visitor on a job detail page taps "Upload your résumé", and the first scan
 * matches that exact role. Session-scoped + one-shot: consumed on the Analyze
 * mount, then cleared. Falls back to an un-prefilled scan on any failure.
 */
const ANALYZE_JD_PREFILL_KEY = "rn_analyze_jd_prefill_v1";

export function stashAnalyzeJd(jd: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = (jd || "").trim();
    if (t) sessionStorage.setItem(ANALYZE_JD_PREFILL_KEY, t);
  } catch { /* quota — un-prefilled scan still works */ }
}

export function takeAnalyzeJd(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(ANALYZE_JD_PREFILL_KEY);
    if (v) sessionStorage.removeItem(ANALYZE_JD_PREFILL_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/**
 * Shared Google OAuth entry. Returns the user to where they started sign-in
 * (e.g. `?view=jobs` so the jobs onboarding wizard shows) instead of the default
 * Analyze view. Belt-and-suspenders: pass the full current URL as the OAuth
 * `redirectTo`, AND stash the destination so AppShell can restore it on mount if
 * Supabase's redirect allowlist strips the query back to the bare origin.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const sb = getSupabaseClient();
  if (typeof window !== "undefined") stashPostLoginDest();
  const redirectTo = typeof window !== "undefined" ? buildOAuthReturnUrl() : undefined;
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  return error ? error.message : null;
}

/** Full-page navigation into the anonymous Analyze flow (fresh AuthGate mount). */
export function goToFreeScan(): void {
  if (typeof window === "undefined") return;
  window.location.assign((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/?view=analyze");
}
