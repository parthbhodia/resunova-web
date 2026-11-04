/**
 * Deciding whether a Supabase sign-in is a NEW ACCOUNT or a RETURNING LOGIN,
 * and reporting each at most once.
 *
 * WHY THIS IS NOT A ONE-LINER ON `SIGNED_IN`
 * ------------------------------------------
 * Supabase emits a single `SIGNED_IN` event for both cases, and — the part
 * that makes a naive implementation wrong rather than merely incomplete —
 * supabase-js RE-EMITS `SIGNED_IN` for the same user on tab refocus and on
 * token refresh. This repo has already been bitten by that twice: the advisor
 * dashboard reloaded its whole tree on every refocus, and AuthGate unmounted
 * every route when a re-emit arrived carrying no session. Firing `login` on
 * each `SIGNED_IN` would inflate the login count by however many times the
 * user changed tabs, which is worst for the engaged users whose behaviour the
 * funnel most needs to describe.
 *
 * So the emitter is deduped, and the dedupe lives at two different scopes
 * because the two events mean different things:
 *
 *   sign_up — at most once PER ACCOUNT, EVER (localStorage). An account is
 *             created one time; a second `sign_up` for the same uid is always
 *             a bug, never a fact.
 *   login   — at most once PER BROWSER TAB SESSION (sessionStorage). Reloading
 *             the page is not a new login; opening the app tomorrow is.
 *
 * ⚠️ WHY NOT INFER SIGN-UP FROM `created_at` ALONE: with email confirmation
 * on, Supabase creates the row when the form is submitted but only signs the
 * user in when they click the link in their inbox — which can be an hour
 * later. By then `created_at` is old and the account's very first session
 * would be reported as a returning `login`, i.e. the signup funnel would
 * under-count exactly the slowest, most fragile path through it. The explicit
 * marker written at submit time covers that; the `created_at` window covers
 * OAuth, where there is no submit step to hook.
 */

/** OAuth round-trips through accounts.google.com and back. Minutes, not seconds. */
export const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

export type AuthEventDecision = { name: "sign_up" | "login"; method: string } | null;

export type AuthClassifyInput = {
  /** `user.created_at` from Supabase, ISO. */
  createdAt: string | null | undefined;
  /** `app_metadata.provider` — "google", "email", … */
  provider: string | null | undefined;
  now: number;
  /** This uid has already had a sign_up reported (localStorage). */
  signUpAlreadyReported: boolean;
  /** This tab has already had a login reported for this uid (sessionStorage). */
  loginAlreadyReported: boolean;
  /** A sign-up form was submitted in this browser and has not resolved yet. */
  signUpPending: boolean;
};

/**
 * `method` is what GA4's recommended `sign_up` / `login` events use to split
 * the funnel by provider. Unknown is reported as "unknown" rather than
 * omitted, so a provider we failed to read is visible as a row instead of
 * silently merging into whichever one happens to be first.
 */
function methodOf(provider: string | null | undefined): string {
  const p = (provider || "").trim().toLowerCase();
  return p || "unknown";
}

function createdWithinWindow(createdAt: string | null | undefined, now: number): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  // A clock-skewed future `created_at` still counts as new: the alternative is
  // reporting a brand-new account's first session as a returning login.
  return now - t < NEW_ACCOUNT_WINDOW_MS;
}

/**
 * The decision, or null when this transition should report nothing.
 *
 * ⚠️ ORDER MATTERS: sign_up is tested first, so a new account's first session
 * reports `sign_up` and NOT both events. GA4 counts `sign_up` and `login`
 * independently, and emitting both for one arrival would make every signup
 * look like it immediately came back.
 */
export function classifyAuthEvent(input: AuthClassifyInput): AuthEventDecision {
  const isNew = input.signUpPending || createdWithinWindow(input.createdAt, input.now);
  if (isNew && !input.signUpAlreadyReported) {
    return { name: "sign_up", method: methodOf(input.provider) };
  }
  if (!input.loginAlreadyReported) {
    return { name: "login", method: methodOf(input.provider) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage keys + accessors. Every one swallows its own errors: Safari private
// mode throws on access, and a thrown storage read must not take down the
// auth subscriber it is called from.
// ---------------------------------------------------------------------------

const SIGNUP_REPORTED_PREFIX = "rn_ga_signup_";
const LOGIN_REPORTED_PREFIX = "rn_ga_login_";
export const SIGNUP_PENDING_KEY = "rn_ga_signup_pending";

export function signUpReported(uid: string): boolean {
  try { return localStorage.getItem(SIGNUP_REPORTED_PREFIX + uid) === "1"; } catch { return false; }
}
export function markSignUpReported(uid: string): void {
  try { localStorage.setItem(SIGNUP_REPORTED_PREFIX + uid, "1"); } catch { /* ignore */ }
}
export function loginReported(uid: string): boolean {
  try { return sessionStorage.getItem(LOGIN_REPORTED_PREFIX + uid) === "1"; } catch { return false; }
}
export function markLoginReported(uid: string): void {
  try { sessionStorage.setItem(LOGIN_REPORTED_PREFIX + uid, "1"); } catch { /* ignore */ }
}

/** Called when a sign-up form is submitted, before we know the uid. */
export function markSignUpPending(): void {
  try { localStorage.setItem(SIGNUP_PENDING_KEY, String(Date.now())); } catch { /* ignore */ }
}
/**
 * True when a sign-up was submitted in this browser recently enough to still
 * be the explanation for an arriving session. Bounded so an abandoned signup
 * from last week cannot relabel an unrelated login as a sign_up — and cleared
 * on read, because the marker explains exactly one arrival.
 */
export function consumeSignUpPending(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(SIGNUP_PENDING_KEY);
    if (!raw) return false;
    localStorage.removeItem(SIGNUP_PENDING_KEY);
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    // Email confirmation links are commonly clicked hours later.
    return now - t < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
