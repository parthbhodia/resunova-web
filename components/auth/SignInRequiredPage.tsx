"use client";

import Link from "next/link";
import AuthMethods from "./AuthMethods";
import GatePreview from "./GatePreview";
import type { AppView } from "@/components/app-shell/nav-config";
import { gateContentFor, gateContentForView } from "./gateContent";

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
 * ⚠️ CORRECTED, AND THE EARLIER REASONING IS LEFT HERE BECAUSE IT WAS RIGHT AT
 * THE TIME. This file used to say it deliberately did NOT reuse the sign-in
 * dialog's form — the dialog's field state and submit handlers lived inside
 * `SignInDialogProvider`, interleaved with its own `open` flag, so extracting
 * them would have rewritten the highest-consequence auth surface in the app as
 * a side effect of a page redesign. It named the extraction "the obvious move"
 * and deferred it. It cost one real defect in the meantime: for a day this
 * page led with Google while the modal still buried Google under an `OR`, so
 * the two surfaces disagreed about what the primary action was. The modal
 * rebuild is where that extraction belongs, and it is done —
 * `AuthMethods` is now the single form and both surfaces render it. What
 * remains different is only layout: a 420px modal and a half-page panel
 * genuinely are different frames around the same ask.
 *
 * The comp's email action read "Email me a sign-in link", which this repo
 * cannot honour — there is no `signInWithOtp` call anywhere. That correction
 * now lives with the form, in `AuthMethods`.
 */

export default function SignInRequiredPage({
  pathname,
  view,
}: {
  pathname: string | null;
  /** A `/?view=` the visitor asked for that needs an account. Wins over the path. */
  view?: AppView | null;
}) {
  const content = view ? gateContentForView(view) : gateContentFor(pathname);
  const hasPreview = Boolean(content.previewCards?.length);

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

          <AuthMethods
            idPrefix="rn-gate"
            confirmationCopy="Check your inbox to confirm your email, then come back to this page."
          />

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
