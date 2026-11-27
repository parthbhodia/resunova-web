"use client";

/**
 * Jobs pipeline charts for the admin Analytics tab: per-day and per-hour extraction, failure and
 * long-call rates, the backlog by age, how long new postings wait, stuck postings (with Retry),
 * and the recent full scans. Reads GET /api/admin/pipeline, which rolls the worker's per-batch
 * rows up in the database (the analytics payload's capped row read covered only a day or two).
 *
 * Plain SVG, styled with the theme variables so it follows light and dark. Every chart is one
 * series on one axis, so the title names it and no legend is needed.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";
import { AdminBarRows, AdminChartCard, AdminKpiCard } from "@/components/admin/charts";
import {
  type AdminPipelineResponse,
  dayLabel,
  failureRate,
  fillDays,
  fillHours,
  fmtHours,
  hourLabel,
  longCallShare,
  newYorkToday,
  niceTicks,
  pipelineTotals,
} from "@/lib/adminPipeline";

function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }
function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}
function fmtPct(n: number | null) { return n == null ? "—" : `${n}%`; }

// ── sizing ───────────────────────────────────────────────────────────────────
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(240, Math.floor(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ── shared chart frame ───────────────────────────────────────────────────────
export interface Point { key: string; label: string; value: number | null; detail?: ReactNode; muted?: boolean; }

const H = 170;
const PAD = { top: 10, right: 8, bottom: 24, left: 44 };

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 80, 0), Math.max(0, width - 170));
  return (
    <div role="tooltip" style={{
      position: "absolute", top: 0, left, width: 170, pointerEvents: "none", zIndex: 2,
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
      boxShadow: "0 4px 14px rgba(0,0,0,0.12)", padding: "7px 9px", fontSize: 12, lineHeight: 1.45, color: "var(--text)",
    }}>{children}</div>
  );
}

function YAxis({ ticks, y, width, fmt }: { ticks: number[]; y: (v: number) => number; width: number; fmt: (v: number) => string }) {
  return (
    <g>
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--dim)">{fmt(t)}</text>
        </g>
      ))}
    </g>
  );
}

function XLabels({ points, x, every }: { points: Point[]; x: (i: number) => number; every: number }) {
  return (
    <g>
      {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (i === points.length - 1 || points.length - 1 - i >= every / 2) ? (
        <text key={p.key} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--dim)">{p.label}</text>
      ) : null)}
    </g>
  );
}

/** Vertical columns from a zero baseline. `muted` points draw in the dim color (idle hours). */
export function ColumnChart({ points, fmt = fmtCompact, ariaLabel }: { points: Point[]; fmt?: (v: number) => string; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...points.map(p => p.value ?? 0));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = width - PAD.left - PAD.right;
  const band = points.length ? plotW / points.length : plotW;
  const barW = Math.max(2, Math.min(24, band * 0.7));
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / top);
  const base = y(0);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 56))));
  return (
    <div ref={ref} style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={ariaLabel} style={{ display: "block", overflow: "visible" }}>
        <YAxis ticks={ticks} y={y} width={width} fmt={fmt} />
        {points.map((p, i) => {
          const v = p.value ?? 0;
          const h = Math.max(v > 0 ? 2 : 0, base - y(v));
          const r = Math.min(4, h, barW / 2);
          const x0 = x(i) - barW / 2, x1 = x(i) + barW / 2, yt = base - h;
          // 4px rounded data end, square at the baseline.
          const d = h <= 0 ? "" : `M${x0},${base} V${yt + r} Q${x0},${yt} ${x0 + r},${yt} H${x1 - r} Q${x1},${yt} ${x1},${yt + r} V${base} Z`;
          return (
            <g key={p.key}>
              {d && <path d={d} fill={p.muted ? "var(--dim)" : "var(--accent)"} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {p.muted && h <= 0 && <rect x={x0} y={base - 3} width={barW} height={3} rx={1.5} fill="var(--dim)" opacity={0.6} />}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={H - PAD.top - PAD.bottom}
                fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
            </g>
          );
        })}
        <line x1={PAD.left} x2={width - PAD.right} y1={base} y2={base} stroke="var(--muted)" strokeWidth={1} />
        <XLabels points={points} x={x} every={every} />
      </svg>
      {hover !== null && points[hover] && (
        <Tooltip x={x(hover)} width={width}>
          <div style={{ fontWeight: 650, marginBottom: 2 }}>{points[hover].label}</div>
          {points[hover].detail}
        </Tooltip>
      )}
    </div>
  );
}

