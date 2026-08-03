/**
 * Which auth events are allowed to end the session for gating purposes.
 *
 * `supabase-js` re-emits on tab refocus and on token refresh, and those
 * re-emits do not always carry a session object. AuthGate sits above the entire
 * app, and it swaps to <SignInRequired> the moment its session goes null — so a
 * momentary null from a refocus unmounts every route below it and destroys
 * whatever was in progress: a Fix-everything pass mid-flight, a half-filled
 * confirm form, an unsaved edit. The user sees their work vanish for switching
 * tabs and coming back.
 *
 * The rule: only an explicit sign-out ends the session. Every other event can
 * set a session or leave the existing one alone, never clear it. A genuinely
 * expired token still gates, because the API returns 401 and the app's refusal
 * handling covers that path; guessing "signed out" from a missing object in a
 * refocus event is what was wrong.
 */
import type { Session } from "@supabase/supabase-js";

/** Events that mean the user is actually gone. Everything else is noise. */
const TERMINAL_EVENTS = new Set(["SIGNED_OUT", "USER_DELETED"]);

export function nextGateSession(
  previous: Session | null,
  event: string,
  incoming: Session | null,
): Session | null {
  if (TERMINAL_EVENTS.has(event)) return null;
  // A refocus re-emit with no session is not evidence of anything. Keep what we
  // had rather than tearing the tree down and rebuilding it.
  if (!incoming) return previous;
  return incoming;
}

/** True when the event carries the same signed-in user we already had, so the
 *  caller can skip work that only makes sense for a genuinely new sign-in. */
export function isSameUser(previous: Session | null, incoming: Session | null): boolean {
  return Boolean(previous?.user?.id) && previous?.user?.id === incoming?.user?.id;
}
