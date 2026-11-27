// Jobs pipeline time series (GET /api/admin/pipeline → admin_pipeline RPC, admin_pipeline.sql
// in resunova-api). Days and hours are New York time, the extraction worker's own clock.

export interface PipelineDay {
  d: string;               // YYYY-MM-DD
  batches: number;         // extraction batches (3-minute sweeps)
  empty_batches: number;   // batches that found nothing to claim
  full_scans: number;      // discovery runs that fetched the job boards
  extracted: number;
  failures: number;
  upserted: number;        // postings a full scan wrote: new or changed
  deactivated: number;
  short_calls: number;     // one short Llama call (the usual path)
  long_calls: number;      // the long call: the tagger found no skill, or the short call failed
}

export interface PipelineHour {
  h: string;               // YYYY-MM-DDTHH:00
  batches: number;
  empty_batches: number;
  extracted: number;
  failures: number;
}

export interface PipelineStuck {
  id: string;
  title: string | null;
  company: string | null;
  posted_at: string | null;
  failures: number;
  jd_len: number | null;
}

export interface PipelineFullScan {
  started_at: string;
  duration_ms: number | null;
  fetched: number;
  upserted: number;
  deactivated: number;
  errors: number;
}

export interface AdminPipelineResponse {
  generated_at: string;
  days: number;
  daily: PipelineDay[];
  hourly: PipelineHour[];
  backlog: {
    window_total: number;
    extracted: number;
    waiting: number;
    stuck: number;
    no_text: number;
    by_age: Array<{ k: string; n: number }>;
  };
  latency: {
    n: number;
    extract_p50_h: number | null;
    extract_p90_h: number | null;
    embed_p50_h: number | null;
    embed_p90_h: number | null;
  };
  stuck: PipelineStuck[];
  full_scans: PipelineFullScan[];
  cached?: boolean;
  error?: string;
}

/** Round axis ticks from 0 to just above `max`, about `count` of them. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Percent with one decimal below 10, whole numbers above; null when there is no denominator. */
export function pctOf(n: number, d: number): number | null {
  if (!(d > 0)) return null;
  const p = (100 * n) / d;
  return p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
}

/** Share of extraction attempts that failed, per day. */
export function failureRate(day: Pick<PipelineDay, "extracted" | "failures">): number | null {
  return pctOf(day.failures, day.extracted + day.failures);
}

/** Share of extracted postings that needed the long call, per day. */
export function longCallShare(day: Pick<PipelineDay, "short_calls" | "long_calls">): number | null {
  return pctOf(day.long_calls, day.short_calls + day.long_calls);
}

/** Every day from the first row to `todayIso`, with zeros where nothing ran: a day with no
 *  batches is missing from the RPC's rows, and skipping it would squeeze the time axis. */
export function fillDays(daily: PipelineDay[], todayIso: string): PipelineDay[] {
  if (!daily.length) return daily;
  const byDay = new Map(daily.map(d => [d.d, d]));
  const out: PipelineDay[] = [];
  const [y, m, dd] = daily[0].d.split("-").map(Number);
  for (let t = Date.UTC(y, m - 1, dd); ; t += 86_400_000) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (d > todayIso && d > daily[daily.length - 1].d) break;
    out.push(byDay.get(d) ?? { d, batches: 0, empty_batches: 0, full_scans: 0, extracted: 0, failures: 0, upserted: 0, deactivated: 0, short_calls: 0, long_calls: 0 });
    if (out.length > 400) break;
  }
  return out;
}

/** Every hour between the first and last row, with zeros for hours in which no batch ran. */
export function fillHours(hourly: PipelineHour[]): PipelineHour[] {
  if (hourly.length < 2) return hourly;
  const byHour = new Map(hourly.map(h => [h.h, h]));
  const parse = (h: string) => Date.UTC(+h.slice(0, 4), +h.slice(5, 7) - 1, +h.slice(8, 10), +h.slice(11, 13));
  const out: PipelineHour[] = [];
  const end = parse(hourly[hourly.length - 1].h);
  for (let t = parse(hourly[0].h); t <= end && out.length < 200; t += 3_600_000) {
    const h = new Date(t).toISOString().slice(0, 13) + ":00";
    out.push(byHour.get(h) ?? { h, batches: 0, empty_batches: 0, extracted: 0, failures: 0 });
  }
  return out;
}

export interface PipelineTotals {
  extracted: number;
  failures: number;
  failureRate: number | null;
  perDay: number;          // average of the last 7 full days with batches (today is partial)
  longShare7d: number | null;
  idleHours48h: number;    // hours with batches but nothing claimed
}

export function pipelineTotals(data: Pick<AdminPipelineResponse, "daily" | "hourly">, todayIso: string): PipelineTotals {
  const extracted = data.daily.reduce((s, d) => s + d.extracted, 0);
  const failures = data.daily.reduce((s, d) => s + d.failures, 0);
  const full = data.daily.filter(d => d.d < todayIso && d.batches > 0).slice(-7);
  const last7 = data.daily.slice(-7);
  const short7 = last7.reduce((s, d) => s + d.short_calls, 0);
  const long7 = last7.reduce((s, d) => s + d.long_calls, 0);
  return {
    extracted,
    failures,
    failureRate: pctOf(failures, extracted + failures),
    perDay: full.length ? Math.round(full.reduce((s, d) => s + d.extracted, 0) / full.length) : 0,
    longShare7d: pctOf(long7, short7 + long7),
    idleHours48h: data.hourly.filter(h => h.batches > 0 && h.extracted === 0 && h.failures === 0).length,
  };
}

/** "4.0 h", "35 min", "2.4 d" for a wait in hours. */
export function fmtHours(h: number | null | undefined): string {
  if (h == null || Number.isNaN(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

/** "3pm" / "12am" for an hour bucket "YYYY-MM-DDTHH:00". */
export function hourLabel(h: string): string {
  const hh = Number(h.slice(11, 13));
  if (Number.isNaN(hh)) return h;
  const suffix = hh < 12 ? "am" : "pm";
  return `${hh % 12 === 0 ? 12 : hh % 12}${suffix}`;
}

/** "Nov 27" for "2026-11-27". */
export function dayLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Today's date in New York, YYYY-MM-DD, matching the RPC's day buckets. */
export function newYorkToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}
