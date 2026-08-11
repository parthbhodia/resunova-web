import { apiFetch } from "@/lib/apiClient";

/**
 * Client-side sanity check on an address, mirroring the pattern in
 * `normalize_email` (resunova-api resume_gui/blog/subscribers.py).
 *
 * Kept deliberately loose and kept in sync with the server on purpose: this
 * exists to give instant feedback on obvious junk, NOT to be the authority. The
 * server re-validates, so a mismatch here can only cost a round-trip — unless
 * this one is *stricter* than the server, in which case it silently rejects
 * addresses the backend would have accepted. If you tighten one, tighten both.
 */
export function isLikelyEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 320) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Subscribes an address to the blog list.
 *
 * Goes through the API rather than writing to Supabase from the browser, and
 * that is load-bearing rather than incidental: subscribing is double opt-in, so
 * it has to mail a confirmation link, and the confirm token must never reach
 * the client. A client-direct write would have to either hand the token back
 * (letting whoever typed the address confirm it without receiving the mail) or
 * send mail from the browser, which is impossible — the Resend key is
 * server-side. See db/migrations/042_blog_subscribers.sql.
 *
 * Resolves for both a new subscriber and a repeat one — the endpoint is
 * idempotent and deliberately does not report which, because a response that
 * differed per case would be an oracle for "is this person on the list?".
 * Callers show the same confirmation either way.
 *
 * Throws when the address is rejected or the request fails, so the form can
 * show a real error rather than a false success.
 */
export async function subscribeToBlog(email: string, source?: string): Promise<void> {
  const res = await apiFetch("/api/blog/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), source: source ?? null }),
  });
  if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);
}
