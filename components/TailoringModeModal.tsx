"use client";

import React, { useState } from "react";
import { TAILORING_MODE_META, type TailoringMode } from "@/lib/tailoringMode";

/** Compact segmented Honest | Aggressive control — used in the Tailor results
 *  header and Account settings. Purely presentational; owner persists. */
export function TailoringModeSelector({
  value,
  onChange,
  disabled = false,
  size = "sm",
}: {
  value: TailoringMode;
  onChange: (mode: TailoringMode) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const fontSize = size === "sm" ? 11.5 : 12.5;
  const pad = size === "sm" ? "4px 10px" : "6px 12px";
  return (
    <div
      role="radiogroup"
      aria-label="AI tailoring style"
      style={{
        display: "inline-flex",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {(Object.keys(TAILORING_MODE_META) as TailoringMode[]).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={TAILORING_MODE_META[mode].blurb}
            onClick={() => { if (!active) onChange(mode); }}
            style={{
              font: "inherit",
              fontSize,
              fontWeight: 600,
              padding: pad,
              border: "none",
              cursor: disabled ? "default" : "pointer",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              transition: "background .12s, color .12s",
            }}
          >
            {TAILORING_MODE_META[mode].label}
          </button>
        );
      })}
    </div>
  );
}

/** One-time explainer shown the first time ANY user (signed in or anonymous)
 *  runs Tailor or Boost with no stored tailoring_mode. Blocking by design: the
 *  choice shapes every rewrite from then on, and it's changeable any time from
 *  the results header or Account settings. Anonymous choices persist to
 *  localStorage only (see lib/tailoringMode.ts); signed-in choices also mirror
 *  to user_profiles.tailoring_mode. */
export function TailoringModeModal({
  open,
  initialMode = "honest",
  onSave,
  onCancel,
}: {
  open: boolean;
  initialMode?: TailoringMode;
  /** Persist + continue whatever action triggered the modal. */
  onSave: (mode: TailoringMode) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<TailoringMode>(initialMode);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tailoring-mode-title"
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(15,23,42,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: "min(480px, 100%)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          padding: "22px 22px 18px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h2 id="tailoring-mode-title" style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "var(--text)", letterSpacing: -0.3 }}>
          How should AI tailor your résumé?
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          Applies to Tailor and Boost rewrites. You can change this anytime from the results toolbar or Account settings.
        </p>

        {(Object.keys(TAILORING_MODE_META) as TailoringMode[]).map((mode) => {
          const active = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelected(mode)}
              aria-pressed={active}
              style={{
                display: "block", width: "100%", textAlign: "left",
                font: "inherit",
                border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-bg, rgba(196,121,58,0.08))" : "var(--surface)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 8,
                cursor: "pointer",
                transition: "border-color .12s, background .12s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `4.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: "var(--surface)",
                  transition: "border-color .12s",
                }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  {TAILORING_MODE_META[mode].label}
                  {mode === "honest" && (
                    <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Recommended
                    </span>
                  )}
                </span>
              </span>
              <span style={{ display: "block", marginTop: 4, marginLeft: 22, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                {TAILORING_MODE_META[mode].blurb}
              </span>
            </button>
          );
        })}

        <p style={{ margin: "10px 0 14px", fontSize: 11, color: "var(--dim, var(--muted))", lineHeight: 1.5 }}>
          Either way, Resunova never invents employers, job titles, credentials, or metrics. Every rewrite starts from a real bullet on your résumé.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              font: "inherit", fontSize: 13, fontWeight: 600,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--muted)", cursor: "pointer",
            }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => onSave(selected)}
            style={{
              font: "inherit", fontSize: 13, fontWeight: 700,
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff", cursor: "pointer",
            }}
          >
            Save &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
