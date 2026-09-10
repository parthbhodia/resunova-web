"use client";

/**
 * Signup → scan → tailor → apply, as bars and as a flow.
 *
 * The backend has already decided what these numbers may claim (see
 * lib/adminFunnel.ts for the four rules this view must not undo). What is left
 * here is presentation, and one editorial choice worth naming: the Sankey is
 * NOT a prettier copy of the bars. The bars answer "how far does a cohort get";
 * the flow answers "which route did they take", and those are different
 * questions — 5 people tailored without a saved scan and 2 applied without
 * tailoring, which no ladder can draw.
 *
 * ⚠️ Stopped strands are GREY on purpose. Tinting them red restates a
 * measurement as a judgement about the people in them.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { AdminChartCard, AdminKpiCard } from "@/components/admin/charts";
import {
  rateLabel,
  sankeyLayout,
  type FlowRole,
  type FunnelResponse,
  type FunnelStage,
} from "@/lib/adminFunnel";

// Three flow roles. Stopped is a neutral grey, never red.
const FLOW_FILL: Record<FlowRole, string> = {
  progress: "var(--accent)",
  offpath: "var(--amber)",
  stopped: "var(--dim)",
};
const FLOW_INK: Record<FlowRole, string> = {
  progress: "var(--accent-ink)",
  offpath: "var(--amber-ink)",
  stopped: "var(--muted)",
};

// Survives the RouterView unmount that drops every ?view= page.
const _funnelCache = new Map<number, FunnelResponse>();
let _lastDays = 0;

const fmt = (n: number) => new Intl.NumberFormat().format(n);

function StageRow({ stage, max }: { stage: FunnelStage; max: number }) {
  const pctOfSignup = rateLabel(stage.pctOfSignup);
  const pctOfPrev = rateLabel(stage.pctOfPrev);
  const width = max > 0 ? Math.max((stage.count / max) * 100, stage.count > 0 ? 1.5 : 0) : 0;
  return (
    <li data-funnel-stage={stage.key} style={{ listStyle: "none", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{stage.label}</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
            {fmt(stage.count)}
          </span>
          {/* A null rate means the backend suppressed it: the count stands alone. */}
          {pctOfSignup && <span data-funnel-pct-signup style={{ color: "var(--muted)" }}>{pctOfSignup} of signups</span>}
          {pctOfPrev && <span data-funnel-pct-prev style={{ color: "var(--dim)" }}>{pctOfPrev} of previous</span>}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "var(--surface2)", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: FLOW_FILL.progress, borderRadius: 999 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 5, fontSize: 12 }}>
        {stage.drop > 0 && (
          <span data-funnel-drop style={{ color: "var(--muted)" }}>
            {fmt(stage.drop)} lost here
          </span>
        )}
        {/* Rendered verbatim: it names the route taken, which is the finding. */}
        {stage.offPath > 0 && stage.offPathLabel && (
          <span
            data-funnel-offpath
            style={{
              color: FLOW_INK.offpath,
              background: "var(--amber-bg)",
              borderRadius: 999,
              padding: "1px 9px",
              fontWeight: 600,
            }}
          >
            {fmt(stage.offPath)} {stage.offPathLabel}
          </span>
        )}
      </div>
    </li>
  );
}

