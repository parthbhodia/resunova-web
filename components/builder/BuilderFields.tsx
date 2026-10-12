"use client";

import { useId, useState, type ReactNode } from "react";

export function StepCard({ step, title, subtitle, children }: {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`fade-in-up stagger-${step}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px 22px",
        marginBottom: 12,
        transition: "border-color var(--transition), box-shadow var(--transition)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-h)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
        >{step}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.3, color: "var(--text)", lineHeight: 1 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3, letterSpacing: -0.1 }}>
            {subtitle}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <div
        id={labelId}
        style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--dim)", marginBottom: 6, letterSpacing: -0.1, textTransform: "uppercase" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * Small "i" info icon with a hover/focus tooltip popover.
 *
 * Used to hide longer explanatory copy behind an unobtrusive icon so panels
 * stay short and scannable. Opens on hover, focus, or click; click toggles so
 * touch users (no hover) can still pin it open.
 */
export function InfoTip({ children, label }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={label ?? "More info"}
        aria-expanded={open}
        style={{
          minWidth: 44,
          minHeight: 44,
          borderRadius: "50%",
          border: "1px solid var(--dim)",
          background: "transparent",
          color: "var(--dim)",
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
          padding: 0,
          fontFamily: "inherit",
          fontStyle: "italic",
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            minWidth: 240,
            maxWidth: 320,
            padding: "10px 12px",
            background: "var(--surface3)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-card)",
            fontSize: 12,
            lineHeight: 1.5,
            letterSpacing: -0.1,
            fontWeight: 400,
            whiteSpace: "normal",
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
