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
 * the SAME branded modal.
 *
 * ONE PRIMARY PER STEP, and that is the whole shape of this file. The card used
 * to ship "Log in with email" and "Continue with Google" as two `size="lg"`
 * full-width filled buttons separated by "or", which asks the visitor to pick a
 * lane before they can do anything. First paint is now Google alone; email lives
 * behind `Use email instead`, and once it is open EMAIL becomes the primary and
 * Google steps back to a quieter row. That removes five blocks from first paint,
 * which is what retires the `overflow-y-auto` scroll this card was known for.
 *
 * Deliberately NOT migrated to MUI, against the general rule in AGENTS.md that
 * new chrome goes there. `SignInDialogProvider` is mounted in the ROOT layout,
 * so an Emotion runtime here lands on all ~1,085 prerendered pages — exactly
 * what the "provider is scoped, not global" rule exists to prevent. The
 * migration waits for a way to scope the provider to the open dialog.
 *
 * Themes are `[data-theme]` driven. Tailwind's `dark:` variant is bound to a
 * `.dark` ANCESTOR CLASS (`@custom-variant dark (&:is(.dark *))`, globals.css)
 * and nothing in this app ever sets that class, so a `dark:` utility here is
 * dead code that reads like a decision someone made. Go through a token.
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
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoFull } from "@/components/BrandLogo";
import { signInWithGoogle } from "@/lib/anonScan";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/emailAuth";

/**
 * Google's own stroke colour for the light sign-in button.
 *
 * The slab is white and so is the popover in light mode, so the boundary is
 * carried entirely by this stroke. Measured against `--surface`: the older
 * Google spec stroke `#dadce0` is 1.37:1 and the `ring-foreground/10` this
 * shipped with is 1.23:1, both far under the 3:1 WCAG 1.4.11 asks of a control
 * boundary — and no translucent neutral in our palette reaches it either
 * (`--border-h` tops out at 1.76:1). `#747775` measures 4.53:1.
 */
const GOOGLE_STROKE = "#747775";
/** Google's spec'd label colour on the white button. 14.68:1 on white. */
const GOOGLE_LABEL = "#1f2937";

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
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

/**
 * The title no longer repeats the wordmark now that the lockup sits above it.
 * Callers that pass their own title (Jobs, Analyze, Advisor, Library…) read as
 * brand, then purpose, then detail.
 */
const DEFAULT_TITLE = "Sign in to continue";
const DEFAULT_REASON =
  "Your scans, tailored résumés and job matches stay in your account.";
const RESET_TITLE = "Reset your password";
const RESET_REASON = "We will send a secure reset link to this address.";

/**
 * Shown ONLY when the caller named no reason of its own.
 *
 * Ten-plus call sites pass a specific `reason` ("Create a free account to
 * tailor your résumé to this job…"), and the generic list used to render
 * underneath it saying two of the same three things in weaker words. A
 * specific sentence beats a generic list, so the list yields to it.
 */
const VALUE_PROPS = [
  "Every scan saved and re-openable",
  "Tailor to live job openings",
  "No credit card",
];

type EmailMode = "sign-in" | "sign-up" | "forgot";

