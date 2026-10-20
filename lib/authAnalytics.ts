/**
 * Classify a Supabase session as a new account or a returning one.
 *
 * Supabase does not tell the client which it is; `created_at` is the only
 * signal available without a server round-trip. For a brand-new account
 * `created_at` is the moment of the sign-in that produced it, so a short
 * window separates sign-ups from returning logins without guessing at the
 * provider. Five minutes is deliberately wide: an OAuth round-trip, an email
 * confirmation, and a slow phone can all sit inside it, and misreporting a
 * sign-up as a login understates the only number this is for.
 */
export const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

export type AuthEventName = "sign_up" | "login";

export function authEventFor(
  createdAt: string | null | undefined,
  now: number = Date.now(),
): AuthEventName {
  const created = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (!Number.isFinite(created)) return "login";
  // A clock skew that puts created_at in the future still means "just made".
  return now - created < NEW_ACCOUNT_WINDOW_MS ? "sign_up" : "login";
}
