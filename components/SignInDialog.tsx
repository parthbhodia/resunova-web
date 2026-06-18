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
 * the SAME branded modal — matching how EnhanceCV / Kickresume / Jobright funnel all
 * sign-in through one consistent surface. Resunova is Google-only, so the modal's
 * primary (and only) action is "Continue with Google".
 *
 * Mount <SignInDialogProvider> once (in AppShell) so it wraps the sidebar, the top
 * bar, the bottom nav, AND every view rendered as AppShell children.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/anonScan";

/** Small Google "G" so the CTA reads as a real OAuth button, not a generic link. */
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.3C41.4 36.2 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export type SignInDialogOptions = {
  /** Headline override, e.g. "Sign in to browse jobs". */
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

const DEFAULT_TITLE = "Sign in to Resunova";
const DEFAULT_REASON =
  "Free forever — save your reports, tailor to any job, and unlock every feature.";

const VALUE_PROPS = [
  "Save & revisit every résumé scan",
  "Match and tailor to live job openings",
  "No credit card — Google sign-in only",
];

export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SignInDialogOptions>({});
  const [busy, setBusy] = useState(false);

  const openSignIn = useCallback((next?: SignInDialogOptions) => {
    setOpts(next ?? {});
    setBusy(false);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    // Redirect navigates away on success; only reachable again on error.
    const err = await signInWithGoogle();
    if (err) setBusy(false);
  }, []);

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 px-2 pt-2 text-center">
            <DialogTitle className="text-lg font-semibold">
              {opts.title || DEFAULT_TITLE}
            </DialogTitle>
            <DialogDescription className="max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
              {opts.reason || DEFAULT_REASON}
            </DialogDescription>
          </div>

          <ul className="mx-auto mt-1 flex w-full max-w-xs flex-col gap-2">
            {VALUE_PROPS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-[13px] text-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-accent">
                  {CheckIcon}
                </span>
                {p}
              </li>
            ))}
          </ul>

          <Button
            onClick={() => void handleGoogle()}
            disabled={busy}
            size="lg"
            className="mt-2 w-full gap-2.5 bg-white text-[#1f2937] ring-1 ring-foreground/10 hover:bg-white/90 dark:bg-white dark:text-[#1f2937]"
          >
            <GoogleGlyph />
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>

          <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
          </p>
        </DialogContent>
      </Dialog>
    </SignInDialogContext.Provider>
  );
}
