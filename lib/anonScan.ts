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

export const ANON_ANALYSIS_STASH_KEY = "rn_anon_analysis_v1";

/** True when the current URL explicitly requests the Analyze view. */
export function urlRequestsAnalyzeView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("view") === "analyze";
  } catch {
    return false;
  }
}

/**
 * Views a signed-out visitor may enter without being bounced to the landing
 * page. The app shell renders for these; individual gated actions (saving a
 * résumé, downloading a PDF, applying) still prompt sign-in inline.
 *
 *   analyze  — free résumé scan (one free, full report behind sign-in)
 *   builder  — tailor a résumé; sign-in gates save & export
 *
 * NOTE: "jobs" is intentionally NOT public — the jobs feed requires sign-in
 * (the backend 401s anonymous feed requests). Individual job *detail* pages
 * stay public for SEO / Google for Jobs, but the browsable feed does not.
 */
const PUBLIC_APP_VIEWS = new Set(["analyze", "builder"]);

/** True when the URL requests a view that signed-out visitors are allowed to use. */
export function urlRequestsPublicAppView(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const view = new URLSearchParams(window.location.search).get("view");
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
 * Shared Google OAuth entry — same redirect target as the landing page so the
 * user lands back on the app shell with their session (and any stashed scan).
 */
export async function signInWithGoogle(): Promise<string | null> {
  const sb = getSupabaseClient();
  const redirectTo =
    typeof window !== "undefined"
      ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
      : undefined;
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  return error ? error.message : null;
}

/** Full-page navigation into the anonymous Analyze flow (fresh AuthGate mount). */
export function goToFreeScan(): void {
  if (typeof window === "undefined") return;
  window.location.assign((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/?view=analyze");
}
