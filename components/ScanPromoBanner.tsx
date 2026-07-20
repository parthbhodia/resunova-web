"use client";

/**
 * Promotional banner for the free daily résumé-scan allowance.
 *
 * Replaces the plain "New here?" welcome note with a benefit-led promo:
 * indigo→emerald gradient, an accent icon badge, a highlighted count, and a
 * single "Scan now" CTA. Dismissal is tracked per user in localStorage.
 *
 * UX notes (ui-ux-pro-max):
 *  - text pairs meet WCAG AA (≥4.5:1) in both light and dark themes;
 *  - one primary CTA; dismiss is a clearly-labelled secondary control;
 *  - Lucide SVG icons (no emoji as structural icons);
 *  - static by design — no decorative looping animation.
 */

import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREE_DAILY_SCAN_LIMIT } from "@/lib/scanLimits";

// Bump the version suffix to re-show the promo after a future refresh.
const PROMO_DISMISS_KEY_PREFIX = "rn-scan-promo-dismissed:v1";

type ScanPromoBannerProps = {
  /** Signed-in user id (null for anonymous visitors — keyed as "guest"). */
  userId?: string | null;
  /** UMBC users get unlimited scans, so the free-tier promo doesn't apply. */
  isUmbc: boolean;
  /** Only render once auth state is known, to avoid a flash on first paint. */
  ready?: boolean;
  /** Route the user into the Analyze view. */
  onScan?: () => void;
};

export function ScanPromoBanner({ userId, isUmbc, ready = true, onScan }: ScanPromoBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const storageKey = useMemo(
    () => `${PROMO_DISMISS_KEY_PREFIX}:${userId ?? "guest"}`,
    [userId],
  );

  useEffect(() => {
    if (isUmbc) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [isUmbc, storageKey]);

  if (!ready || isUmbc || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // Best-effort persistence only.
    }
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-indigo-200/70 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 px-4 py-2.5 dark:border-indigo-900/60 dark:from-indigo-950/50 dark:via-slate-950/10 dark:to-emerald-950/40">
      <span
        aria-hidden="true"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm sm:inline-flex dark:bg-indigo-500"
      >
        <Sparkles size={16} />
      </span>

      <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-700 dark:text-slate-200">
        <strong className="font-semibold text-slate-900 dark:text-white">
          {FREE_DAILY_SCAN_LIMIT} free résumé scans
        </strong>
        <span className="text-emerald-700 dark:text-emerald-300"> — every day, on us.</span>{" "}
        <span className="hidden sm:inline">
          Get an instant ATS score and fix-it tips before you hit apply.
        </span>
      </p>

      {onScan && (
        <Button
          size="sm"
          onClick={onScan}
          className="h-8 shrink-0 bg-emerald-700 px-3 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          Scan now
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss free scan promotion"
        onClick={dismiss}
        className="h-8 w-8 shrink-0 text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        <X size={14} />
      </Button>
    </div>
  );
}
