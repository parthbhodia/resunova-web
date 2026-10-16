"use client";

/**
 * /extension/connect — the one page the extension's auth bridge runs on.
 *
 * The handshake, and why it is two steps:
 *
 *   1. This page (signed in) calls /api/extension/connect-code. `apiFetch`
 *      attaches the Supabase session, so this call site never touches a token.
 *      The backend returns a single-use code that expires in 2 minutes.
 *   2. We hand the CODE to the extension over a window CustomEvent. The
 *      extension exchanges it at /api/extension/exchange for its own
 *      revocable session token.
 *
 * A code is safe to hand to page script. A Supabase refresh token is not: any
 * script on this origin could read it out of the event and get a durable
 * account credential. That was the previous design and it is the reason for
 * the split.
 *
 * The CustomEvent is still used deliberately. It is the one channel that
 * needs no extension ID and no externally_connectable listener, and it only
 * ever carries the short-lived code.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { LogoFull } from "@/components/BrandLogo";
import { getSupabaseClient } from "@/lib/supabase";
import { apiFetch, refusalFrom } from "@/lib/apiClient";
import { useSignInDialog } from "@/components/SignInDialog";

type Phase =
  | "checking"
  | "signed_out"
  | "ready"       // signed in, waiting for the user to trigger the handshake
  | "minting"     // asking the backend for a code
  | "handing_off" // code dispatched, waiting for the extension to confirm
  | "connected"
  | "waiting"     // code dispatched, no extension picked it up yet
  | "error";

const AUTH_EVENT = "resunova-extension-auth";
const ACK_EVENT = "resunova-extension-ack";

export default function ExtensionConnect() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { openSignIn } = useSignInDialog();

  // Guard against a late ack resolving an unmounted page, and against two
  // in-flight handshakes racing each other.
  const settled = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((next: Phase, note?: string) => {
    if (settled.current) return;
    settled.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPhase(next);
    setMessage(note ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.session) {
          setEmail(data.session.user.email ?? "");
          setPhase("ready");
        } else {
          setPhase("signed_out");
        }
      })
      .catch(() => {
        if (!cancelled) finish("error", "Could not read your session. Try reloading.");
      });
    return () => {
      cancelled = true;
    };
  }, [finish]);

  // The extension fires this back once it has stored its session.
  useEffect(() => {
    const onAck = () => finish("connected");
    window.addEventListener(ACK_EVENT, onAck);
    return () => window.removeEventListener(ACK_EVENT, onAck);
  }, [finish]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const connect = useCallback(async () => {
    if (settled.current) return;
    settled.current = false;
    setPhase("minting");
    setMessage(null);

    let code: string;
    try {
      const resp = await apiFetch("/api/extension/connect-code", { method: "POST" });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // Branch on the declared remedy, not on prose.
        const refusal = refusalFrom(resp.status, body);
        finish(
          "error",
          refusal?.remedy === "sign_in"
            ? "Your session expired. Sign in again."
            : "Could not start the connection. Try again in a moment.",
        );
        return;
      }
      const body = await resp.json();
      if (!body?.code) {
        finish("error", "The server did not return a connection code.");
        return;
      }
      code = body.code;
    } catch {
      finish("error", "Could not reach the Resunova API. Check your connection.");
      return;
    }

    setPhase("handing_off");

    // The extension is listening for this. It is a code, not a credential:
    // single use, two-minute life, useless after it is spent.
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, { detail: { code, expiresIn: 120 } }),
    );

    // No ack does not mean failure: the extension may not be installed yet.
    // Say so, and let the user retry without a reload.
    timerRef.current = setTimeout(() => {
      if (!settled.current) {
        settled.current = true;
        setPhase("waiting");
      }
    }, 4000);
  }, [finish]);

  const retry = useCallback(() => {
    settled.current = false;
    void connect();
  }, [connect]);

  const busy = phase === "minting" || phase === "handing_off";

  return (
    <MuiThemeRegistry>
      <div className="extc-root">
        <header className="extc-header">
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Resunova home">
            <LogoFull markSize={26} textColor="var(--text)" />
          </Link>
          <Link href="/" className="extc-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </header>

        <main className="extc-main">
          <StatusIcon phase={phase} />

          <p className="extc-eyebrow">Connect the extension</p>
          <h1 className="extc-h1">{titleFor(phase)}</h1>
          <p className="extc-lede">{bodyFor(phase, email)}</p>

          {message && (
            <p role="alert" className="extc-alert">
              {message}
            </p>
          )}

          <Action
            phase={phase}
            busy={busy}
            onConnect={() => void connect()}
            onRetry={retry}
            onSignIn={() =>
              openSignIn({ ask: "extension_connect" })
            }
          />

          {phase === "waiting" && (
            <p className="extc-hint">
              The extension did not respond. Make sure it is installed, and reload this tab if you
              have it pinned.
            </p>
          )}

          <p className="extc-foot">
            Your Resunova password is never shared with the extension, and the connection can be
            revoked from the extension&apos;s popup or from Account settings at any time.
          </p>
        </main>

        <style>{EXT_CSS}</style>
      </div>
    </MuiThemeRegistry>
  );
}

function StatusIcon({ phase }: { phase: Phase }) {
  if (phase === "connected") {
    return (
      <span className="extc-icon extc-icon-ok" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (phase === "checking" || phase === "minting" || phase === "handing_off") {
    return (
      <span className="extc-icon" aria-hidden="true">
        <span className="extc-spin" />
      </span>
    );
  }
  return null;
}

function titleFor(phase: Phase): string {
  switch (phase) {
    case "connected": return "Extension connected";
    case "signed_out": return "Sign in to continue";
    case "ready": return "Ready to connect";
    case "minting": return "Creating a secure code";
    case "handing_off": return "Handing off to the extension";
    case "waiting": return "Waiting for the extension";
    case "error": return "Something went wrong";
    default: return "Checking your session";
  }
}

function bodyFor(phase: Phase, email: string): string {
  switch (phase) {
    case "connected":
      return "The extension now has its own session and can read your Resunova profile. Open any supported job posting and use the Autofill button.";
    case "signed_out":
      return "Your Resunova account holds the profile the extension fills forms from, so it needs to be signed in on this device first.";
    case "ready":
      return email
        ? `Signed in as ${email}. When you are ready, the extension gets a short-lived code instead of your account credentials.`
        : "When you are ready, the extension gets a short-lived code instead of your account credentials.";
    case "minting":
      return "Asking the Resunova API for a single-use code that is valid for two minutes.";
    case "handing_off":
      return "The extension is picking up the code and exchanging it for its own revocable session.";
    case "waiting":
      return "The code was created. If the extension is installed, it should connect within a few seconds.";
    case "error":
      return "We could not complete the handshake. Nothing was shared with the extension.";
    default:
      return "Confirming you are signed in.";
  }
}

function Action({
  phase, busy, onConnect, onRetry, onSignIn,
}: {
  phase: Phase; busy: boolean;
  onConnect: () => void; onRetry: () => void; onSignIn: () => void;
}) {
  if (phase === "checking" || busy) {
    return (
      <Button variant="contained" disableElevation disabled>
        Working…
      </Button>
    );
  }
  if (phase === "connected") {
    return (
      <Button component={Link} href="/profile/" variant="contained" disableElevation>
        Check your profile
      </Button>
    );
  }
  if (phase === "signed_out") {
    return (
      <Button variant="contained" disableElevation onClick={onSignIn}>
        Sign in
      </Button>
    );
  }
  if (phase === "error" || phase === "waiting") {
    return (
      <Button variant="contained" disableElevation onClick={onRetry}>
        Try again
      </Button>
    );
  }
  return (
    <Button variant="contained" disableElevation onClick={onConnect}>
      Connect extension
    </Button>
  );
}

const EXT_CSS = `
  @keyframes extc-spin { to { transform: rotate(360deg); } }
  .extc-root {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', -apple-system, sans-serif;
  }
  .extc-header {
    position: sticky; top: 0; z-index: 50;
    height: 56px; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--glass-bg);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .extc-back {
    font-size: var(--font-size-base); color: var(--dim); text-decoration: none;
    display: flex; align-items: center; gap: 6px;
    transition: color var(--transition);
  }
  .extc-back:hover { color: var(--text); }
  .extc-main { max-width: 560px; margin: 0 auto; padding: 64px 24px 80px; text-align: center; }
  .extc-icon {
    width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 22px;
    background: var(--accent-bg); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
  }
  .extc-icon-ok { background: var(--green-bg); color: var(--green-ink); }
  .extc-spin {
    width: 22px; height: 22px; border: 2px solid var(--accent);
    border-top-color: transparent; border-radius: 50%;
    animation: extc-spin 0.8s linear infinite;
  }
  .extc-eyebrow {
    font-size: var(--font-size-sm); font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--accent); margin: 0 0 14px;
  }
  .extc-h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.18; margin: 0 0 14px; }
  .extc-lede { font-size: var(--font-size-lg); color: var(--muted); line-height: 1.7; margin: 0 0 32px; }
  .extc-alert {
    font-size: var(--font-size-base); color: var(--red-ink, var(--red));
    background: var(--red-bg); border: 1px solid var(--red-bg);
    border-radius: 10px; padding: 10px 14px; margin: 0 0 20px; line-height: 1.6;
  }
  .extc-hint { font-size: var(--font-size-sm); color: var(--dim); margin-top: 20px; line-height: 1.6; }
  .extc-foot { font-size: var(--font-size-sm); color: var(--dim); margin-top: 36px; line-height: 1.7; }
  @media (prefers-reduced-motion: reduce) {
    @keyframes extc-spin { to { transform: none; } }
    .extc-back { transition: none; }
  }
`;
