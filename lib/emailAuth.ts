import { markSignUpPending } from "@/lib/analyticsAuth";
import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthRouteUrl, buildOAuthReturnUrl, stashPostLoginDest } from "@/lib/oauthRedirect";

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error?.message ?? null;
}

export type SignUpResult = {
  error: string | null;
  needsConfirmation: boolean;
  /**
   * The address already belongs to an account (often one made with Google).
   * Supabase answers a repeated signup with a 200 and a placeholder user that
   * has no identities, and sends NO email, so without this check the UI tells
   * people to check an inbox that will stay empty. We send a sign-in link
   * instead so they can still get in with one tap.
   */
  alreadyRegistered: boolean;
};

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  stashPostLoginDest();
  const trimmed = email.trim();
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: trimmed,
    password,
    options: { emailRedirectTo: buildOAuthReturnUrl() },
  });
  if (error) return { error: error.message, needsConfirmation: false, alreadyRegistered: false };

  const alreadyRegistered = !data.session && data.user?.identities?.length === 0;
  if (alreadyRegistered) {
    // ⚠️ DELIBERATELY NO SIGN-UP MARKER ON THIS PATH. The marker survives 24h
    // and is consumed by the next SIGNED_IN — which here is the magic-link
    // arrival seconds later, for an account that already existed. Marking it
    // would report a returning user as a new account, inflating the one number
    // the signup funnel exists to measure.
    const linkError = await sendMagicLink(trimmed);
    return { error: linkError, needsConfirmation: false, alreadyRegistered: true };
  }
  // A genuinely new account. With email confirmation on, Supabase creates the
  // row now but only signs the user in when they click the link — often an
  // hour later, by which time `created_at` is too old for the new-account
  // window to recognise. This marker is what keeps that arrival a sign_up.
  markSignUpPending();
  return { error: null, needsConfirmation: !data.session, alreadyRegistered: false };
}

/** One-tap sign-in link for an existing account. Never creates a new user. */
export async function sendMagicLink(email: string): Promise<string | null> {
  stashPostLoginDest();
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: buildOAuthReturnUrl() },
  });
  return error?.message ?? null;
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: buildAuthRouteUrl("/reset-password/"),
  });
  return error?.message ?? null;
}
