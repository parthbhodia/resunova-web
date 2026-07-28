"use client";

/**
 * Plan & usage card — shows the signed-in user's daily résumé-scan quota.
 * Lives on the Account Settings page (billing/usage, not career data).
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/profileSettingsUi";
import { apiFetch, scanLimitFrom, planLabel, type ScanLimitStatus } from "@/lib/apiClient";

export default function ScanUsageCard() {
  const [status, setStatus] = useState<ScanLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch("/api/scan-limit-status");
        const data = scanLimitFrom(await resp.json());
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
          Your account includes <strong style={{ color: "var(--text)" }}>3 résumé scans per day</strong>, free.
        </p>
      </Card>
    );
  }

  if (status.unlimited) {
    // Say which unlimited plan it is. This branch used to hard-code "UMBC",
    // so a paying Pro subscriber was told they were a university user.
    const plan = status.plan;
    return (
      <Card title="Plan & usage" badge={planLabel(status) ?? "Unlimited"}>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
          {plan === "pro"
            ? "Unlimited résumé scans, included with Pro."
            : plan === "institution"
              ? "Unlimited résumé scans, included with your university account."
              : "Unlimited résumé scans on your current plan."}
        </p>
      </Card>
    );
  }

  const limit = status.limit ?? 3;
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
