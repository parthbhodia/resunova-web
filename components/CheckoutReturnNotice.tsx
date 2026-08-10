"use client";

/**
 * CheckoutReturnNotice — confirmation toast when Stripe Checkout redirects
 * back to the app (success_url = /?checkout=success&session_id=...).
 *
 * Fixed-position dismissible toast (same placement pattern as the Analyze
 * feedbackToast / SaveToProfilePrompt). Strips the checkout params from the
 * URL via history.replaceState so a refresh or share doesn't re-trigger it.
 * The plan itself flips to Pro via the Stripe webhook — usually within a few
 * seconds — so the copy points at Account settings rather than promising an
 * instant state change.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CheckoutReturnNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    setShow(true);
    params.delete("checkout");
    params.delete("session_id");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 90,
        maxWidth: 340,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: "16px 18px",
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>
        ✓ Payment received. Welcome to Pro
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 10px" }}>
        Your daily limits are being lifted now (this takes a few seconds). You can
        check your plan any time in{" "}
        <Link href="/?view=settings" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
          Account settings
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => setShow(false)}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
