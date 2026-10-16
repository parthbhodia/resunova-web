"use client";

/**
 * The ways into an account. One component, both auth surfaces.
 *
 * WHY THIS EXISTS
 * ---------------
 * The gate page and the sign-in modal each had their own copy of "Google
 * button, email form, error line", and they drifted the moment one was
 * touched: the gate was rebuilt to lead with Google, and for a day afterwards
 * the modal still buried Google under an `OR` below two email fields. Same
 * product, two opinions about what the primary action is, decided by which
 * surface you happened to reach. `SignInRequiredPage`'s docstring named this
 * extraction as "the obvious move" and deferred it because doing it inside a
 * page redesign would have rewritten the highest-consequence auth surface in
 * the app as a side effect. The modal rebuild is where it belongs.
 *
 * THE ORDER IS THE DESIGN
 * -----------------------
 * Google is one click. Email is two fields, an {MIN_PASSWORD}-character rule
 * and a mode decision. So the resting state is ONE decision and email expands
 * in place — progressive disclosure, not a second surface and not a segmented
 * control, which is a decision before the decision.
 *
 * ⚠️ NO MAGIC LINK AS A PRIMARY ACTION — AND THE REASON HAS CHANGED, SO READ
 * IT RATHER THAN REUSING IT. This file used to say flatly that no
 * `signInWithOtp` call existed in the repo, which was true when written: an
 * "email me a sign-in link" button would have advertised a flow that does not
 * exist, the same defect class as the template gallery's phantom "CV layout".
 * #335 has since added one, but ONLY as the recovery for a repeated signup on
 * an address that already has an account. It is still not offered as a way in,
 * because a third entry path beside Google and email is another decision at
 * the point where the whole design is to present one.
 *
 * ⚠️ NO HARDCODED WHITE ON A FILL. DESIGN.md invariant 7: the hue tokens are
 * tuned to be READ on the background, so they are light in dark mode and
 * `#fff` on `--accent` measured 2.53:1. `--on-fill` is the token.
 */

import { useCallback, useState, type CSSProperties, type FormEvent } from "react";
import { signInWithGoogle } from "@/lib/anonScan";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/emailAuth";

/** Supabase's own floor. Stated in the placeholder rather than only on failure. */
export const MIN_PASSWORD = 8;

export function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
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

/**
 * ⚠️ --accent-ink and underlined, not --muted and bare. The gate's first build
 * had this as flush-left muted text under the Google button and it read as a
 * caption rather than the only other way in. Quiet is not invisible.
 */
const disclosureStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: "6px 0",
  color: "var(--accent-ink)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const modeSwitchStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: "10px 0 0",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

type EmailMode = "sign-in" | "sign-up" | "forgot";

export default function AuthMethods({
  idPrefix,
  onSignedIn,
  confirmationCopy,
  assurances = true,
}: {
  /** Input ids are scoped so the gate and the modal can both be mounted. */
  idPrefix: string;
  /**
   * Called once an email sign-in or an immediately-confirmed sign-up lands a
   * session. The gate passes nothing — `AuthGate`'s own auth listener swaps
   * the page for the destination. The modal uses it to close itself.
   */
  onSignedIn?: () => void;
  /** Where to come back to after confirming, named. */
  confirmationCopy: string;
  assurances?: boolean;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<EmailMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const switchMode = (next: EmailMode) => {
    setMode(next);
    setPassword("");
    setError(null);
    setNotice(null);
  };

  const handleEmail = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "forgot") {
      setBusy(true);
      const resetError = await sendPasswordReset(email);
      setBusy(false);
      if (resetError) setError(resetError);
      else setNotice("Check your inbox for a password reset link.");
      return;
    }

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }

    setBusy(true);
    if (mode === "sign-up") {
      const result = await signUpWithEmail(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.alreadyRegistered) {
        // ⚠️ THIS BRANCH IS LOAD-BEARING, NOT A NICETY. Supabase answers a
        // repeated signup with 200, no session and a user carrying no
        // identities, so `needsConfirmation` is false and `error` is null.
        // Without this case the next line down reads that as success and
        // closes the dialog on someone who is not signed in — worse than the
        // dead "check your inbox" notice it replaced.
        switchMode("sign-in");
        setPassword("");
        setNotice(
          `You already have an account for ${email.trim()}. We emailed a sign-in link — tap it and you're in. If you first joined with Google, use Continue with Google.`,
        );
      } else if (result.needsConfirmation) setNotice(confirmationCopy);
      else onSignedIn?.();
      return;
    }

    const err = await signInWithEmail(email, password);
    setBusy(false);
    if (err) setError(err);
    else onSignedIn?.();
  };

  return (
    <>
      <button type="button" onClick={handleGoogle} disabled={busy} style={{ ...quietButton, marginBottom: 10 }}>
        <GoogleGlyph />
        {busy && !emailOpen ? "Opening Google…" : "Continue with Google"}
      </button>

      {!emailOpen ? (
        <button type="button" onClick={() => setEmailOpen(true)} style={disclosureStyle}>
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

          <label htmlFor={`${idPrefix}-email`} className="sr-only">Email</label>
          <input
            id={`${idPrefix}-email`}
            style={fieldStyle}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode === "forgot" ? (
            <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>
              We&apos;ll send a reset link to that address. It expires in 24 hours.
            </p>
          ) : (
            <>
              <label htmlFor={`${idPrefix}-password`} className="sr-only">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id={`${idPrefix}-password`}
                  style={{ ...fieldStyle, paddingRight: 68 }}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  placeholder={mode === "sign-up" ? `Password (${MIN_PASSWORD}+ characters)` : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* A typo in a masked field is the commonest reason a correct
                    password is reported as wrong, and the ${MIN_PASSWORD}-char
                    rule makes it likelier on the create path. */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    margin: "auto 0",
                    height: 30,
                    padding: "0 10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--accent-ink)",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </>
          )}

          <button type="submit" disabled={busy} style={primaryStyle}>
            {busy
              ? "Working…"
              : mode === "sign-up"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </button>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
            {mode === "forgot" ? (
              <button type="button" onClick={() => switchMode("sign-in")} style={modeSwitchStyle}>
                Back to sign in
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")}
                  style={modeSwitchStyle}
                >
                  {mode === "sign-up" ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>
                {mode === "sign-in" ? (
                  <button type="button" onClick={() => switchMode("forgot")} style={modeSwitchStyle}>
                    Forgot your password?
                  </button>
                ) : null}
              </>
            )}
          </div>
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

      {/* ⚠️ Every one of these three is checkable. The comp's "About 10
          seconds" and the shipped modal's "Free resume scoring in 60 seconds"
          are not — a real scan runs 30–65s, so 60 was near the worst case sold
          as the promise. Google sign-in genuinely is one click. */}
      {assurances ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />Free</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />No credit card</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tick />One click with Google</span>
        </div>
      ) : null}
    </>
  );
}
