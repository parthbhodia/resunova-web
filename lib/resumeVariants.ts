/**
 * Résumé variants — named parallel profiles (a CONTENT axis, e.g. "Default" +
 * "Judi Health"), layered above the existing version LINEAGE (a TIME axis —
 * see lib/analyzeVersions.ts). Full design: docs/RESUME_VARIANTS_PLAN.md.
 *
 * `resume_analyses.variant_group`/`variant_name` are written once at insert
 * and never mutated (that table has no UPDATE RLS policy — append-only by
 * design). Anything that needs to change LATER — which variant is the
 * default, a renamed display label — lives here instead, on
 * `user_profiles` (full CRUD RLS, same pattern as tailoringMode.ts).
 */
import { getSupabaseClient } from "@/lib/supabase";

const DEFAULT_NAME_CACHE_KEY = "rn_default_variant_v1";
const DISPLAY_NAMES_CACHE_KEY = "rn_variant_display_names_v1";

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* SSR / quota */ }
}

/** Synchronous read for request payloads / ranking decisions. Null = the
 *  implicit "Default" variant (today's only behavior). */
export function getCachedDefaultVariantName(): string | null {
  return readLocal<string>(DEFAULT_NAME_CACHE_KEY);
}

/** Fetch the stored default-variant pointer from user_profiles. */
export async function fetchDefaultVariantName(): Promise<string | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return readLocal<string>(DEFAULT_NAME_CACHE_KEY);
    const { data, error } = await db
      .from("user_profiles")
      .select("default_variant_name")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn("[resumeVariants] fetch default:", error.message);
      return readLocal<string>(DEFAULT_NAME_CACHE_KEY);
    }
    const name = (data?.default_variant_name as string | null) ?? null;
    if (name) writeLocal(DEFAULT_NAME_CACHE_KEY, name);
    return name;
  } catch (e) {
    console.warn("[resumeVariants] fetch default:", e);
    return readLocal<string>(DEFAULT_NAME_CACHE_KEY);
  }
}

/** Persist which variant (by its raw stored `variant_name`) is default. */
export async function saveDefaultVariantName(variantName: string): Promise<void> {
  writeLocal(DEFAULT_NAME_CACHE_KEY, variantName);
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return;
    const { data: updated, error: updErr } = await db
      .from("user_profiles")
      .update({ default_variant_name: variantName, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select("user_id");
    if (updErr) {
      console.warn("[resumeVariants] update default:", updErr.message);
      return;
    }
    if (!updated?.length) {
      const { error: insErr } = await db.from("user_profiles").insert({
        user_id: session.user.id,
        profile: {},
        default_variant_name: variantName,
        updated_at: new Date().toISOString(),
      });
      if (insErr) console.warn("[resumeVariants] insert default:", insErr.message);
    }
  } catch (e) {
    console.warn("[resumeVariants] save default:", e);
  }
}

/** Fetch the { originalVariantName: displayName } rename-override map. */
export async function fetchVariantDisplayNames(): Promise<Record<string, string>> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return readLocal<Record<string, string>>(DISPLAY_NAMES_CACHE_KEY) ?? {};
    const { data, error } = await db
      .from("user_profiles")
      .select("variant_display_names")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn("[resumeVariants] fetch display names:", error.message);
      return readLocal<Record<string, string>>(DISPLAY_NAMES_CACHE_KEY) ?? {};
    }
    const map = (data?.variant_display_names as Record<string, string> | null) ?? {};
    writeLocal(DISPLAY_NAMES_CACHE_KEY, map);
    return map;
  } catch (e) {
    console.warn("[resumeVariants] fetch display names:", e);
    return readLocal<Record<string, string>>(DISPLAY_NAMES_CACHE_KEY) ?? {};
  }
}

/** Rename a variant WITHOUT touching any resume_analyses row — stores a
 *  display-name override keyed by the variant's original stored name. */
export async function saveVariantDisplayName(originalName: string, displayName: string): Promise<void> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    if (!session?.user?.id) return;
    const current = await fetchVariantDisplayNames();
    const next = { ...current, [originalName]: displayName };
    writeLocal(DISPLAY_NAMES_CACHE_KEY, next);
    const { data: updated, error: updErr } = await db
      .from("user_profiles")
      .update({ variant_display_names: next, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select("user_id");
    if (updErr) {
      console.warn("[resumeVariants] update display names:", updErr.message);
      return;
    }
    if (!updated?.length) {
      const { error: insErr } = await db.from("user_profiles").insert({
        user_id: session.user.id,
        profile: {},
        variant_display_names: next,
        updated_at: new Date().toISOString(),
      });
      if (insErr) console.warn("[resumeVariants] insert display names:", insErr.message);
    }
  } catch (e) {
    console.warn("[resumeVariants] save display name:", e);
  }
}

/** Apply a rename override on top of a raw stored variant_name — the only
 *  place "what the user sees" and "what's stored" are allowed to diverge. */
export function displayNameForVariant(
  rawName: string,
  overrides: Record<string, string>,
): string {
  return overrides[rawName] ?? rawName;
}