/** A 2px line with a crosshair and tooltip. Null points leave a gap. */
export function LineChart({ points, fmt = (v: number) => `${v}%`, ariaLabel, minTop = 0 }:
  { points: Point[]; fmt?: (v: number) => string; ariaLabel: string; minTop?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(minTop, ...points.map(p => p.value ?? 0));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = width - PAD.left - PAD.right;
  const step = points.length > 1 ? plotW / (points.length - 1) : plotW;
  const x = (i: number) => PAD.left + (points.length > 1 ? step * i : plotW / 2);
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / top);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / 56))));
  const segments: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.value == null) { if (cur) segments.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i)},${y(p.value)} `;
  });
  if (cur) segments.push(cur);
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left - PAD.left) / (step || 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const hp = hover !== null ? points[hover] : null;
  return (
    <div ref={ref} style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={ariaLabel} style={{ display: "block", overflow: "visible" }}>
        <YAxis ticks={ticks} y={y} width={width} fmt={fmt} />
        <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeWidth={1} />
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {/* Lone points between gaps would otherwise be invisible. */}
        {points.map((p, i) => p.value != null && (points[i - 1]?.value == null) && (points[i + 1]?.value == null) ? (
          <circle key={p.key} cx={x(i)} cy={y(p.value)} r={3} fill="var(--accent)" />
        ) : null)}
        {hp && hp.value != null && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(hp.value)} r={4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={H - PAD.top - PAD.bottom} fill="transparent" onMouseMove={onMove} />
        <XLabels points={points} x={x} every={every} />
      </svg>
      {hp && hover !== null && (
        <Tooltip x={x(hover)} width={width}>
          <div style={{ fontWeight: 650, marginBottom: 2 }}>{hp.label}</div>
          {hp.detail}
        </Tooltip>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <b style={{ fontVariantNumeric: "tabular-nums" }}>{v}</b>
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 8px", color: "var(--muted)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "6px 8px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtDur(ms: number | null) {
  if (ms == null) return "—";
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

// ── the section ──────────────────────────────────────────────────────────────
const _cache = new Map<number, AdminPipelineResponse>();
const POLL_MS = 120_000;

export default function PipelineCharts({ days }: { days: number }) {
  const [data, setData] = useState<AdminPipelineResponse | null>(() => _cache.get(days) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const cached = _cache.get(days);
    if (cached) setData(cached);
    async function load() {
      try {
        const resp = await apiFetch(`/api/admin/pipeline?days=${days}`);
        const json = await resp.json() as AdminPipelineResponse;
        if (!alive) return;
        if (!resp.ok || json.error) { setError(json.error || `HTTP ${resp.status}`); return; }
        _cache.set(days, json); setData(json); setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void load();
    const poll = setInterval(() => { void load(); }, POLL_MS);
    return () => { alive = false; clearInterval(poll); };
  }, [days, reload]);

  const today = newYorkToday();
  const totals = useMemo(() => (data ? pipelineTotals(data, today) : null), [data, today]);
  const days_ = useMemo(() => fillDays(data?.daily ?? [], today), [data, today]);
  const hours_ = useMemo(() => fillHours(data?.hourly ?? []), [data]);

  const dailyPoints = useMemo(() => days_.map(d => ({
    key: d.d, label: dayLabel(d.d), value: d.extracted,
    detail: <>
      <Row k="Extracted" v={fmtInt(d.extracted)} />
      <Row k="Failed" v={`${fmtInt(d.failures)} (${fmtPct(failureRate(d))})`} />
      <Row k="Batches" v={fmtInt(d.batches)} />
      {d.empty_batches > 0 && <Row k="Nothing to claim" v={fmtInt(d.empty_batches)} />}
      {d.d === today && <div style={{ color: "var(--dim)", marginTop: 3 }}>Today so far</div>}
    </>,
  })), [days_, today]);

  const failurePoints = useMemo(() => days_.map(d => ({
    key: d.d, label: dayLabel(d.d), value: failureRate(d),
    detail: <><Row k="Failure rate" v={fmtPct(failureRate(d))} /><Row k="Failed" v={fmtInt(d.failures)} /></>,
  })), [days_]);

  const longPoints = useMemo(() => days_.map(d => ({
    key: d.d, label: dayLabel(d.d), value: longCallShare(d),
    detail: <>
      <Row k="Long call" v={fmtPct(longCallShare(d))} />
      <Row k="Long calls" v={fmtInt(d.long_calls)} />
      <Row k="Short calls" v={fmtInt(d.short_calls)} />
    </>,
  })), [days_]);

  const hourlyPoints = useMemo(() => hours_.map(h => {
    const idle = h.batches > 0 && h.extracted === 0 && h.failures === 0;
    return {
      key: h.h, label: hourLabel(h.h), value: h.extracted, muted: idle || (h.extracted === 0 && h.failures > 0),
      detail: <>
        <div style={{ color: "var(--dim)", marginBottom: 3 }}>{dayLabel(h.h.slice(0, 10))}</div>
        <Row k="Extracted" v={fmtInt(h.extracted)} />
        <Row k="Failed" v={fmtInt(h.failures)} />
        <Row k="Batches" v={fmtInt(h.batches)} />
        {idle && <div style={{ color: "var(--dim)", marginTop: 3 }}>Idle: nothing to claim</div>}
        {h.batches === 0 && <div style={{ color: "var(--dim)", marginTop: 3 }}>No batches ran</div>}
      </>,
    };
  }), [hours_]);

  async function retry(ids: string[]) {
    setRetrying(ids.length === 1 ? ids[0] : "all");
    setRetryNote(null);
    try {
      const resp = await apiFetch("/api/admin/pipeline/retry", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }),
      });
      const json = await resp.json() as { reset?: number; error?: string; message?: string };
      if (!resp.ok) setRetryNote(json.message || json.error || `HTTP ${resp.status}`);
      else {
        setRetryNote(`${fmtInt(json.reset ?? 0)} back in the queue. The worker claims them within a few minutes.`);
        _cache.delete(days);
        setReload(r => r + 1);
      }
    } catch (e) {
      setRetryNote(e instanceof Error ? e.message : String(e));
    } finally {
      setRetrying(null);
    }
  }

  if (!data) {
    return (
      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "16px 18px", color: error ? "var(--red-ink, #b91c1c)" : "var(--dim)", fontSize: 13, marginBottom: 18 }}>
        {error ? `Pipeline charts unavailable: ${error}` : "Loading pipeline history…"}
      </div>
    );
  }

  const b = data.backlog;
  const l = data.latency;
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 };

  return (
    <section aria-label="Jobs pipeline history" style={{ marginBottom: 22 }}>
      {error && <div style={{ fontSize: 12, color: "var(--amber-ink, #b45309)", marginBottom: 8 }}>Showing the last good data: {error}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        <AdminKpiCard title={`Extracted, ${data.days} days`} value={fmtCompact(totals?.extracted ?? 0)} sub={`about ${fmtInt(totals?.perDay ?? 0)} a day, last 7 full days`} />
        <AdminKpiCard title="Failure rate" value={fmtPct(totals?.failureRate ?? null)} sub={`${fmtInt(totals?.failures ?? 0)} failed`} />
        <AdminKpiCard title="Long-call share, 7 days" value={fmtPct(totals?.longShare7d ?? null)} sub="tagger found no skill" />
        <AdminKpiCard title="New posting to extracted" value={fmtHours(l.extract_p50_h)} sub={`half wait less · 90% within ${fmtHours(l.extract_p90_h)}`} />
        <AdminKpiCard title="Waiting" value={fmtInt(b.waiting)} sub={`${fmtInt(b.stuck)} stopped after 3 failures`} />
      </section>

      <div style={grid}>
        <AdminChartCard full title="Postings extracted per day" cap={<>
          New York days, last {data.days}. Hover a day for failures and batches.{" "}
          <button type="button" onClick={() => setShowTable(s => !s)} style={{ border: "none", background: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 12 }}>
            {showTable ? "Hide table" : "Show as table"}
          </button>
        </>}>
          <ColumnChart points={dailyPoints} ariaLabel={`Postings extracted per day for the last ${data.days} days`} />
          {showTable && (
            <div style={{ overflowX: "auto", marginTop: 12, maxHeight: 280, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Day", "Extracted", "Failed", "Failure rate", "Long call", "Batches", "Full scans", "Written by scans"].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {[...data.daily].reverse().map(d => (
                    <tr key={d.d} style={{ borderBottom: "1px solid var(--surface2)" }}>
                      <td style={td}>{dayLabel(d.d)}</td>
                      <td style={td}>{fmtInt(d.extracted)}</td>
                      <td style={td}>{fmtInt(d.failures)}</td>
                      <td style={td}>{fmtPct(failureRate(d))}</td>
                      <td style={td}>{fmtPct(longCallShare(d))}</td>
                      <td style={td}>{fmtInt(d.batches)}</td>
                      <td style={td}>{fmtInt(d.full_scans)}</td>
                      <td style={td}>{fmtInt(d.upserted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminChartCard>
      </div>

      <div style={grid}>
        <AdminChartCard full title="Postings extracted per hour, last 48 hours"
          cap={`Gray hours ran batches that found nothing to claim${totals && totals.idleHours48h ? ` (${totals.idleHours48h} in the last 48 hours)` : ""}. A gap means no batches ran at all.`}>
          <ColumnChart points={hourlyPoints} ariaLabel="Postings extracted per hour for the last 48 hours" />
        </AdminChartCard>
      </div>

      <div style={grid}>
        <AdminChartCard title="Failure rate per day" cap="Failed attempts out of all attempts.">
          <LineChart points={failurePoints} minTop={2} ariaLabel="Extraction failure rate per day" />
        </AdminChartCard>
        <AdminChartCard title="Long-call share per day" cap="Postings that needed the slower long Llama call. Last 30 days at most.">
          <LineChart points={longPoints} minTop={10} ariaLabel="Share of postings needing the long extraction call per day" />
        </AdminChartCard>
      </div>

      <div style={grid}>
        <AdminChartCard title="Waiting for extraction, by posting age" cap={`${fmtInt(b.window_total)} active postings from the last 10 days · ${fmtInt(b.extracted)} extracted · ${fmtInt(b.no_text)} have no description to read`}>
          <AdminBarRows data={b.by_age.map(a => [a.k, a.n] as [string, number])} labelWidth={80} />
        </AdminChartCard>
        <AdminChartCard title="How long a new posting waits" cap={`Postings first seen in the last 7 days (${fmtInt(l.n)} extracted).`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <AdminKpiCard title="To extracted" value={fmtHours(l.extract_p50_h)} sub={`90% within ${fmtHours(l.extract_p90_h)}`} />
            <AdminKpiCard title="To embedded" value={fmtHours(l.embed_p50_h)} sub={`90% within ${fmtHours(l.embed_p90_h)}`} />
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>The middle value: half of new postings wait less than this.</div>
        </AdminChartCard>
      </div>

      <div style={grid}>
        <AdminChartCard full title={`Stopped after 3 failures (${fmtInt(b.stuck)})`}
          cap="The worker stops claiming a posting once it has come back empty 3 times. Retry puts it back in the queue.">
          {data.stuck.length === 0 ? (
            <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>None right now.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={retrying !== null} onClick={() => retry(data.stuck.map(s => s.id))}
                  style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: retrying ? "wait" : "pointer" }}>
                  {retrying === "all" ? "Retrying…" : `Retry all ${data.stuck.length}`}
                </button>
                {retryNote && <span role="status" style={{ fontSize: 12, color: "var(--muted)" }}>{retryNote}</span>}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Posting", "Company", "Posted", "Description", ""].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.stuck.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid var(--surface2)" }}>
                        <td style={{ ...td, whiteSpace: "normal", minWidth: 180 }}>{s.title || "—"}</td>
                        <td style={td}>{s.company || "—"}</td>
                        <td style={td}>{fmtWhen(s.posted_at)}</td>
                        <td style={td}>{s.jd_len != null ? `${fmtInt(s.jd_len)} characters` : "—"}</td>
                        <td style={td}>
                          <button type="button" disabled={retrying !== null} onClick={() => retry([s.id])}
                            style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", cursor: retrying ? "wait" : "pointer" }}>
                            {retrying === s.id ? "…" : "Retry"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminChartCard>
      </div>

      <div style={grid}>
        <AdminChartCard full title="Full scans" cap="Discovery runs that fetched the job boards, newest first. Extraction batches are counted in the charts above.">
          {data.full_scans.length === 0 ? (
            <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>No full scans in this window.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Started", "Took", "Fetched", "Written (new or changed)", "Deactivated", "Errors"].map(h => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.full_scans.map(r => (
                    <tr key={r.started_at} style={{ borderBottom: "1px solid var(--surface2)" }}>
                      <td style={td}>{fmtWhen(r.started_at)}</td>
                      <td style={td}>{fmtDur(r.duration_ms)}</td>
                      <td style={td}>{fmtInt(r.fetched)}</td>
                      <td style={td}>{fmtInt(r.upserted)}</td>
                      <td style={td}>{fmtInt(r.deactivated)}</td>
                      <td style={{ ...td, color: r.errors > 0 ? "var(--red-ink, #b91c1c)" : undefined, fontWeight: r.errors > 0 ? 600 : 400 }}>{fmtInt(r.errors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminChartCard>
      </div>
    </section>
  );
}
