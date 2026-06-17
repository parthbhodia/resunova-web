"use client";

/**
 * Shared card / field primitives for the Profile (career) and Account Settings
 * surfaces. Extracted from ProfilePage so both pages render visually identical
 * cards — same radius, border, surface, and shadow tokens — and stay in sync.
 */

import type { CSSProperties, ReactNode } from "react";

export function inputStyle(): CSSProperties {
  return {
    width: "100%",
    fontSize: 13,
    padding: "10px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    outline: "none",
    fontFamily: "inherit",
    letterSpacing: -0.15,
  };
}

export function Field({
  label,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: -0.2,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
      {error ? (
        <div
          id={errorId}
          aria-live="polite"
          style={{ fontSize: 11, color: "var(--red)", marginTop: 5, lineHeight: 1.45, display: "flex", alignItems: "flex-start", gap: 5 }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="5.5" cy="5.5" r="4.8" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M5.5 3.1v3.3M5.5 7.7v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      ) : hint ? (
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5, lineHeight: 1.45 }}>{hint}</div>
      ) : null}
    </label>
  );
}

export function Card({
  title,
  badge,
  children,
  domId,
  action,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
  /** Stable anchor for deep-links from match breakdown → profile. */
  domId?: string;
  /** Optional trailing control rendered in the header row (e.g. a save status). */
  action?: ReactNode;
}) {
  return (
    <section
      id={domId}
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-card)",
        padding: "20px 22px 22px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.35, color: "var(--text)" }}>{title}</h2>
          {badge ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.08,
                color: "var(--amber)",
                background: "var(--amber-bg)",
                padding: "4px 10px",
                borderRadius: "var(--radius-pill)",
                flexShrink: 0,
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Accessible, theme-matched toggle row. The ENTIRE row is a real
 * <button role="switch">, so clicking anywhere on the label (not just the
 * 38px track) flips it, it's keyboard-operable, and its accessible name is
 * the label text. The visual track/thumb is presentational (aria-hidden).
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  sub,
  disabled,
  topBorder,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  sub?: string | null;
  disabled?: boolean;
  /** Hairline divider above the row (for stacked rows after the first). */
  topBorder?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        padding: "12px 0",
        background: "none",
        border: "none",
        borderTop: topBorder ? "1px solid var(--border)" : "none",
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        fontFamily: "inherit",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}>
          {label}
        </span>
        {sub ? (
          <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
            {sub}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        style={{
          position: "relative",
          flexShrink: 0,
          width: 38,
          height: 22,
          marginTop: 1,
          borderRadius: 999,
          background: checked ? "var(--accent)" : "var(--surface3)",
          transition: "background 0.18s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "var(--shadow-sm)",
            transition: "left 0.18s ease",
          }}
        />
      </span>
    </button>
  );
}
