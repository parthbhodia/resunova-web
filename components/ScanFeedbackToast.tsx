"use client";

import React, { useState, useCallback, useEffect } from "react";
import { FeedbackToastCard, type FeedbackToastVariant } from "@/components/FeedbackToastCard";
import { useUpgradeDialog, PRO_SCAN_DAILY_LIMIT } from "@/components/UpgradeDialog";

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

function resetCountdown(resetAt?: string | null): string {
  if (!resetAt) return "tomorrow";
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "shortly";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)}m`;
}

function featureNoun(feature?: string): { singular: string; plural: string } {
  if (feature === "interview_prep") {
    return { singular: "interview prep parse", plural: "interview prep parses" };
  }
  return { singular: "resume scan", plural: "resume scans" };
}

export function ScanFeedbackToast({
  meta,
  onDismiss,
}: {
  meta: ScanMeta;
  onDismiss: () => void;
}) {
  const { openUpgrade } = useUpgradeDialog();

  useEffect(() => {
    if (meta.allowed) {
      const t = setTimeout(onDismiss, 6000);
      return () => clearTimeout(t);
    }
  }, [meta, onDismiss]);

  if (!meta) return null;

  const isError = !meta.allowed;
  const remaining = meta.remaining ?? 0;
  const nouns = featureNoun(meta.feature);
  const nearLimit = !isError && remaining === 0;

  let variant: FeedbackToastVariant = "success";
  let title = "Scan complete";
  let description: React.ReactNode;
  let primaryAction: { label: string; onClick: () => void } | undefined;
  let secondaryAction: { label: string; onClick: () => void } | undefined;

  if (isError) {
    variant = "warning";
    title = "Daily limit reached";
    description = (
      <>
        You&apos;ve used all {meta.limit} of your daily free {nouns.plural}. Come back in{" "}
        {resetCountdown(meta.resetAt)} or upgrade to Pro for {PRO_SCAN_DAILY_LIMIT}/day.
      </>
    );
    primaryAction = {
      label: "Upgrade",
      onClick: () => {
        openUpgrade({
          code: meta.code,
          feature: meta.feature,
          limit: meta.limit,
          used: meta.used,
          resetAt: meta.resetAt,
        });
        onDismiss();
      },
    };
    secondaryAction = { label: "Not now", onClick: onDismiss };
  } else if (nearLimit) {
    variant = "warning";
    title = "No free scans left";
    description = `You've used today's free ${nouns.plural}. Upgrade to Pro for ${PRO_SCAN_DAILY_LIMIT}/day, or come back tomorrow.`;
    primaryAction = {
      label: "Upgrade",
      onClick: () => {
        openUpgrade({
          code: meta.code,
          feature: meta.feature,
          limit: meta.limit,
          used: meta.used,
          resetAt: meta.resetAt,
        });
        onDismiss();
      },
    };
    secondaryAction = { label: "Dismiss", onClick: onDismiss };
  } else {
    variant = "success";
    title = "Scan complete";
    description = (
      <>
        {remaining} free {remaining === 1 ? nouns.singular : nouns.plural} remaining today.
      </>
    );
  }

  return (
    <FeedbackToastCard
      title={title}
      description={description}
      variant={variant}
      role={isError ? "alert" : "status"}
      onDismiss={onDismiss}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    />
  );
}
