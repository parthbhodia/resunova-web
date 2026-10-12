"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useScansRemaining } from "@/components/app-shell/useScansRemaining";
import { dismissFreeScanBanner, isFreeScanBannerDismissed } from "@/lib/freeScanBanner";

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

  if (!userId || isUmbc || dismissed || limit == null) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-center gap-2 rounded-[var(--md-shape-md)] border border-[var(--border)] bg-[var(--surface)] py-2 pl-4 pr-1 text-sm text-[var(--text)] shadow-[var(--md-elevation-1)] md:mx-6"
    >
      <p className="min-w-0 flex-1 text-pretty leading-6">
        You can scan a résumé{" "}
        <span className="font-semibold tabular-nums">{limit}</span>{" "}
        {limit === 1 ? "time" : "times"} a day on the free plan.
      </p>
      <button
        type="button"
        aria-label="Dismiss free scan message"
        className="md-state-layer flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onClick={() => {
          dismissFreeScanBanner(userId);
          setDismissed(true);
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
