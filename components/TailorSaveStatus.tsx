"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export type TailorSaveState = "idle" | "saving" | "saved" | "error";

type TailorSaveToastState = { kind: "success" | "error" } | null;

/** Tracks save status for one tailor "run" (one company/role match). Reset on
 *  a fresh analyze; NOT reset on rescore, so rescores update the pill only —
 *  the toast fired once already for this run. */
export function useTailorSaveStatus() {
  const [state, setState] = useState<TailorSaveState>("idle");
  const [toast, setToast] = useState<TailorSaveToastState>(null);
  const firstSaveDoneRef = useRef(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSavingTimer = useCallback(() => {
    if (savingTimerRef.current !== null) {
      clearTimeout(savingTimerRef.current);
      savingTimerRef.current = null;
    }
  }, []);

  const resetForNewRun = useCallback(() => {
    clearSavingTimer();
    setState("idle");
    setToast(null);
    firstSaveDoneRef.current = false;
  }, [clearSavingTimer]);

  // "Saving…" only appears when a save is genuinely slow. Fix-everything fires
  // a save per applied batch, and flipping the pill on every one made it strobe
  // Saving…/Saved for the whole pass. A save that finishes inside the delay
  // goes straight to its end state with no flash.
  const beginSave = useCallback(() => {
    clearSavingTimer();
    savingTimerRef.current = setTimeout(() => {
      savingTimerRef.current = null;
      setState("saving");
    }, 400);
  }, [clearSavingTimer]);

  const saveSucceeded = useCallback(() => {
    clearSavingTimer();
    setState("saved");
    if (!firstSaveDoneRef.current) {
      firstSaveDoneRef.current = true;
      setToast({ kind: "success" });
    }
  }, [clearSavingTimer]);

  const saveFailed = useCallback(() => {
    clearSavingTimer();
    setState("error");
    setToast({ kind: "error" });
  }, [clearSavingTimer]);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => clearSavingTimer, [clearSavingTimer]);

  return { state, toast, resetForNewRun, beginSave, saveSucceeded, saveFailed, dismissToast };
}

const dotColor: Record<TailorSaveState, string> = {
  idle: "var(--dim, #94a3b8)",
  saving: "var(--accent, #c4793a)",
  saved: "var(--green, #2f7d5a)",
  error: "var(--red, #b8452f)",
};
const textColor: Record<TailorSaveState, string> = {
  idle: "var(--muted, #8c7d68)",
  saving: "var(--muted, #8c7d68)",
  saved: "var(--green, #2f7d5a)",
  error: "var(--red, #b8452f)",
};
const label: Record<TailorSaveState, string> = {
  idle: "Not yet saved",
  saving: "Saving…",
  saved: "Saved to My Resumes",
  error: "Save failed",
};

/** Small status pill for the tailor results header — the honest, low-key
 *  place to surface the auto-save that already happens on every analyze. */
export function TailorSaveStatusPill({
  state,
  onRetry,
}: {
  state: TailorSaveState;
  onRetry: () => void;
}) {
  if (state === "idle") return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        color: textColor[state],
      }}
      aria-live="polite"
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor[state],
          flexShrink: 0,
          ...(state === "saving" ? { animation: "tailor-save-pulse 1.1s ease-in-out infinite" } : null),
        }}
      />
      {label[state]}
      {state === "error" && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            font: "inherit",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--red, #b8452f)",
            background: "none",
            border: "none",
            padding: 0,
            marginLeft: 2,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
      <style>{`
        @keyframes tailor-save-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.72); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="tailor-save-pulse"] { animation: none !important; }
        }
      `}</style>
    </span>
  );
}

/** Fires once per run: on the first successful save, and on any failure.
 *  Routine rescore saves after the first one update the pill only. */
export function TailorSaveToast({
  toast,
  company,
  role,
  onDismiss,
  onRetry,
}: {
  toast: TailorSaveToastState;
  company: string;
  role: string;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  useEffect(() => {
    if (toast?.kind === "success") {
      const t = setTimeout(onDismiss, 5000);
      return () => clearTimeout(t);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isError = toast.kind === "error";
  const target = [role, company].map((s) => s.trim()).filter(Boolean).join(" · ");

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9998,
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        borderRadius: 10,
        padding: "10px 12px",
        maxWidth: 300,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
      role="status"
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isError ? "rgba(184,69,47,0.12)" : "rgba(47,125,90,0.12)",
          color: isError ? "var(--red, #b8452f)" : "var(--green, #2f7d5a)",
          marginTop: 1,
        }}
      >
        {isError ? (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 6v5M10 14h.01" strokeLinecap="round" />
            <circle cx="10" cy="10" r="7.2" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 1px", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {isError ? "Couldn't save this match" : "Saved to My Resumes"}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #8c7d68)" }}>
          {isError ? (
            <>
              <button
                type="button"
                onClick={onRetry}
                style={{
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--red, #b8452f)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
              {" "}— your résumé and PDF are unaffected.
            </>
          ) : (
            <>Find it under {target || "this match"}.</>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.55, padding: 2, lineHeight: 1, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}
