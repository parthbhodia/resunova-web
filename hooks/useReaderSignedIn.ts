import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * Is the person reading this signed in? `null` until the first lookup answers.
 *
 * Its own hook rather than `useSupabaseSignedIn`, for one reason: a public blog
 * page must render without Supabase, and `getSupabaseClient()` throws when the
 * client env is absent (bare marketing builds, local SEO previews). Here a
 * missing client means "nobody is signed in", which is true of those builds,
 * where the other hook would throw out of an effect and take the page down.
 */
export function useReaderSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    try {
      const client = getSupabaseClient();
      client.auth
        .getSession()
        .then(({ data }) => {
          if (!cancelled) setSignedIn(Boolean(data.session?.user));
        })
        .catch(() => {
          if (!cancelled) setSignedIn(false);
        });
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        if (!cancelled) setSignedIn(Boolean(session?.user));
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setSignedIn(false);
      });
    }
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return signedIn;
}
