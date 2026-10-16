"use client";

/**
 * SignInDialog — the single, consistent sign-in surface for the whole app.
 *
 * Before this, "Sign in" was reinvented in ~14 places (sidebar footer, bottom-nav
 * sheet, locked nav badges, and a bespoke inline card in Analyze / Jobs / Library /
 * Advisor / Cover Letter / Template Builder…). Each looked different and some went
 * straight to Google OAuth while others showed a card first.
 *
 * Now every gated action calls `useSignInDialog().openSignIn({ reason })` and gets
 * the SAME branded modal, with email/password and Google as equivalent entry paths.
 *
 * Mount <SignInDialogProvider> once in the root layout so marketing pages, shell
 * navigation, and every gated feature use the same account entry point.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { signInWithGoogle } from "@/lib/anonScan";

/**
 * The modal itself is MUI and loads on first open. This provider sits in the
 * root layout, so a static import would ship Emotion to every prerendered page.
 */
const SignInPanel = dynamic(() => import("@/components/SignInPanel"), { ssr: false });

export type SignInDialogOptions = {
  /** Headline override for the sign-in view, e.g. "Sign in to browse jobs". */
  title?: string;
  /** One-line reason shown under the headline. */
  reason?: string;
};

type SignInDialogContextValue = {
  openSignIn: (opts?: SignInDialogOptions) => void;
};

const SignInDialogContext = createContext<SignInDialogContextValue | null>(null);

/**
 * Access the shared sign-in modal. Falls back to a direct OAuth redirect if a
 * component happens to render outside the provider, so a missing provider never
 * leaves a "Sign in" button dead.
 */
export function useSignInDialog(): SignInDialogContextValue {
  const ctx = useContext(SignInDialogContext);
  return (
    ctx ?? {
      openSignIn: () => {
        void signInWithGoogle();
      },
    }
  );
}

export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SignInDialogOptions>({});
  // Bumped on every open so the panel remounts with a clean form.
  const [session, setSession] = useState(0);

  const openSignIn = useCallback((next?: SignInDialogOptions) => {
    setOpts(next ?? {});
    setSession((n) => n + 1);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      {session > 0 && <SignInPanel key={session} open={open} onClose={close} opts={opts} />}
    </SignInDialogContext.Provider>
  );
}
