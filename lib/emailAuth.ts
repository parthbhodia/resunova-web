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
    const linkError = await sendMagicLink(trimmed);
    return { error: linkError, needsConfirmation: false, alreadyRegistered: true };
  }
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
