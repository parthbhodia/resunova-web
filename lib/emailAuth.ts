import { getSupabaseClient } from "@/lib/supabase";
import { buildAuthRouteUrl, buildOAuthReturnUrl, stashPostLoginDest } from "@/lib/oauthRedirect";
import { markSignUpPending } from "@/lib/analyticsAuth";

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error?.message ?? null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  stashPostLoginDest();
  // With email confirmation on, Supabase creates the row now but only signs
  // the user in when they click the link — often an hour later, by which time
  // `created_at` is too old for the new-account window to recognise. This
  // marker is what keeps that arrival a sign_up instead of a login.
  markSignUpPending();
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: buildOAuthReturnUrl() },
  });
  return {
    error: error?.message ?? null,
    needsConfirmation: !error && !data.session,
  };
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: buildAuthRouteUrl("/reset-password/"),
  });
  return error?.message ?? null;
}
