"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Card } from "@/components/profileSettingsUi";

type ScanUsageStatus = {
  enforced: boolean;
  unlimited?: boolean;
  /** "pro" | "institution" for unlimited tiers; absent on the metered tier. */
  plan?: string | null;
  allowed?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
};

export function ScanUsageWidget() {
  const [resumeStatus, setResumeStatus] = useState<ScanUsageStatus | null>(null);
  const [prepStatus, setPrepStatus] = useState<ScanUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [respResume, respPrep] = await Promise.all([
          apiFetch("/api/scan-limit-status"),
          apiFetch("/api/interview-prep/limit-status"),
        ]);

        const [dataResume, dataPrep] = await Promise.all([
          respResume.json() as Promise<ScanUsageStatus>,
          respPrep.json() as Promise<ScanUsageStatus>
        ]);

        if (!cancelled) {
          setResumeStatus(dataResume);
          setPrepStatus(dataPrep);
        }
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
        <p style={{ fontSize: 12, color: "var(--muted)" }}>Checking your usage quotas…</p>
      </Card>
    );
  }

  const badge =
    resumeStatus?.plan === "pro" || prepStatus?.plan === "pro"
      ? "Pro"
      : resumeStatus?.plan === "admin" || prepStatus?.plan === "admin"
        ? "Admin"
        : resumeStatus?.plan === "institution" || prepStatus?.plan === "institution"
          ? "University"
          : resumeStatus?.unlimited || prepStatus?.unlimited
            ? "Unlimited"
            : "Free";

  return (
    <Card title="Plan & usage" badge={badge}>
      {/* Resume Scan Usage */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Résumé Scans</h4>
        {renderUsageBar(resumeStatus, "résumé scans")}
      </div>

      {/* Interview Prep Usage */}
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Interview Prep</h4>
        {renderUsageBar(prepStatus, "interview prep parses")}
      </div>
    </Card>
  );
}

function renderUsageBar(status: ScanUsageStatus | null, label: string) {
  if (!status || !status.enforced) {
    return (
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
        Unlimited {label}
      </p>
    );
  }
  
  if (status.unlimited) {
    // Name the actual plan. Hard-coding UMBC told Pro subscribers they were on
    // a university account.
    return (
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
        {status.plan === "pro"
          ? `Unlimited ${label}: included with Pro.`
          : status.plan === "institution"
            ? `Unlimited ${label}: included with your university account.`
            : status.plan === "admin"
              ? `Unlimited ${label}: admin pass.`
              : `Unlimited ${label} on your current plan.`}
      </p>
    );
  }

  const limit = status.limit ?? 3;
  const used = status.used ?? 0;
  const remaining = status.remaining ?? Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <>
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
          ? `0 of ${limit} ${label} remaining today`
          : `${remaining} of ${limit} ${label} remaining today`}
        {" · "}Resets at midnight UTC
      </div>
    </>
  );
}
