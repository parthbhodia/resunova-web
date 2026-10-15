/**
 * Pure helpers for the admin extraction progress widget.
 * Denominator is the extractable window: extracted + pending_extraction
 * (old_pending_skipped is outside the worker's claim window).
 */

export type ExtractionProgressInput = {
  extracted: number;
  pending: number;
  /** Jobs extracted across scan_runs in the analytics window. */
  windowExtracted?: number;
  /** Length of that analytics window in days (for rate). */
  windowDays?: number;
  /** Per-day extracted counts (newest last). Used for recent-rate ETA. */
  dailyExtracted?: Array<{ date: string; extracted: number }>;
};

export type ExtractionProgress = {
  extracted: number;
  pending: number;
  total: number;
  pct: number;
  /** Average extractions/day over the analytics window. */
  ratePerDay: number | null;
  /** Extractions/day over the last 1–3 days with data. */
  recentRatePerDay: number | null;
  /** Hours remaining at recentRatePerDay (or ratePerDay). */
  etaHours: number | null;
};

export function computeExtractionProgress(input: ExtractionProgressInput): ExtractionProgress {
  const extracted = Math.max(0, Math.floor(Number(input.extracted) || 0));
  const pending = Math.max(0, Math.floor(Number(input.pending) || 0));
  const total = extracted + pending;
  const pct = total > 0 ? Math.round((1000 * extracted) / total) / 10 : 0;

  const windowDays = Math.max(1, Number(input.windowDays) || 1);
  const windowExtracted = Math.max(0, Math.floor(Number(input.windowExtracted) || 0));
  const ratePerDay = windowExtracted > 0 ? windowExtracted / windowDays : null;

  let recentRatePerDay: number | null = null;
  const daily = input.dailyExtracted ?? [];
  if (daily.length > 0) {
    const last = daily.slice(-3);
    const sum = last.reduce((s, d) => s + Math.max(0, Number(d.extracted) || 0), 0);
    if (sum > 0) recentRatePerDay = sum / last.length;
  }

  const rate = recentRatePerDay ?? ratePerDay;
  const etaHours =
    pending > 0 && rate != null && rate > 0
      ? Math.round((pending / rate) * 24 * 10) / 10
      : pending === 0
        ? 0
        : null;

  return {
    extracted,
    pending,
    total,
    pct,
    ratePerDay,
    recentRatePerDay,
    etaHours,
  };
}

export function formatEtaHours(hours: number | null): string {
  if (hours == null) return "unknown";
  if (hours === 0) return "done";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  const days = hours / 24;
  return `${Math.round(days * 10) / 10} days`;
}

export type WorkerIdentityLike = {
  label?: string | null;
  hostname?: string | null;
  platform?: string | null;
  gpu?: string | null;
  model?: string | null;
  batch?: number | null;
  status?: string | null;
  worker_key?: string | null;
};

/** Short line for the admin card: 'MacBook · Darwin · Apple Silicon · qwen…'. */
export function formatWorkerLine(w: WorkerIdentityLike): string {
  const host = (w.label || w.hostname || "worker").trim();
  const parts = [host];
  if (w.platform) parts.push(String(w.platform));
  if (w.gpu) parts.push(String(w.gpu));
  if (w.model) parts.push(String(w.model));
  if (w.batch != null && Number(w.batch) > 0) parts.push(`batch ${w.batch}`);
  return parts.join(" · ");
}

type ScanRunInterval = {
  started_at: string;
  duration_ms: number | null;
  skip_fetch: boolean;
};

/**
 * Peak concurrent skip_fetch (extraction-only) sweeps from completed run
 * intervals. Useful before/alongside live claim-lease liveness.
 */
export function maxConcurrentExtractors(recent: ScanRunInterval[]): number {
  const events: Array<[number, 1 | -1]> = [];
  for (const r of recent) {
    if (!r.skip_fetch || r.duration_ms == null) continue;
    const start = Date.parse(r.started_at);
    if (!Number.isFinite(start)) continue;
    const end = start + Math.max(0, Number(r.duration_ms) || 0);
    events.push([start, 1], [end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let cur = 0;
  let max = 0;
  for (const [, delta] of events) {
    cur += delta;
    if (cur > max) max = cur;
  }
  return max;
}
