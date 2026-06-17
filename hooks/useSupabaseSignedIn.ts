import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useSignInDialog } from "@/components/SignInDialog";

/**
 * Lightweight, shared "is the user signed in?" hook for gating account-only
 * features (e.g. the Cover Letter AI writing tools, which call auth-gated
 * `/api/cl-*` endpoints).
 *
 * `signedIn` is `null` while the first session lookup is in flight, then a
 * boolean. `signIn()` opens the shared sign-in modal (the one consistent
 * sign-in surface — see SignInDialog), so every gated AI action funnels through
 * the same place rather than each kicking off its own OAuth redirect.
 */
export function useSupabaseSignedIn() {
  const { openSignIn } = useSignInDialog();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Kept for API compatibility with consumers that read it for a busy label;
  // the modal now owns the OAuth busy state, so this stays false here.
  const [signingIn] = useState(false);

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

  const signIn = useCallback(async (): Promise<string | null> => {
    openSignIn();
    return null;
  }, [openSignIn]);

  return { signedIn, signingIn, signIn };
}
