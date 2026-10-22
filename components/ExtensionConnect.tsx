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
 *
 * Three outcomes come back, and they are different facts:
 *   - ack:   the extension stored its session            -> connected
 *   - error: the extension is there but the exchange failed -> failed
 *   - nothing within 4s: no extension answered           -> waiting
 * The bridge has always emitted the error event; this page used to ignore it,
 * so every failed exchange read as "the extension did not respond".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { LogoFull, LogoMark } from "@/components/BrandLogo";
import { getSupabaseClient } from "@/lib/supabase";
import { apiFetch, refusalFrom } from "@/lib/apiClient";
import { useSignInDialog } from "@/components/SignInDialog";
import { CHROME_STORE_URL, IS_STORE_LIVE } from "@/lib/extensionContent";

export type Phase =
  | "checking"
  | "signed_out"
  | "ready"       // signed in, waiting for the user to trigger the handshake
  | "minting"     // asking the backend for a code
  | "handing_off" // code dispatched, waiting for the extension to answer
  | "connected"
  | "waiting"     // code dispatched, nothing answered: extension likely missing
  | "failed"      // the extension answered with an error
  | "error";      // we could not mint a code

const AUTH_EVENT = "resunova-extension-auth";
const ACK_EVENT = "resunova-extension-ack";
const ERROR_EVENT = "resunova-extension-error";
const ANSWER_TIMEOUT_MS = 4000;

type StepState = "todo" | "now" | "busy" | "done" | "fail";

/** Where the bar sits for each phase. One table, so the bar cannot disagree with the copy. */
export function progressFor(phase: Phase): StepState[] {
  switch (phase) {
    case "ready": return ["done", "now", "todo", "todo"];
    case "minting": return ["done", "busy", "todo", "todo"];
    case "handing_off": return ["done", "done", "busy", "todo"];
    case "waiting":
    case "failed": return ["done", "done", "fail", "todo"];
    case "connected": return ["done", "done", "done", "done"];
    case "error": return ["done", "fail", "todo", "todo"];
    case "signed_out": return ["now", "todo", "todo", "todo"];
    default: return ["busy", "todo", "todo", "todo"];
  }
}

const STEPS: { label: string; sub: string }[] = [
  { label: "Sign in", sub: "Your profile" },
  { label: "One-time code", sub: "Valid 2 minutes" },
  { label: "Extension", sub: "Signs itself in" },
  { label: "Connected", sub: "Ready to fill" },
];

