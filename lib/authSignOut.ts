import { getSupabaseClient } from "@/lib/supabase";
import { invalidateCache } from "@/lib/clientCache";
import { apiFetch } from "@/lib/apiClient";

const FORCE_LANDING_KEY = "rn-force-landing";
const forceLandingListeners = new Set<() => void>();

export function subscribeForceLandingAfterSignOut(listener: () => void): () => void {
  forceLandingListeners.add(listener);
  return () => forceLandingListeners.delete(listener);
}

function notifyForceLandingChange(): void {
  forceLandingListeners.forEach((listener) => listener());
}

/** Dev bypass keeps the app open with no session — set when user explicitly signs out. */
export function readForceLandingAfterSignOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(FORCE_LANDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearForceLandingAfterSignOut(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FORCE_LANDING_KEY);
  } catch {
    /* ignore */
  }
  notifyForceLandingChange();
}

export async function revokeExtensionSessions(timeoutMs = 3000): Promise<void> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    await apiFetch("/api/extension/revoke-all", { method: "POST", signal: controller?.signal });
  } catch {
    /* best-effort */
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Sign out of Supabase and hard-navigate home so AuthGate re-evaluates. */
export async function signOutAndReturnHome(): Promise<void> {
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
  // Drop every cached per-account payload before the session goes away, so a
  // second account signing in on this tab can never paint the first one's data.
  invalidateCache();
  // Sign-out here is global, so the extension goes too: it holds its own
  // credential that Supabase sign-out cannot see. Must run BEFORE signOut,
  // while the bearer token still exists. Best-effort and time-boxed, so a
  // slow API never traps someone in an account they asked to leave.
  await revokeExtensionSessions();
  try {
    await getSupabaseClient().auth.signOut({ scope: "global" });
  } catch {
    /* still leave the app */
  }
  if (devBypass) {
    try {
      sessionStorage.setItem(FORCE_LANDING_KEY, "1");
    } catch {
      /* ignore */
    }
    notifyForceLandingChange();
  }
  window.location.assign("/");
}
