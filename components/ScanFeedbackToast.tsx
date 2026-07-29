"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useUpgradeDialog } from "@/components/UpgradeDialog";

export type ScanMeta = {
  enforced?: boolean;
  allowed?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
  code?: string;
  feature?: string;
};

export function useScanToast() {
  const [scanMeta, setScanMeta] = useState<ScanMeta | null>(null);

  const handleScanResponse = useCallback((data: any) => {
    if (data?.scan_limit_meta) {
      setScanMeta(data.scan_limit_meta);
    }
  }, []);

  const handleScanError = useCallback((data: any) => {
    if (
      data?.code === "interview_prep_limit_reached" ||
      data?.code === "daily_scan_limit_reached" ||
      data?.code === "scan_limit_reached" ||
      // Codes from the uniform refusal envelope. Kept alongside the older
      // per-endpoint ones so this works against both, since the web ships
      // before the backend switches over.
      data?.code === "quota_exceeded" ||
      data?.code === "sign_in_required"
    ) {
      setScanMeta(data);
    }
  }, []);

  const clearScanMeta = useCallback(() => {
    setScanMeta(null);
  }, []);

  return { scanMeta, handleScanResponse, handleScanError, clearScanMeta };
}

export function ScanFeedbackToast({ meta, onDismiss }: { meta: ScanMeta; onDismiss: () => void }) {
  const { openUpgrade } = useUpgradeDialog();
  // auto dismiss after 6 seconds for success
  useEffect(() => {
    if (meta.allowed) {
      const t = setTimeout(onDismiss, 6000);
      return () => clearTimeout(t);
    }
  }, [meta, onDismiss]);

  if (!meta) return null;

  const isError = !meta.allowed;
  const remaining = meta.remaining ?? 0;
  
  let hoursUntilReset = 0;
  let minsUntilReset = 0;
  if (meta.resetAt) {
    const ms = new Date(meta.resetAt).getTime() - Date.now();
    if (ms > 0) {
      hoursUntilReset = Math.floor(ms / (1000 * 60 * 60));
      minsUntilReset = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    }
  }

  const bgColor = isError ? "var(--red-dim, rgba(239, 68, 68, 0.1))" : (remaining === 0 ? "var(--amber-dim, rgba(245, 158, 11, 0.1))" : "var(--surface, #ffffff)");
  const borderColor = isError ? "var(--red, #ef4444)" : (remaining === 0 ? "var(--amber, #f59e0b)" : "var(--border, #e2e8f0)");
  const textColor = isError ? "var(--red, #ef4444)" : (remaining === 0 ? "var(--amber, #f59e0b)" : "var(--text, #0f172a)");

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      padding: '16px 20px',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      maxWidth: 340,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: textColor }}>
          {isError ? "Daily Limit Reached" : "Scan Complete"}
        </h4>
        <button 
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 4 }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
        {isError ? (
          <>You have used all {meta.limit} of your daily free {meta.feature === "interview_prep" ? "interview prep parses" : "resume scans"}. Come back in {hoursUntilReset}h {minsUntilReset}m or upgrade to Pro for 30/day.</>
        ) : (
          <>{remaining} free {meta.feature === "interview_prep" ? "interview prep parse" : "resume scan"}{remaining !== 1 ? 's' : ''} remaining today.</>
        )}
      </p>

      {isError && (
        <button
          type="button"
          onClick={() => {
            openUpgrade({
              code: meta.code,
              feature: meta.feature,
              limit: meta.limit,
              used: meta.used,
              resetAt: meta.resetAt,
            });
            onDismiss();
          }}
          style={{
            marginTop: 4,
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent, #3b82f6)",
          }}
        >
          Upgrade →
        </button>
      )}
    </div>
  );
}
