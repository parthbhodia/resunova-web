import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/anonScan";

/**
 * Lightweight, shared "is the user signed in?" hook for gating account-only
 * features (e.g. the Cover Letter AI writing tools, which call auth-gated
 * `/api/cl-*` endpoints).
 *
 * `signedIn` is `null` while the first session lookup is in flight, then a
 * boolean. `signIn()` kicks off the Google OAuth redirect and returns an error
 * string on failure (on success the browser navigates away, so the promise
 * never resolves into the same page).
 */
export function useSupabaseSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const sb = getSupabaseClient();
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setSigningIn(true);
    const err = await signInWithGoogle();
    // On success the page redirects to Google; only reach here if it failed.
    if (err) setSigningIn(false);
    return err;
  }, []);

  return { signedIn, signingIn, signIn };
}