export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SignInDialogOptions>({});
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<EmailMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openSignIn = useCallback((next?: SignInDialogOptions) => {
    setOpts(next ?? {});
    setBusy(false);
    setEmailOpen(false);
    setMode("sign-in");
    setPassword("");
    setError(null);
    setNotice(null);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    // Redirect navigates away on success; only reachable again on error.
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setBusy(false);
    }
  }, []);

  const selectMode = (nextMode: EmailMode) => {
    setMode(nextMode);
    setPassword("");
    setError(null);
    setNotice(null);
  };

  const revealEmail = () => {
    setEmailOpen(true);
    selectMode("sign-in");
  };

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode !== "forgot" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setBusy(true);
    if (mode === "forgot") {
      const resetError = await sendPasswordReset(email);
      setBusy(false);
      if (resetError) setError(resetError);
      else setNotice("Check your inbox for a password reset link.");
      return;
    }

    if (mode === "sign-up") {
      const result = await signUpWithEmail(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setNotice("Check your inbox to confirm your email, then return to Resunova.");
      } else {
        setOpen(false);
      }
      return;
    }

    const signInError = await signInWithEmail(email, password);
    setBusy(false);
    if (signInError) setError(signInError);
    else setOpen(false);
  };

  const resetting = emailOpen && mode === "forgot";
  const headline = resetting ? RESET_TITLE : opts.title || DEFAULT_TITLE;
  const detail = resetting ? RESET_REASON : opts.reason || DEFAULT_REASON;
  /** A caller's own sentence replaces the generic list rather than stacking on it. */
  const showValueProps = !emailOpen && !opts.reason;

  const googleButton = (
    <Button
      onClick={() => void handleGoogle()}
      disabled={busy}
      size={emailOpen ? "default" : "lg"}
      data-signin="google"
      className="w-full gap-2.5 border"
      style={{
        background: "#ffffff",
        color: GOOGLE_LABEL,
        borderColor: GOOGLE_STROKE,
        fontWeight: emailOpen ? 400 : 500,
      }}
    >
      <GoogleGlyph size={emailOpen ? 16 : 18} />
      {busy ? "Opening Google…" : "Continue with Google"}
    </Button>
  );

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          {/* Brand, purpose, detail: one left-aligned column, one axis. */}
          <div className="flex flex-col gap-2.5">
            <LogoFull markSize={25} />
            <DialogTitle className="text-[20px] leading-tight font-semibold tracking-[-0.2px]">
              {headline}
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed text-muted-foreground">
              {detail}
            </DialogDescription>
          </div>

          {showValueProps ? (
            <ul className="flex flex-col gap-2">
              {VALUE_PROPS.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[14px] text-foreground">
                  {/* --accent-ink, not --accent: this glyph sits on an --accent-bg tint. */}
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent-ink)]">
                    {CheckIcon}
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          ) : null}

          {emailOpen ? (
            <>
              <form className="grid gap-3" onSubmit={(event) => void handleEmail(event)}>
                <label className="grid gap-1.5 text-[14px] font-medium text-foreground">
                  Email
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy}
                    required
                    className="h-10 font-normal"
                  />
                </label>
                {mode !== "forgot" ? (
                  <label className="grid gap-1.5 text-[14px] font-medium text-foreground">
                    Password
                    <Input
                      type="password"
                      autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                      placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={busy}
                      required
                      minLength={8}
                      className="h-10 font-normal"
                    />
                  </label>
                ) : null}

                {error ? <p role="alert" className="text-[14px] text-destructive">{error}</p> : null}
                {notice ? (
                  <p role="status" className="rounded-lg bg-[var(--accent-bg)] px-3 py-2 text-[14px] text-foreground">
                    {notice}
                  </p>
                ) : null}

                {/*
                  text-[var(--on-fill)] rather than the variant's
                  `text-primary-foreground`, which is a hardcoded #ffffff and
                  measures 2.53:1 on --accent in dark mode. --on-fill is
                  #ffffff in light (so light is provably unchanged at 5.19:1)
                  and #0d1117 in dark (7.49:1).
                */}
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full text-[var(--on-fill)]"
                  size="lg"
                  data-signin="email-submit"
                >
                  {busy
                    ? "Please wait…"
                    : mode === "sign-up"
                      ? "Create free account"
                      : mode === "forgot"
                        ? "Send reset link"
                        : "Log in with email"}
                </Button>
              </form>

              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => selectMode("sign-in")}
                  className="justify-self-start text-[12px] text-accent underline-offset-4 hover:underline"
                >
                  Back to login
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  {mode === "sign-in" ? (
                    <button
                      type="button"
                      onClick={() => selectMode("forgot")}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot your password?
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => selectMode(mode === "sign-up" ? "sign-in" : "sign-up")}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {mode === "sign-up" ? "Log in" : "Create account"}
                  </button>
                </div>
              )}

              {/* Recovering a password is not a moment to offer a third path. */}
              {mode !== "forgot" ? googleButton : null}
            </>
          ) : (
            <div className="grid gap-2.5">
              {googleButton}
              <button
                type="button"
                onClick={revealEmail}
                disabled={busy}
                className="text-[14px] text-accent underline-offset-4 hover:underline disabled:opacity-50"
              >
                Use email instead
              </button>
            </div>
          )}

          <p className="text-[12px] leading-relaxed text-[var(--dim)]">
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
