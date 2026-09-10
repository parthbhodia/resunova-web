/**
 * Signed-out entry into the app.
 *
 * ⚠️ THERE IS NO ANONYMOUS SCAN. Scanning requires an account (founder decision,
 * 2026-09-10) and the backend refuses it: `/api/analyze` and
 * `/api/analyze-upload` answer 401 `sign_in_required`, and
 * `/api/scan-limit-status` reports `requiresSignIn`. Everything here is the UX
 * around that — which views a guest may open, and how they get back to what they
 * were doing after signing in.
 *
 * What survives from the old free-scan flow, and why: `takeAnonAnalysisStash`
 * (nothing writes it any more, but a browser may still hold one from before, and
 * dropping it on the floor would lose someone's report) and `stashAnalyzeJd` (a
 * pasted job description has to cross the OAuth page unload, or signing in from
 * the Analyze surface costs the visitor their paste).
 */

import { getSupabaseClient } from "@/lib/supabase";
import { buildOAuthReturnUrl, stashPostLoginDest } from "@/lib/oauthRedirect";

export { POST_LOGIN_DEST_KEY } from "@/lib/oauthRedirect";

export const ANON_ANALYSIS_STASH_KEY = "rn_anon_analysis_v1";

/**
 * Views a signed-out visitor may enter without being bounced to the landing
 * page. The app shell renders for these; individual gated actions (scanning,
 * saving a résumé, downloading a PDF, applying) prompt sign-in inline.
 *
 *   analyze  — the surface renders and ASKS FOR SIGN-IN BEFORE THE FILE PICKER.
 *              It stays public deliberately: bouncing a guest to the marketing
 *              page instead would lose why they came — a landing CTA, or a job
 *              posting whose description was stashed on the way here — and they
 *              would arrive back at a page that does not know what they wanted.
 *   builder  — tailor a résumé; sign-in gates the match scan, save and export
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

/**
 * Read + clear a stashed anonymous scan (one-shot).
 *
 * READ-ONLY BY DESIGN: `stashAnonAnalysis` is gone with the anonymous scan, so
 * nothing writes this any more. The read stays because a browser may still hold
 * a result from before the rule changed, and signing in should still save it.
 */
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

/**
 * Full-page navigation into the Analyze flow (fresh AuthGate mount).
 *
 * Still named for a FREE scan, which it is — the free plan includes three a day.
 * What it is not, any more, is an anonymous one: a signed-out visitor lands on
 * the Analyze surface and is asked to sign in before choosing a file.
 */
export function goToFreeScan(): void {
  if (typeof window === "undefined") return;
  window.location.assign((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/?view=analyze");
}
