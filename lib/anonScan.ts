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
