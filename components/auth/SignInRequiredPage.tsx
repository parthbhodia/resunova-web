"use client";

import { useCallback, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { signInWithGoogle } from "@/lib/anonScan";
import { signInWithEmail, signUpWithEmail } from "@/lib/emailAuth";
import GatePreview from "./GatePreview";
import { gateContentFor } from "./gateContent";

/**
 * The page a signed-out visitor lands on when they open something gated.
 *
 * WHAT WAS WRONG WITH THE ONE THIS REPLACES
 * -----------------------------------------
 * A 420px card centred in an empty viewport, reading "Sign in to continue /
 * Interview Prep needs a free account so your work is saved to it." Three
 * things, in order of how much they cost:
 *
 * 1. ⚠️ ITS PRIMARY BUTTON OPENED ANOTHER SIGN-IN SURFACE ON TOP OF IT. The
 *    page asked you to sign in, and pressing the button that says so produced
 *    a modal that asked again. A door onto a door: two surfaces for one
 *    decision, and the first one had nothing on it but the request.
 * 2. It led with OUR requirement ("needs a free account") rather than what
 *    the visitor gets, on the one screen whose entire job is to be worth
 *    completing.
 * 3. `background: var(--accent); color: "#fff"` — the pairing DESIGN.md
 *    invariant 7 exists to forbid. Measured 2.53:1 in dark mode, because the
 *    hue tokens are tuned to be READ on the background and are therefore
 *    light in dark mode. `--on-fill` is the token for text on a solid fill.
 *
 * So: the form is ON the page, the headline leads with the gain, and the
 * right half shows the destination half-open.
 *
 * ⚠️ WHY THIS DOES NOT REUSE SignInDialog'S FORM, since that is the obvious
 * move: the dialog's field state and submit handlers live inside
 * SignInDialogProvider, interleaved with its own `open` flag. Extracting them
 * would rewrite the highest-consequence auth surface in the app inside a page
 * redesign — two risks in one change. The SHARED LAYER IS ALREADY THE RIGHT
 * ONE: both surfaces call the same `signInWithGoogle` / `signInWithEmail` /
 * `signUpWithEmail` from lib/, so no auth logic is duplicated here. What
 * differs is markup, and a 420px modal and a half-page panel genuinely are
 * different layouts.
 *
 * ⚠️ DEVIATION FROM THE APPROVED COMP, and it is a correction not a liberty:
 * the comp's email action read "Email me a sign-in link". THERE IS NO
 * MAGIC-LINK FLOW IN THIS REPO — no `signInWithOtp` call anywhere — so
 * shipping that button would advertise a flow that does not exist, the same
 * defect class as the template gallery's phantom "CV layout". Email is
 * password-based here, which is what the fields below ask for.
 */

const MIN_PASSWORD = 8;

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z" />
      <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.1l3.8 3c.9-2.7 3.4-4.3 6.4-4.3z" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true"
      style={{ stroke: "var(--green-ink)", fill: "none", strokeWidth: 2.4 }}>
      <path d="M3 8.5l3.2 3L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
  marginBottom: 10,
};

const primaryStyle: CSSProperties = {
  width: "100%",
  padding: "13px 18px",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  // ⚠️ NOT "#fff". DESIGN.md invariant 7 — the shipped gate's hardcoded white
  // measured 2.53:1 on --accent in dark mode.
  color: "var(--on-fill)",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};

const quietButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "13px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};

