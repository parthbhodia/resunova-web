"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";

const FREE_SCAN_BANNER_KEY_PREFIX = "rn-free-scan-banner-dismissed";

type FreeScanWelcomeBannerProps = {
  userId?: string | null;
  isUmbc: boolean;
};

export function FreeScanWelcomeBanner({ userId, isUmbc }: FreeScanWelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  // Real daily-scan limit from the backend — never hardcoded, so the banner
  // can't drift from the actual limit (the exact bug where it still said "3").
  const [limit, setLimit] = useState<number | null>(null);
  const storageKey = useMemo(() => {
    if (!userId) return null;
    return `${FREE_SCAN_BANNER_KEY_PREFIX}:${userId}`;
  }, [userId]);

  useEffect(() => {
    if (!storageKey || isUmbc) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [isUmbc, storageKey]);

  // Fetch the real limit (mirrors ScanUsageCard's /api/scan-limit-status call).
  useEffect(() => {
    if (!userId || isUmbc) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const resp = await fetch(apiUrl("/api/scan-limit-status"), { headers });
        const data = (await resp.json()) as { limit?: number; unlimited?: boolean };
        if (!cancelled && !data.unlimited && typeof data.limit === "number") {
          setLimit(data.limit);
        }
      } catch {
        /* non-critical — the banner just stays hidden until we know the real limit */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isUmbc]);

  if (!userId || isUmbc || dismissed || limit == null) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-blue-200/60 bg-blue-50 px-4 py-3 text-[13px] text-blue-900 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-100">
      <p className="flex-1">
        <span className="mr-1.5">🎉</span>
        <strong>New here?</strong> You can scan your resume up to{" "}
        <strong>
          {limit} time{limit !== 1 ? "s" : ""} per day for free
        </strong>
        .
      </p>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss free scan message"
        className="h-6 w-6 shrink-0 text-blue-900 hover:bg-blue-100 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-900/40 dark:hover:text-blue-100"
        onClick={() => {
          if (storageKey) {
            try {
              localStorage.setItem(storageKey, "1");
            } catch {
              // Best effort persistence only.
            }
          }
          setDismissed(true);
        }}
      >
        <X size={14} />
      </Button>
    </div>
  );
}
