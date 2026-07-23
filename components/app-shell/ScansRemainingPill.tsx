"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";

type Status = {
  enforced?: boolean;
  unlimited?: boolean;
  limit?: number;
  remaining?: number;
};

/**
 * Shiny "scans left today" pill for the sidebar. Reads the real quota from
 * /api/scan-limit-status (same source as ScanUsageCard). Renders only for
 * signed-in, enforced free users — hidden for anonymous, UMBC/unlimited, or
 * when the count is unknown. Refetches on window focus so it stays fresh after
 * a scan.
 */
export function ScansRemainingPill({ collapsed }: { collapsed: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus(null);
        return;
      }
      const resp = await fetch(apiUrl("/api/scan-limit-status"), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setStatus((await resp.json()) as Status);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  if (!status || status.unlimited || status.enforced === false) return null;
  if (typeof status.remaining !== "number" || typeof status.limit !== "number") return null;

  const { remaining, limit } = status;
  const out = remaining <= 0;
  const grad = out
    ? "linear-gradient(135deg, #fb923c 0%, #ef4444 100%)"
    : "linear-gradient(135deg, var(--accent) 0%, #f59e0b 100%)";
  const glow = out ? "0 4px 16px -5px rgba(239,68,68,0.6)" : "0 4px 16px -5px var(--accent)";

  if (collapsed) {
    return (
      <div
        title={`${remaining} of ${limit} résumé scans left today`}
        aria-label={`${remaining} of ${limit} scans left today`}
        style={{
          margin: "8px auto 2px",
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          color: "#fff",
          background: grad,
          boxShadow: glow,
        }}
      >
        {remaining}
      </div>
    );
  }

  return (
    <div
      title={`${remaining} of ${limit} résumé scans remaining today · resets at midnight UTC`}
      style={{
        margin: "2px 10px 8px",
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 12px",
        borderRadius: 999,
        background: grad,
        color: "#fff",
        boxShadow: glow,
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: -0.2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        className="rn-scan-shine"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.38) 50%, transparent 68%)",
          transform: "translateX(-120%)",
        }}
      />
      <span aria-hidden style={{ position: "relative", fontSize: 13, lineHeight: 1 }}>
        ⚡
      </span>
      <span style={{ position: "relative" }}>
        {out ? "No scans left today" : `${remaining} of ${limit} scans left`}
      </span>
      <style>{`
        .rn-scan-shine { animation: rnScanShine 3.4s ease-in-out infinite; }
        @keyframes rnScanShine {
          0% { transform: translateX(-120%); }
          55%, 100% { transform: translateX(230%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rn-scan-shine { animation: none; display: none; }
        }
      `}</style>
    </div>
  );
}
