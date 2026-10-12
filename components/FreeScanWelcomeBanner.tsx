"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useScansRemaining } from "@/components/app-shell/useScansRemaining";
import {
  dismissFreeScanBanner,
  FREE_SCAN_BANNER_MS,
  freeScanBannerRemaining,
  isFreeScanBannerDismissed,
} from "@/lib/freeScanBanner";

type FreeScanWelcomeBannerProps = {
  userId?: string | null;
  isUmbc: boolean;
};

export function FreeScanWelcomeBanner({ userId, isUmbc }: FreeScanWelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  // Real daily-scan limit from the backend — never hardcoded, so the banner
  // can't drift from the actual limit (the exact bug where it still said "3").
  // Read from the shared store rather than a fetch of its own: this banner was
  // one of three components asking the same endpoint on one page load.
  const { state } = useScansRemaining();
  // Only a metered reading names a number. Unlimited plans have none to quote,
  // and an unreadable quota must not become a claim about the free tier — in
  // both cases the banner stays hidden, exactly as it did when its own fetch
  // failed or returned `unlimited`.
  const limit = state.kind === "metered" ? state.limit : null;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isUmbc) {
      setDismissed(true);
      return;
    }
    const sync = () => setDismissed(isFreeScanBannerDismissed(userId));
    sync();
    window.addEventListener("rn:notices-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("rn:notices-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [isUmbc, userId]);

  const visible = Boolean(userId) && !isUmbc && !dismissed && limit != null;

  useEffect(() => {
    if (!visible || !userId) return;
    const id = window.setTimeout(() => {
      dismissFreeScanBanner(userId);
      setDismissed(true);
    }, freeScanBannerRemaining());
    return () => window.clearTimeout(id);
  }, [visible, userId]);

  useEffect(() => {
    const bar = barRef.current;
    if (!visible || !bar || typeof bar.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const remaining = freeScanBannerRemaining();
    const start = remaining / FREE_SCAN_BANNER_MS;
    const animation = bar.animate(
      [{ transform: `scaleX(${start})` }, { transform: "scaleX(0)" }],
      { duration: remaining, easing: "linear", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [visible]);

  if (!visible || limit == null) return null;

  const close = () => {
    if (!userId) return;
    dismissFreeScanBanner(userId);
    setDismissed(true);
  };

  return (
    <div className="pt-3 pl-4 pr-[4.75rem] md:pt-4 md:pl-6 md:pr-6">
      <div
        role="status"
        className="w-full max-w-[22rem] overflow-hidden rounded-[var(--md-shape-lg)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--md-elevation-3)] motion-safe:animate-[fadeSlideIn_220ms_var(--md-easing-standard)]"
      >
        <div className="flex items-center gap-2 py-2 pl-4 pr-1.5">
          <p className="min-w-0 flex-1 text-sm leading-5 text-pretty">
            You can scan a résumé{" "}
            <span className="font-semibold tabular-nums">{limit}</span>{" "}
            {limit === 1 ? "time" : "times"} a day on the free plan.
          </p>
          <button
            type="button"
            aria-label="Dismiss free scan message"
            className="md-state-layer flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={close}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="h-0.5 bg-[var(--surface3)]" aria-hidden="true">
          <div ref={barRef} className="h-full origin-left bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}
