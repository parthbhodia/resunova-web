"use client";

/**
 * Plan & usage card — shows the signed-in user's daily résumé-scan quota.
 * Lives on the Account Settings page (billing/usage, not career data).
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";
import { FREE_DAILY_SCAN_LIMIT } from "@/lib/scanLimits";
import { Card } from "@/components/profileSettingsUi";

type ScanUsageStatus = {
  enforced: boolean;
  unlimited: boolean;
  anonymous?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
};

export default function ScanUsageCard() {
  const [status, setStatus] = useState<ScanUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const resp = await fetch(apiUrl("/api/scan-limit-status"), { headers });
        const data = (await resp.json()) as ScanUsageStatus;
        if (!cancelled) setStatus(data);
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card title="Plan & usage">
        <p style={{ fontSize: 12, color: "var(--muted)" }}>Checking your scan quota…</p>
      </Card>
    );
  }

  if (!status || !status.enforced) {
    return (
      <Card title="Plan & usage" badge="Free">
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
          Your account includes <strong style={{ color: "var(--text)" }}>{FREE_DAILY_SCAN_LIMIT} free résumé scans every day</strong>.
        </p>
      </Card>
    );
  }

  if (status.unlimited) {
    return (
      <Card title="Plan & usage" badge="UMBC">
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
          Unlimited résumé scans — included with your UMBC account.
        </p>
      </Card>
    );
  }

  const limit = status.limit ?? FREE_DAILY_SCAN_LIMIT;
  const used = status.used ?? 0;
  const remaining = status.remaining ?? Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <Card title="Plan & usage" badge="Free">
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
        Free plan includes <strong style={{ color: "var(--text)" }}>{limit} résumé scans per day</strong>.
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${used} of ${limit} scans used today`}
        style={{ height: 6, borderRadius: 99, background: "var(--surface2)", overflow: "hidden", marginBottom: 8 }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: remaining === 0 ? "var(--red)" : "var(--accent)",
            borderRadius: 99,
            transition: "width 0.35s ease-out",
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)" }}>
        {remaining === 0
          ? `0 of ${limit} scans remaining today`
          : `${remaining} of ${limit} scan${limit !== 1 ? "s" : ""} remaining today`}
        {" · "}Resets at midnight UTC
      </div>
    </Card>
  );
}
