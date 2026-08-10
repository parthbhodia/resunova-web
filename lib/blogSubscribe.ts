import { getSupabaseClient } from "@/lib/supabase";

/**
 * Client-side sanity check on an address, mirroring the pattern in
 * `subscribe_to_blog` (db/migrations/042_blog_subscribers.sql).
 *
 * Kept deliberately loose and kept in sync with the SQL on purpose: this exists
 * to give instant feedback on obvious junk, NOT to be the authority. The server
 * re-validates, so a mismatch here can only cost a round-trip — unless this one
 * is *stricter* than the SQL, in which case it silently rejects addresses the
 * database would have accepted. If you tighten one, tighten both.
 */
export function isLikelyEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 320) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Subscribes an address to the blog list.
 *
 * Resolves for both a new subscriber and a repeat one — the RPC is idempotent
 * and deliberately does not report which happened (see the migration: telling
 * the caller "already subscribed" would make this an email-enumeration oracle).
 * Callers should show the same confirmation either way.
 *
 * Throws when the address is rejected or the request fails, so the form can
 * show a real error rather than a false success.
 */
export async function subscribeToBlog(email: string, source?: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.rpc("subscribe_to_blog", {
    p_email: email.trim().toLowerCase(),
    p_source: source ?? null,
  });
  if (error) throw error;
}
