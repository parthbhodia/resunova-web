import React from "react";

/** Small Google "G" so the CTA reads as a real OAuth button, not a generic link. */
function GoogleGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.3C41.4 36.2 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export interface SignInToUseAiProps {
  signingIn: boolean;
  onSignIn: () => void;
  /** "popover" = compact card floating over a button; "banner" = full-width inline block. */
  variant?: "popover" | "banner";
  /** Optional dismiss handler — shows a "Not now" control (popover only). */
  onDismiss?: () => void;
  /** Override the headline (defaults describe AI writing). */
  title?: string;
  subtitle?: string;
}

/**
 * Reusable "sign in to use this AI feature" prompt for the Cover Letter Builder.
 * Inline styles to match the rest of the builder's conventions.
 */
export default function SignInToUseAi({
  signingIn,
  onSignIn,
  variant = "popover",
  onDismiss,
  title = "Sign in to use AI writing",
  subtitle = "AI writing is free with a Google account.",
}: SignInToUseAiProps) {
  const isPopover = variant === "popover";

  return (
    <div
      role="dialog"
      aria-label="Sign in required"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: isPopover ? "13px 14px" : "16px 18px",
        boxShadow: isPopover ? "0 10px 30px rgba(0,0,0,0.18)" : "none",
        width: isPopover ? 270 : "auto",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span aria-hidden="true" style={{ fontSize: 14 }}>✦</span>
        <span style={{ fontSize: isPopover ? 13 : 14, fontWeight: 700, color: "var(--text)" }}>{title}</span>
      </div>
      <p style={{ margin: "0 0 11px", fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>{subtitle}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSignIn}
          disabled={signingIn}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            flex: "1 1 auto",
            whiteSpace: "nowrap",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--text)",
            background: "var(--bg)",
            border: "1.5px solid var(--border)",
            borderRadius: 7,
            padding: "8px 12px",
            cursor: signingIn ? "wait" : "pointer",
            opacity: signingIn ? 0.7 : 1,
          }}
        >
          <GoogleGlyph />
          {signingIn ? "Opening Google…" : "Continue with Google"}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "6px 6px", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
