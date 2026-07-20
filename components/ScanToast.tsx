"use client";

/**
 * Lightweight, dependency-free toast used for the per-login scan greeting.
 *
 * UX notes (ui-ux-pro-max):
 *  - role="status" + aria-live="polite" announces without stealing focus.
 *  - auto-dismisses in ~5s but stays keyboard/pointer dismissible.
 *  - entrance animation respects prefers-reduced-motion (motion-reduce:animate-none).
 *  - sits above the mobile bottom nav (z-60) at z-[70], clear of the safe area.
 */

import { useEffect } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import type { ScanGreetingTone } from "@/lib/scanGreeting";

const TONE_ICON = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
} as const;

const TONE_ACCENT: Record<ScanGreetingTone, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-indigo-600 dark:text-indigo-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export type ScanToastProps = {
  open: boolean;
  message: string;
  tone?: ScanGreetingTone;
  /** ms before auto-dismiss; pass 0 to disable. */
  duration?: number;
  onClose: () => void;
};

export function ScanToast({
  open,
  message,
  tone = "info",
  duration = 5000,
  onClose,
}: ScanToastProps) {
  useEffect(() => {
    if (!open || duration <= 0) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [open, message, duration, onClose]);

  if (!open || !message) return null;

  const Icon = TONE_ICON[tone];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-[70] flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6 md:justify-end md:px-0">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg ring-1 ring-foreground/5 animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none"
      >
        <Icon size={18} className={`mt-0.5 shrink-0 ${TONE_ACCENT[tone]}`} aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="-mt-1 -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
