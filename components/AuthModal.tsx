"use client";

/**
 * AuthModal — the passwordless sign-in surface for the marketing LandingPage.
 *
 * The landing page renders OUTSIDE AppShell, so it can't use the in-app
 * SignInDialogProvider. This is a self-contained, controlled modal offering the
 * two passwordless paths: Continue with Google, or an emailed login code.
 *
 * Email flow: sendEmailLoginCode() → user receives a 6-digit code (requires the
 * Supabase "Magic Link" email template to include {{ .Token }}) → verify step →
 * verifyEmailLoginCode() establishes the session and AuthGate swaps to the app.
 * If the project's template sends a magic link instead of a code, clicking that
 * link also signs the user in (emailRedirectTo fallback).
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  signInWithGoogle,
  sendEmailLoginCode,
  verifyEmailLoginCode,
} from "@/lib/anonScan";

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

const MailGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function AuthModal({
  open,
  onOpenChange,
  title = "Sign in to Resunova",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}) {
  const [googleBusy, setGoogleBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());

  // Reset transient state as the modal closes (in the handler, not an effect).
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStage("request");
      setCode("");
      setError(null);
      setEmailBusy(false);
      setGoogleBusy(false);
    }
    onOpenChange(next);
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    setError(null);
    // Redirect navigates away on success; only reachable again on error.
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setGoogleBusy(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || emailBusy) return;
    setEmailBusy(true);
    setError(null);
    const err = await sendEmailLoginCode(email.trim());
    setEmailBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setStage("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s+/g, "");
    if (token.length < 6 || emailBusy) return;
    setEmailBusy(true);
    setError(null);
    const err = await verifyEmailLoginCode(email.trim(), token);
    if (err) {
      setError(err);
      setEmailBusy(false);
      return;
    }
    // Session established — AuthGate's onAuthStateChange swaps LandingPage for
    // the app shell. Close the modal.
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-1 px-2 pt-1 text-center">
          <DialogTitle className="text-[22px] font-bold text-[var(--text)]">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Sign in with Google or an emailed login code.
          </DialogDescription>
        </div>

        {stage === "request" ? (
          <div className="mt-3 flex flex-col gap-4">
            <Button
              onClick={() => void handleGoogle()}
              disabled={googleBusy}
              size="lg"
              className="w-full gap-2.5 bg-white text-[#1f2937] ring-1 ring-foreground/10 hover:bg-white/90 dark:bg-white dark:text-[#1f2937]"
            >
              <GoogleGlyph />
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </Button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">or</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 focus-within:border-[color:var(--accent)]">
                <span className="text-[var(--muted)]">{MailGlyph}</span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  aria-label="Email address"
                  className="h-11 w-full flex-1 border-0 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!emailValid || emailBusy}
                className="w-full"
              >
                {emailBusy ? "Sending…" : "Email me a login code"}
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="mt-3 flex flex-col gap-3">
            <p className="text-center text-[13px] leading-relaxed text-[var(--muted)]">
              We sent a login code to <strong className="text-[var(--text)]">{email.trim()}</strong>.
              Enter it below — or tap the link in the email.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              aria-label="Login code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 text-center text-[18px] font-semibold tracking-[0.3em] text-[var(--text)] outline-none focus:border-[color:var(--accent)]"
            />
            <Button type="submit" size="lg" disabled={code.replace(/\s+/g, "").length < 6 || emailBusy} className="w-full">
              {emailBusy ? "Verifying…" : "Verify & continue"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStage("request");
                setCode("");
                setError(null);
              }}
              className="text-[12.5px] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-1 rounded-lg border border-[var(--red-bg)] bg-[var(--red-bg)] px-3 py-2 text-center text-[12.5px] text-[var(--red-ink)]">
            {error}
          </p>
        ) : null}

        <p className="mt-2 px-4 text-center text-[11px] leading-relaxed text-[var(--muted)]">
          By continuing you agree to our{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-[var(--text)]">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--text)]">Privacy Policy</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