export default function ExtensionConnect() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // The short code the extension reports when its exchange fails, for support.
  const [reference, setReference] = useState<string | null>(null);
  const { openSignIn } = useSignInDialog();

  // One in-flight handshake at a time, and a late answer must not resolve an
  // unmounted page. phaseRef lets the event listeners read the current phase
  // without re-subscribing on every change.
  const phaseRef = useRef<Phase>("checking");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((next: Phase, note?: string) => {
    phaseRef.current = next;
    if (timerRef.current && next !== "handing_off") {
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
          go("ready");
        } else {
          go("signed_out");
        }
      })
      .catch(() => {
        if (!cancelled) go("error", "Could not read your session. Try reloading.");
      });
    return () => {
      cancelled = true;
    };
  }, [go]);

  // Answers from the extension. They count while we are waiting AND after the
  // 4s timeout: a slow API can answer late, and a real answer beats a guess.
  useEffect(() => {
    const live = () => phaseRef.current === "handing_off" || phaseRef.current === "waiting";
    const onAck = () => { if (live()) go("connected"); };
    const onErr = (e: Event) => {
      if (!live()) return;
      setReference(referenceFrom(e));
      go("failed");
    };
    window.addEventListener(ACK_EVENT, onAck);
    window.addEventListener(ERROR_EVENT, onErr);
    return () => {
      window.removeEventListener(ACK_EVENT, onAck);
      window.removeEventListener(ERROR_EVENT, onErr);
    };
  }, [go]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const connect = useCallback(async () => {
    if (phaseRef.current === "minting" || phaseRef.current === "handing_off") return;
    go("minting");

    let code: string;
    try {
      const resp = await apiFetch("/api/extension/connect-code", { method: "POST" });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // Branch on the declared remedy, not on prose.
        const refusal = refusalFrom(resp.status, body);
        go(
          "error",
          refusal?.remedy === "sign_in"
            ? "Your session expired. Sign in again."
            : "Could not start the connection. Try again in a moment.",
        );
        return;
      }
      const body = await resp.json();
      if (!body?.code) {
        go("error", "The server did not return a connection code.");
        return;
      }
      code = body.code;
    } catch {
      go("error", "Could not reach the Resunova API. Check your connection.");
      return;
    }

    go("handing_off");

    // The extension is listening for this. It is a code, not a credential:
    // single use, two-minute life, useless after it is spent.
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { code, expiresIn: 120 } }));

    // No answer is not failure: the extension may not be installed yet.
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (phaseRef.current === "handing_off") go("waiting");
    }, ANSWER_TIMEOUT_MS);
  }, [go]);

  const copy = copyFor(phase, email);
  const steps = progressFor(phase);

  return (
    <MuiThemeRegistry>
      <div className="extc-root">
        <header className="extc-header">
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Resunova home">
            <LogoFull markSize={26} textColor="var(--text)" />
          </Link>
          <Link href="/" className="extc-back">Back to home</Link>
        </header>

        <nav className="extc-prog" aria-label="Connection progress">
          <ol>
            {STEPS.map((st, i) => (
              <li key={st.label} className={`extc-step extc-step-${steps[i]}`} aria-current={steps[i] === "now" || steps[i] === "busy" ? "step" : undefined}>
                <span className="extc-seg" aria-hidden="true" />
                <span className="extc-steplb">
                  {st.label}
                  <span className="extc-stepsub">{st.sub}</span>
                  <span className="extc-sr"> {srState(steps[i])}</span>
                </span>
              </li>
            ))}
          </ol>
        </nav>

        <main className="extc-page">
          <section>
            <span className={`extc-pill extc-pill-${copy.tone}`}>
              <i aria-hidden="true" />
              {copy.pill}
            </span>
            <h1 className="extc-h1">{copy.title}</h1>
            <p className="extc-lede">{copy.body}</p>

            {message && (
              <p role="alert" className="extc-alert">
                {message}
              </p>
            )}

            {phase === "failed" && reference && (
              <p className="extc-ref">
                Reference for support: <code>{reference}</code>
              </p>
            )}

            <div className="extc-acts" aria-live="polite">
              <Action
                phase={phase}
                onConnect={() => void connect()}
                onSignIn={() => openSignIn({ reason: "Sign in to connect the Resunova extension." })}
              />
              {(phase === "waiting") && IS_STORE_LIVE && (
                <Button component="a" href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" variant="outlined" disableElevation>
                  Install the extension
                </Button>
              )}
              {phase === "connected" && (
                <Button component={Link} href="/extension/" variant="outlined" disableElevation>
                  Supported sites
                </Button>
              )}
            </div>

            <ul className="extc-tips">
              <li><Tick /><span><b>Your password stays here.</b> The extension gets a code that works once and expires in 2 minutes, then holds its own sign-in.</span></li>
              <li><Tick /><span><b>You stay in control.</b> It fills the form, you review every field and press submit yourself.</span></li>
              <li><Tick /><span><b>Disconnect any time</b> from the extension or Account settings. A connection lasts at most 90 days, then asks you to reconnect.</span></li>
            </ul>
          </section>

          <aside className="extc-stage" aria-hidden="true">
            <div className="extc-chrome">
              <span className="extc-dots"><i /><i /><i /></span>
              <span className="extc-url">resunova.io/extension/connect</span>
              <span className="extc-extbtn"><LogoMark size={22} /></span>
            </div>
            <div className="extc-pop">
              <div className="extc-pop-h">
                <span className="extc-pop-i">
                  <svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
                </span>
                <div>
                  <div className="extc-pop-t">Resunova Auto-Fill</div>
                  <div className="extc-pop-s">Job form autofill</div>
                </div>
              </div>
              <div className="extc-pop-b">
                <div className="extc-pop-row">
                  <span className={`extc-led extc-led-${copy.led}`} />
                  <div>
                    <div className="extc-pop-rt">{copy.popTitle}</div>
                    <div className="extc-pop-rs">{copy.popSub}</div>
                  </div>
                </div>
              </div>
              <div className="extc-pop-f"><span>Help &amp; instructions</span><span>Resunova</span></div>
            </div>
            <p className="extc-cap">Illustration of the extension popup</p>
          </aside>
        </main>

        <style>{EXT_CSS}</style>
      </div>
    </MuiThemeRegistry>
  );
}

