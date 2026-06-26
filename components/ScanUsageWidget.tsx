"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";
import { Card } from "@/components/profileSettingsUi";

type ScanUsageStatus = {
  enforced: boolean;
  unlimited?: boolean;
  allowed?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
};

export function ScanUsageWidget({ apiBase = "" }: { apiBase?: string }) {
  const [resumeStatus, setResumeStatus] = useState<ScanUsageStatus | null>(null);
  const [prepStatus, setPrepStatus] = useState<ScanUsageStatus | null>(null);
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

        const [respResume, respPrep] = await Promise.all([
          fetch(apiBase + apiUrl("/api/scan-limit-status"), { headers }),
          fetch(apiBase + apiUrl("/api/interview-prep/limit-status"), { headers })
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
  }, [apiBase]);

  if (loading) {
    return (
      <Card title="Plan & usage">
        <p style={{ fontSize: 12, color: "var(--muted)" }}>Checking your usage quotas…</p>
      </Card>
    );
  }

  return (
    <Card title="Plan & usage" badge="Free">
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
    return (
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
        Unlimited {label} — included with your UMBC account.
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