function Sankey({ sankey }: { sankey: FunnelResponse["sankey"] }) {
  const layout = useMemo(() => sankeyLayout(sankey), [sankey]);
  if (!layout.nodes.length) {
    return <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>No routes recorded yet.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        data-funnel-sankey
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ width: "100%", minWidth: 620, height: "auto", display: "block" }}
        role="img"
        aria-label="How the cohort moved between signing up, scanning, tailoring and applying"
      >
        {layout.columns.map((c) => (
          <text key={c.label} x={c.x} y={16} style={{ fontSize: 11, fontWeight: 700, fill: "var(--dim)", letterSpacing: 0.4 }}>
            {c.label}
          </text>
        ))}
        {/* Links first, so the labelled blocks always sit on top of them. */}
        {layout.links.map((l) => (
          <path
            key={`${l.source}->${l.target}`}
            data-funnel-link={`${l.source}->${l.target}`}
            data-role={l.role}
            d={l.d}
            fill={FLOW_FILL[l.role]}
            opacity={l.role === "stopped" ? 0.3 : 0.42}
          >
            <title>{`${fmt(l.value)}: ${l.sourceLabel} → ${l.targetLabel}`}</title>
          </path>
        ))}
        {layout.links.map((l) =>
          l.labelX == null || l.labelY == null ? null : (
            <text
              key={`lab-${l.source}->${l.target}`}
              data-funnel-link-label
              x={l.labelX}
              y={l.labelY}
              textAnchor="end"
              style={{ fontSize: 11, fontWeight: 700, fill: FLOW_INK.offpath }}
            >
              {fmt(l.value)} skipped ahead
            </text>
          ),
        )}
        {layout.nodes.map((n) => (
          <g key={n.key} data-funnel-node={n.key} data-role={n.role}>
            <rect x={n.x} y={n.y} width={layout.blockWidth} height={n.h} rx={3} fill={FLOW_FILL[n.role]} />
            {/* Text on a solid hue fill uses --on-fill: every hue token is tuned
                to be readable as TEXT on its own ground, so white on --amber is
                1.4:1 in dark. Blocks under ~26px carry their label outside. */}
            {n.h >= 26 ? (
              <text x={n.x + 10} y={n.y + n.h / 2 + 4} style={{ fontSize: 11, fontWeight: 700, fill: "var(--on-fill)" }}>
                {n.label} · {fmt(n.value)}
              </text>
            ) : (
              <text
                x={n.x + layout.blockWidth + 8}
                y={n.y + n.h / 2 + 4}
                style={{ fontSize: 11, fontWeight: 700, fill: FLOW_INK[n.role] }}
              >
                {n.label} · {fmt(n.value)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function FunnelPanel() {
  const [days, setDays] = useState(_lastDays);
  // Both are stamped with the window they belong to, so what is on screen is
  // derived during render rather than synced into state by the effect. That
  // keeps the cache read out of the effect entirely (setState synchronously
  // inside one trips react-hooks/set-state-in-effect and cascades renders), and
  // it makes "these numbers are for THIS window" true by construction rather
  // than by ordering.
  const [result, setResult] = useState<{ days: number; payload: FunnelResponse } | null>(null);
  const [failure, setFailure] = useState<{ days: number; message: string } | null>(null);

  const data: FunnelResponse | null =
    result?.days === days ? result.payload : (_funnelCache.get(days) ?? null);
  const error = failure?.days === days ? failure.message : null;
  const loading = !data && !error;

  useEffect(() => {
    _lastDays = days;
  }, [days]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await apiFetch(`/api/admin/funnel${days ? `?days=${days}` : ""}`);
        const json = (await resp.json()) as FunnelResponse & { error?: string };
        if (!alive) return;
        if (!resp.ok || json.error) {
          // An RPC failure returns 500 rather than a 200 carrying zeros: zeros
          // are indistinguishable from a product nobody uses, so a broken
          // funnel must never render as an empty one.
          setFailure({ days, message: json.error ?? `Funnel unavailable (${resp.status})` });
        } else {
          _funnelCache.set(days, json);
          setResult({ days, payload: json });
          setFailure(null);
        }
      } catch (e) {
        if (!alive) return;
        // No `if (!cached)` guard here, and its absence is deliberate: the
        // window-scoped derivation above already decides this. A failed refresh
        // of a window we have data for still renders that data (the error banner
        // is gated on `!data`), while a failed switch to a window we have
        // nothing for shows the error rather than leaving the previous window's
        // counts under the new label. A guard whose removal changes nothing
        // reads like protection and provides none.
        setFailure({ days, message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  const maxCount = useMemo(
    () => (data?.stages ?? []).reduce((m, s) => Math.max(m, s.count), 0),
    [data],
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: "68ch" }}>
          Each bar counts only people who completed every earlier step. Anyone who reached a step
          another way is reported beside it rather than dropped.
          {data ? ` Advisor and admin accounts are excluded (${fmt(data.staffExcluded)}).` : ""}
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>Signups</span>
          <select
            data-funnel-window
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 13, background: "var(--surface)", color: "var(--text)" }}
          >
            <option value={0}>All time</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {loading && !data && (
        <div style={{ height: 200, borderRadius: 10, background: "var(--surface2)", opacity: 0.6 }} />
      )}
      {error && !data && (
        <div
          role="alert"
          style={{ background: "var(--red-bg, #fef2f2)", border: "1px solid var(--red-ink, #fecaca)", borderRadius: 8, padding: "11px 14px", color: "var(--red-ink, #b91c1c)", fontSize: 13 }}
        >
          {error}
        </div>
      )}

      {data && (
        <>
          <AdminChartCard title="The chain" cap="Strict: a bar counts only people who completed every step before it.">
            <ul style={{ margin: 0, padding: 0 }}>
              {data.stages.map((s) => (
                <StageRow key={s.key} stage={s} max={maxCount} />
              ))}
            </ul>
          </AdminChartCard>

          <AdminChartCard
            title="How they moved"
            cap="Drawn from the routes people actually took, so it shows what the bars cannot: two ways into tailoring, and an application that never passed through it."
            full
            style={{ marginTop: 16 }}
          >
            <Sankey sankey={data.sankey} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
              {([["progress", "Kept going"], ["offpath", "Skipped a step"], ["stopped", "Stopped here"]] as Array<[FlowRole, string]>).map(
                ([role, label]) => (
                  <span key={role} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: FLOW_FILL[role], display: "inline-block" }} />
                    {label}
                  </span>
                ),
              )}
            </div>
          </AdminChartCard>

          {/* Deliberately NOT bars and NOT nodes: upgrading is triggered by the
              scan cap rather than by applying, and returning is orthogonal to
              progression — 27 repeat scanners drawn under 17 tailored would put
              a bigger bar below a smaller one. */}
          <section
            data-funnel-aside
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 16 }}
          >
            <AdminKpiCard title="Reached checkout" value={fmt(data.billing.reachedCheckout)} sub="entered Stripe, card optional" />
            <AdminKpiCard title="Subscribed" value={fmt(data.billing.subscribed)} sub="paying today" />
            <AdminKpiCard title="Scanned more than once" value={fmt(data.repeat.scannedMoreThanOnce)} sub="came back to scan again" />
          </section>
          <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>
            These three sit outside the chain on purpose. Upgrading is prompted by the free scan cap
            rather than by applying to a job, and returning is not a later step than tailoring.
          </p>
        </>
      )}
    </div>
  );
}
