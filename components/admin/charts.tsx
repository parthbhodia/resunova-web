"use client";

/**
 * Shared admin chart kit — one visual language across every admin surface
 * (Advisor cohort overview, Analytics tabs, Job Market). Theme-var styled so it
 * tracks light/dark automatically. Presentational only; no data fetching.
 */
import type { CSSProperties, ReactNode } from "react";

function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }

// ── KPI card ──────────────────────────────────────────────────────────────────
export function AdminKpiCard({ title, value, sub }: { title: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 15px", background: "var(--surface)", minWidth: 0 }}>
      <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontSize: 23, fontWeight: 720, marginTop: 5, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub != null && <div style={{ color: "var(--dim)", fontSize: 12, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── horizontal bar rows (magnitude) ───────────────────────────────────────────
export function AdminBarRows({ data, label = (x: string) => x, dimKey, color = "var(--accent)", labelWidth = 112 }:
  { data: Array<[string, number]>; label?: (x: string) => string; dimKey?: (k: string) => boolean; color?: string; labelWidth?: number }) {
  const max = Math.max(...data.map(d => d[1]), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: `${labelWidth}px 1fr 52px`, alignItems: "center", gap: 10 }} title={`${label(k)} — ${fmtInt(v)}`}>
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label(k)}</div>
          <div style={{ height: 15, background: "var(--surface2)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(2, (v / max) * 100)}%`, background: dimKey && dimKey(k) ? "var(--dim)" : color, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtInt(v)}</div>
        </div>
      ))}
    </div>
  );
}

// ── 0-100 score bars (color-graded) ───────────────────────────────────────────
export function AdminScoreBars({ data, colorFn, labelWidth = 150 }:
  { data: Array<{ label: string; score: number | null }>; colorFn: (s: number | null) => string; labelWidth?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map(({ label, score }) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: `${labelWidth}px 1fr 34px`, alignItems: "center", gap: 10 }}
          title={score !== null ? `${label} — ${Math.round(score)}/100` : `${label} — no data`}>
          <div style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          <div style={{ height: 15, background: "var(--surface2)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(2, Math.min(100, score ?? 0))}%`, background: colorFn(score), borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 650, textAlign: "right", fontVariantNumeric: "tabular-nums", color: colorFn(score) }}>
            {score !== null ? Math.round(score) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── stacked proportion bar + legend (composition) ─────────────────────────────
export interface StackSegment { label: string; value: number; color: string; }
export function AdminStackedBar({ segments, minLabelPct = 8 }: { segments: StackSegment[]; minLabelPct?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const pct = (n: number) => Math.round((100 * n) / total);
  return (
    <div>
      <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", gap: 2 }}>
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} title={`${s.label} — ${fmtInt(s.value)} (${pct(s.value)}%)`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 650 }}>
            {pct(s.value) >= minLabelPct ? `${pct(s.value)}%` : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 13 }}>
        {segments.map(s => (
          <span key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--muted)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color }} />
            {s.label} <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtInt(s.value)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── section card wrapper ──────────────────────────────────────────────────────
export function AdminChartCard({ title, cap, children, full, style }:
  { title: string; cap?: ReactNode; children: ReactNode; full?: boolean; style?: CSSProperties }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "17px 17px 15px", background: "var(--surface)", gridColumn: full ? "1 / -1" : undefined, minWidth: 0, ...style }}>
      <div style={{ fontWeight: 660, fontSize: 14 }}>{title}</div>
      {cap ? <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 14px" }}>{cap}</div> : <div style={{ height: 14 }} />}
      {children}
    </section>
  );
}