/**
 * The extension reports a machine code ("invalid_or_expired_code"), never prose.
 * Only a short snake_case token is shown: this value comes from a window event,
 * so anything else is dropped rather than rendered.
 */
export function referenceFrom(e: Event): string | null {
  const raw = (e as CustomEvent<{ error?: unknown }>).detail?.error;
  return typeof raw === "string" && /^[a-z][a-z0-9_]{1,63}$/i.test(raw) ? raw : null;
}

function srState(s: StepState): string {
  switch (s) {
    case "done": return "(done)";
    case "now": return "(current)";
    case "busy": return "(in progress)";
    case "fail": return "(needs attention)";
    default: return "";
  }
}

function Tick() {
  return (
    <svg className="extc-tick" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type Copy = {
  pill: string;
  tone: "info" | "ok" | "warn";
  title: string;
  body: string;
  led: "off" | "on" | "bad";
  popTitle: string;
  popSub: string;
};

export function copyFor(phase: Phase, email: string): Copy {
  switch (phase) {
    case "connected":
      return { pill: "Connected", tone: "ok", title: "You're connected", body: "Open any supported job posting and use Auto-Fill. The extension reads your profile from Resunova each time.", led: "on", popTitle: "Connected", popSub: email || "Signed in" };
    case "signed_out":
      return { pill: "Chrome extension", tone: "info", title: "Sign in to connect", body: "Your Resunova profile is what the extension fills forms from, so this browser needs to be signed in first.", led: "off", popTitle: "Not connected", popSub: "Sign in to enable auto-fill" };
    case "ready":
      return { pill: email ? `Signed in as ${email}` : "Signed in", tone: "ok", title: "Connect Resunova Auto-Fill", body: "One click links this browser's extension to your profile. You can disconnect it whenever you like.", led: "off", popTitle: "Not connected", popSub: email ? `Ready to link to ${email}` : "Ready to link" };
    case "minting":
      return { pill: "Connecting", tone: "info", title: "Making a secure code", body: "Asking Resunova for a single-use code that is valid for two minutes.", led: "off", popTitle: "Connecting…", popSub: "Waiting for a code" };
    case "handing_off":
      return { pill: "Connecting", tone: "info", title: "Linking the extension", body: "We handed a one-time code to the extension. It is exchanging it for its own sign-in.", led: "off", popTitle: "Connecting…", popSub: "Exchanging the code" };
    case "waiting":
      return { pill: "Extension not found", tone: "warn", title: "We can't see the extension", body: "The code was created but nothing picked it up. Make sure the extension is installed, then reload this tab if you just added it.", led: "off", popTitle: "Not detected", popSub: "This tab never heard back" };
    case "failed":
      return { pill: "Extension found", tone: "warn", title: "The extension couldn't finish", body: "It is installed and received the code, but could not complete sign-in. Nothing was shared and your Resunova account is unchanged. Trying again makes a new code.", led: "bad", popTitle: "Could not connect", popSub: "Sign-in did not complete" };
    case "error":
      return { pill: "Something went wrong", tone: "warn", title: "We couldn't start the connection", body: "Nothing was shared with the extension.", led: "off", popTitle: "Not connected", popSub: "Nothing was shared" };
    default:
      return { pill: "Chrome extension", tone: "info", title: "Checking your session", body: "Confirming you are signed in.", led: "off", popTitle: "Not connected", popSub: "Checking" };
  }
}

function Action({
  phase, onConnect, onSignIn,
}: {
  phase: Phase;
  onConnect: () => void; onSignIn: () => void;
}) {
  if (phase === "checking" || phase === "minting" || phase === "handing_off") {
    return <Button variant="contained" disableElevation disabled>Working…</Button>;
  }
  if (phase === "connected") {
    return <Button component={Link} href="/profile/" variant="contained" disableElevation>Check your profile</Button>;
  }
  if (phase === "signed_out") {
    return <Button variant="contained" disableElevation onClick={onSignIn}>Sign in</Button>;
  }
  if (phase === "failed" || phase === "waiting" || phase === "error") {
    return <Button variant="contained" disableElevation onClick={onConnect}>Try again</Button>;
  }
  return <Button variant="contained" disableElevation onClick={onConnect}>Connect extension</Button>;
}

const EXT_CSS = `
  @keyframes extc-spin { to { transform: rotate(360deg); } }
  .extc-root { min-height: 100dvh; background: var(--bg); color: var(--text); font-family: 'DM Sans', -apple-system, sans-serif; }
  .extc-header {
    position: sticky; top: 0; z-index: 50; height: 56px; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .extc-back { font-size: var(--fs-body); color: var(--dim); text-decoration: none; transition: color var(--md-duration-short, .2s) var(--md-easing-standard); }
  .extc-back:hover { color: var(--text); }
  .extc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  .extc-prog { max-width: 1080px; margin: 0 auto; padding: 28px 24px 0; }
  .extc-prog ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .extc-step { display: grid; gap: 8px; }
  .extc-seg { height: 6px; border-radius: 999px; background: var(--surface3); position: relative; overflow: hidden; }
  .extc-seg::after { content: ""; position: absolute; inset: 0; width: 0; border-radius: inherit; background: var(--accent); transition: width var(--md-duration-medium, .3s) var(--md-easing-standard); }
  .extc-step-done .extc-seg::after { width: 100%; background: var(--green-ink); }
  .extc-step-now .extc-seg::after { width: 55%; }
  .extc-step-busy .extc-seg::after { width: 55%; animation: extc-pulse 1.1s ease-in-out infinite alternate; }
  .extc-step-fail .extc-seg::after { width: 100%; background: var(--red-ink); }
  @keyframes extc-pulse { from { opacity: .45; } to { opacity: 1; } }
  .extc-steplb { font-size: var(--fs-small); font-weight: 600; color: var(--muted); display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .extc-step-now .extc-steplb, .extc-step-busy .extc-steplb, .extc-step-done .extc-steplb { color: var(--text); }
  .extc-step-fail .extc-steplb { color: var(--red-ink); }
  .extc-stepsub { font-size: var(--fs-caption); font-weight: 400; color: var(--muted); }

  .extc-page { max-width: 1080px; margin: 0 auto; padding: 48px 24px 72px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 440px); gap: 56px; align-items: start; }
  .extc-pill { display: inline-flex; align-items: center; gap: 7px; font-size: var(--fs-small); font-weight: 700; padding: 5px 11px; border-radius: 999px; margin-bottom: 18px; max-width: 100%; overflow-wrap: anywhere; }
  .extc-pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
  .extc-pill-info { background: var(--accent-bg); color: var(--accent-ink); }
  .extc-pill-ok { background: var(--green-bg); color: var(--green-ink); }
  .extc-pill-warn { background: var(--amber-bg); color: var(--amber-ink); }
  .extc-h1 { font-size: var(--fs-display); font-weight: 800; letter-spacing: -1.1px; line-height: 1.12; max-width: 15ch; margin: 0 0 14px; }
  .extc-lede { font-size: var(--fs-subhead); color: var(--muted); line-height: 1.65; max-width: 46ch; margin: 0 0 26px; }
  .extc-alert { font-size: var(--fs-body); color: var(--red-ink); background: var(--red-bg); border-radius: 12px; padding: 11px 14px; margin: 0 0 20px; line-height: 1.55; max-width: 52ch; }
  .extc-ref { margin: -8px 0 20px; font-size: var(--fs-small); color: var(--muted); }
  .extc-ref code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--text); background: var(--surface2); padding: 2px 6px; border-radius: 6px; }
  .extc-acts { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .extc-tips { list-style: none; margin: 30px 0 0; padding: 24px 0 0; border-top: 1px solid var(--border); display: grid; gap: 12px; max-width: 50ch; }
  .extc-tips li { display: flex; gap: 11px; font-size: var(--fs-body); color: var(--muted); line-height: 1.55; }
  .extc-tips b { color: var(--text); font-weight: 600; }
  .extc-tick { flex: none; width: 16px; height: 16px; margin-top: 2px; stroke: var(--green-ink); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  .extc-stage { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; align-items: center; }
  .extc-chrome { width: 100%; display: flex; align-items: center; gap: 8px; padding: 0 4px 14px; font-size: var(--fs-small); color: var(--muted); }
  .extc-dots { display: flex; gap: 5px; }
  .extc-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--surface3); }
  .extc-url { flex: 1; text-align: center; }
  .extc-extbtn { display: grid; }
  /* the extension's own popup is dark in every theme, so this illustration is too */
  .extc-pop { width: 300px; max-width: 100%; background: #0f1624; color: #e6edf3; border-radius: 12px; overflow: hidden; border: 1px solid rgba(240,246,252,.12); box-shadow: var(--md-elevation-3); }
  .extc-pop-h { display: flex; gap: 11px; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(240,246,252,.1); }
  .extc-pop-i { width: 32px; height: 32px; border-radius: 9px; background: #4f5df0; display: grid; place-items: center; }
  .extc-pop-i svg { width: 17px; height: 17px; stroke: #fff; fill: none; stroke-width: 2; stroke-linejoin: round; }
  .extc-pop-t { font-weight: 700; font-size: var(--fs-body-lg); }
  .extc-pop-s { font-size: var(--fs-caption); color: #9fb3d6; }
  .extc-pop-b { padding: 14px 16px 16px; }
  .extc-pop-row { display: flex; gap: 10px; align-items: center; padding: 11px 12px; border-radius: 10px; border: 1px solid rgba(240,246,252,.12); background: rgba(240,246,252,.03); }
  .extc-led { width: 9px; height: 9px; border-radius: 50%; background: #6b7690; flex: none; }
  .extc-led-on { background: #3fb950; } .extc-led-bad { background: #ff7b72; }
  .extc-pop-rt { font-size: var(--fs-body); font-weight: 700; }
  .extc-pop-rs { font-size: var(--fs-caption); color: #9fb3d6; overflow-wrap: anywhere; }
  .extc-pop-f { display: flex; justify-content: space-between; padding: 10px 16px; border-top: 1px solid rgba(240,246,252,.1); font-size: var(--fs-caption); color: #9fb3d6; }
  .extc-cap { margin: 14px 0 0; font-size: var(--fs-caption); color: var(--muted); }

  @media (max-width: 880px) {
    .extc-page { grid-template-columns: 1fr; gap: 32px; padding-top: 32px; }
    .extc-h1 { font-size: var(--fs-h1); }
    .extc-pop { width: 100%; }
    .extc-stepsub { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .extc-seg::after, .extc-back { transition: none; }
    .extc-step-busy .extc-seg::after { animation: none; }
  }
`;
