"use client";

/**
 * Lightweight, dependency-free toast — one global feedback surface for the app.
 *
 * Usage from anywhere (no hook/provider needed at the call site):
 *   import { toast } from "@/components/ui/toast";
 *   toast.success("Saved to your library");
 *   toast.error("Couldn't save — try again");
 *
 * Mount <Toaster /> exactly once (in the root layout). Accessibility: the live
 * region is aria-live="polite" so success/info are announced without stealing
 * focus; errors render role="alert" for assertive announcement. Respects
 * prefers-reduced-motion. No external dependency (keeps package-lock untouched).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "error" | "info";
export type ToastItem = { id: number; message: string; variant: ToastVariant; duration: number };

let counter = 0;
let items: ToastItem[] = [];
const listeners = new Set<(t: ToastItem[]) => void>();

function emit() {
  for (const l of listeners) l(items);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function add(message: string, variant: ToastVariant, duration: number): number {
  const id = ++counter;
  items = [...items, { id, message, variant, duration }];
  emit();
  if (duration > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), duration);
  }
  return id;
}

/** sonner-style API — callable from any module, not just React components. */
export const toast = {
  success: (message: string, duration = 4000) => add(message, "success", duration),
  error: (message: string, duration = 6000) => add(message, "error", duration),
  info: (message: string, duration = 4000) => add(message, "info", duration),
  /** Alias so existing "neutral message" call sites read naturally. */
  message: (message: string, duration = 4000) => add(message, "info", duration),
  dismiss,
};

const VARIANT_STYLE: Record<ToastVariant, { accent: string; icon: React.ReactNode }> = {
  success: {
    accent: "var(--green-ink, #16a34a)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    accent: "var(--red-ink, #dc2626)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" />
      </svg>
    ),
  },
  info: {
    accent: "var(--accent, #2563eb)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.01" />
      </svg>
    ),
  },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const l = (t: ToastItem[]) => setList([...t]);
    listeners.add(l);
    setList([...items]);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "min(420px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {list.map((t) => {
        const v = VARIANT_STYLE[t.variant];
        return (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${v.accent}`,
              boxShadow: "var(--shadow-card, 0 10px 30px rgba(13,17,23,0.18))",
              color: "var(--text)",
              fontSize: 13.5,
              lineHeight: 1.5,
              animation: "rnToastIn 0.22s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <span style={{ color: v.accent, flexShrink: 0, marginTop: 1, display: "inline-flex" }}>{v.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                marginTop: -1,
                marginRight: -4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                color: "var(--dim, #94a3b8)",
                cursor: "pointer",
                borderRadius: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes rnToastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { [role="status"], [role="alert"] { animation: none !important; } }
      `}</style>
    </div>,
    document.body,
  );
}
