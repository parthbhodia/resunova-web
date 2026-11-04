/**
 * User-level tailoring intensity for LLM rewrites (Tailor gap-fix + Jobs Boost).
 *
 * - "aggressive" (default since 2026-10-26): rewrites add the tools, methods and
 *   duties the job asks for to work the résumé already describes, and every
 *   addition is graded by risk so the person can see what to confirm.
 * - "honest": rewrites need an honest, transferable bridge to the gap and only
 *   claim what the résumé already supports. Kept for anyone who chooses it.
 *
 * Employers, titles, dates, degrees and certifications are never added in either
 * mode; the API enforces that floor.
 *
 * Persisted on `user_profiles.tailoring_mode` (migration 036; NULL = never
 * chosen, which drives the one-time explainer modal and resolves to the default
 * everywhere else). Cached in localStorage so call sites can read synchronously;
 * DB stays the source of truth.
 */
import { getSupabaseClient } from "@/lib/supabase";
import { DEFAULT_TAILORING_MODE, resolveTailoringMode, type TailoringMode } from "@/lib/tailoringModeDefault";

export { DEFAULT_TAILORING_MODE, resolveTailoringMode };
export type { TailoringMode };

const CACHE_KEY = "rn_tailoring_mode_v1";

export const TAILORING_MODE_META: Record<TailoringMode, { label: string; blurb: string }> = {
  honest: {
    label: "Honest",
    blurb: "Reframe and emphasize experience you actually have. Rewrites only claim skills your résumé already supports.",
  },
  aggressive: {
    label: "Aggressive",
    blurb: "Rewrite content to match the job description closely. Adds the tools, methods and duties the job asks for to work you already describe, and marks each addition for you to confirm. Can retitle an existing role toward the posting.",
  },
};

function readCache(): TailoringMode | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw === "honest" || raw === "aggressive" ? raw : null;
  } catch {
    return null;
  }
}

function writeCache(mode: TailoringMode | null) {
  try {
    if (mode) localStorage.setItem(CACHE_KEY, mode);
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* SSR / quota */ }
}

/** Synchronous read for request payloads. Null = never chosen (resolves to the default). */
export function getCachedTailoringMode(): TailoringMode | null {
  return readCache();
}

/** What request bodies should send: the chosen mode, else the default. */
export function tailoringModeForRequest(): TailoringMode {
  return resolveTailoringMode(readCache());
}

/** Fetch the stored choice from user_profiles. Null = signed out / never chosen. */
export async function fetchTailoringMode(): Promise<TailoringMode | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return readCache();
    const { data, error } = await db
      .from("user_profiles")
      .select("tailoring_mode")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn("[tailoring_mode] fetch:", error.message);
      return readCache();
    }
    const mode = data?.tailoring_mode;
    if (mode === "honest" || mode === "aggressive") {
      writeCache(mode);
      return mode;
    }
    return null;
  } catch (e) {
    console.warn("[tailoring_mode] fetch:", e);
    return readCache();
  }
}

/** Persist the choice (DB when signed in + local cache either way). */
export async function saveTailoringMode(mode: TailoringMode): Promise<void> {
  writeCache(mode);
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return;
    // Update-then-insert (not a bare upsert): a fresh insert must also satisfy
    // any NOT NULL defaults the profile row shape carries (e.g. `profile` jsonb).
    const { data: updated, error: updErr } = await db
      .from("user_profiles")
      .update({ tailoring_mode: mode, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select("user_id");
    if (updErr) {
      console.warn("[tailoring_mode] update:", updErr.message);
      return;
    }
    if (!updated?.length) {
      const { error: insErr } = await db.from("user_profiles").insert({
        user_id: session.user.id,
        profile: {},
        tailoring_mode: mode,
        updated_at: new Date().toISOString(),
      });
      if (insErr) console.warn("[tailoring_mode] insert:", insErr.message);
    }
  } catch (e) {
    console.warn("[tailoring_mode] upsert:", e);
  }
}