export default function SignInRequiredPage({ pathname }: { pathname: string | null }) {
  const content = gateContentFor(pathname);
  const hasPreview = Boolean(content.previewCards?.length);

  const [emailOpen, setEmailOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    // On success this navigates away, so we are only here again on failure.
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setBusy(false);
    }
  }, []);

  const handleEmail = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    if (creating) {
      const result = await signUpWithEmail(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setNotice("Check your inbox to confirm your email, then come back to this page.");
      }
      // On an immediate session AuthGate's own listener swaps this page for
      // the destination, so there is nothing to navigate here.
      return;
    }
    const err = await signInWithEmail(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="rn-gate-shell" style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center" }}>
      <div
        className="rn-gate"
        style={{
          width: "100%",
          maxWidth: hasPreview ? 1080 : 560,
          margin: "0 auto",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--surface)",
          display: "grid",
          // 46/54 — the ask is the narrower half on purpose: the preview is
          // the reason to complete it, so it gets the room.
          gridTemplateColumns: hasPreview ? "minmax(0,46fr) minmax(0,54fr)" : "minmax(0,1fr)",
        }}
      >
        <div className="rn-gate-ask" style={{ padding: "52px 48px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              background: "var(--accent-bg)",
              color: "var(--accent-ink)",
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            {content.eyebrow}
          </span>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textWrap: "balance",
            }}
          >
            {content.headline}
          </h1>
          <p style={{ margin: "0 0 26px", fontSize: 14, lineHeight: 1.65, color: "var(--muted)", maxWidth: "42ch" }}>
            {content.lede}
          </p>

          <button type="button" onClick={handleGoogle} disabled={busy} style={{ ...quietButton, marginBottom: 10 }}>
            <GoogleGlyph />
            {busy && !emailOpen ? "Opening Google…" : "Continue with Google"}
          </button>

          {!emailOpen ? (
            /* Progressive disclosure rather than a second surface: the resting
               state is ONE decision, and choosing email expands in place. A
               segmented sign-in/create control here would be a decision before
               the decision. */
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              style={{
                background: "none",
                border: "none",
                padding: "6px 0",
                // ⚠️ --accent-ink + an underline, not --muted and bare. The
                // first build had this as flush-left muted text under the
                // Google button and it read as a caption rather than the only
                // other way in. Quiet is not the same as invisible.
                color: "var(--accent-ink)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              Continue with email instead
            </button>
          ) : (
            <form onSubmit={handleEmail}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  margin: "14px 0",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                OR
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <label htmlFor="rn-gate-email" className="sr-only">Email</label>
              <input
                id="rn-gate-email"
                style={fieldStyle}
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="rn-gate-password" className="sr-only">Password</label>
              <input
                id="rn-gate-password"
                style={fieldStyle}
                type="password"
                required
                autoComplete={creating ? "new-password" : "current-password"}
                placeholder={creating ? `Password (${MIN_PASSWORD}+ characters)` : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" disabled={busy} style={primaryStyle}>
                {busy ? "Working…" : creating ? "Create account" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => { setCreating((c) => !c); setError(null); setNotice(null); }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "10px 0 0",
                  color: "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {creating ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
          )}

          {error ? (
            <p role="alert" style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--red-ink)" }}>
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--green-ink)" }}>
              {notice}
            </p>
          ) : null}

          {/* ⚠️ Every one of these three is checkable. "About 10 seconds" from
              the comp is not, so it is replaced by a claim that is: Google
              sign-in genuinely is one click. The repo bans unverifiable
              numbers in marketing copy and a gate is marketing copy. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />Free</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />No credit card</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />One click with Google</span>
          </div>

          {/* VERIFIED, not assumed: signInWithGoogle calls stashPostLoginDest()
              and passes the current URL as the OAuth redirectTo, and the email
              path never leaves this URL at all. So naming the destination here
              is a promise the code keeps. */}
          <p style={{ marginTop: 26, paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted)" }}>
            You&apos;ll land back on {content.eyebrow}, not the home page.
            {" · "}
            <Link href="/" style={{ color: "var(--muted)", fontWeight: 600, textDecoration: "none" }}>
              Back to home
            </Link>
          </p>
        </div>

        {hasPreview ? (
          <div className="rn-gate-preview" style={{ borderLeft: "1px solid var(--border)", minWidth: 0 }}>
            <GatePreview label={content.previewLabel ?? "What's behind this"} cards={content.previewCards!} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
