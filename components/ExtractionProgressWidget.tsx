"use client";

import {
  computeExtractionProgress,
  formatEtaHours,
  maxConcurrentExtractors,
} from "@/lib/extractionProgress";
import type { AdminAnalyticsJobsBlock } from "@/lib/types";

function fmtInt(n: number) {
  return new Intl.NumberFormat().format(n || 0);
}

type Props = {
  jobs: AdminAnalyticsJobsBlock;
  /** Analytics window length (days) for rate math. */
  windowDays?: number;
  /** Shown when the parent is mid-refresh. */
  refreshing?: boolean;
  /** ISO timestamp of last successful fetch. */
  lastUpdatedAt?: string | null;
};

/**
 * Admin Jobs-pipeline card: corpus extraction progress for the worker's
 * claim window (extracted vs pending_extraction), plus recent sweep rate / ETA.
 */
export default function ExtractionProgressWidget({
  jobs,
  windowDays = 30,
  refreshing = false,
  lastUpdatedAt = null,
}: Props) {
  const progress = computeExtractionProgress({
    extracted: jobs.postings.extracted,
    pending: jobs.postings.pending_extraction,
    windowExtracted: jobs.scan_runs.extracted,
    windowDays,
    dailyExtracted: jobs.scan_runs.daily,
  });

  const windowLabel = jobs.postings.extract_window_days
    ? `${jobs.postings.extract_window_days}-day claim window`
    : "extractable claim window";

  const rate = progress.recentRatePerDay ?? progress.ratePerDay;
  const rateLabel =
    rate != null
      ? `${fmtInt(Math.round(rate))}/day`
      : "no sweep rate yet";

  const activeExtractors = Math.max(0, Math.floor(Number(jobs.postings.active_extractors) || 0));
  const claimedInflight = Math.max(0, Math.floor(Number(jobs.postings.claimed_inflight) || 0));
  const peakConcurrent = maxConcurrentExtractors(jobs.scan_runs.recent);
  const workersLabel =
    activeExtractors > 0
      ? `${activeExtractors} active`
      : peakConcurrent > 0
        ? `${peakConcurrent} peak (recent)`
        : "none active";
  const workersSub =
    activeExtractors > 0
      ? `${fmtInt(claimedInflight)} rows claimed`
      : peakConcurrent > 0
        ? "from overlapping sweeps"
        : "no open claim leases";

  const updatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
        background: "var(--surface)",
        marginBottom: 18,
      }}
      data-testid="extraction-progress-widget"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Extraction progress</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>
            Skills/salary/contacts on active postings in the {windowLabel}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
          {refreshing ? "Refreshing…" : updatedLabel ? `Updated ${updatedLabel}` : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {progress.pct}%
        </span>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>
          {fmtInt(progress.extracted)} extracted · {fmtInt(progress.pending)} pending
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progress.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Job extraction completion"
        style={{
          height: 10,
          borderRadius: 5,
          background: "var(--surface2)",
          overflow: "hidden",
          marginTop: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress.pct))}%`,
            background: "var(--green-ink, #10b981)",
            borderRadius: 5,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        <Stat label="Extractors" value={workersLabel} sub={workersSub} />
        <Stat label="In window" value={fmtInt(progress.total)} />
        <Stat label="Sweep rate" value={rateLabel} />
        <Stat label="ETA at recent rate" value={formatEtaHours(progress.etaHours)} />
        <Stat
          label="Window extractions"
          value={fmtInt(jobs.scan_runs.extracted)}
          sub={`${fmtInt(jobs.scan_runs.extraction_failures)} failures`}
        />
      </div>

      {(jobs.postings.old_pending_skipped ?? 0) > 0 && (
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 12 }}>
          {fmtInt(jobs.postings.old_pending_skipped ?? 0)} older pending rows sit outside the claim
          window and are not counted here.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div
        style={{
          color: "var(--muted)",
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
