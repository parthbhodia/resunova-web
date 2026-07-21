"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/utils";
import type { AdminJobMarketResponse, JobMarketSkill } from "@/lib/types";
import { AdminKpiCard, AdminBarRows, AdminChartCard } from "@/components/admin/charts";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }
function money(n: number) { return "$" + Math.round((n || 0) / 1000) + "K"; }
function titleize(s: string) {
  if (s === "__all__") return "Overall";
  const special: Record<string, string> = { customer_success: "Customer success", skilled_trades: "Skilled trades" };
  return special[s] || s.charAt(0).toUpperCase() + s.slice(1);
}
function pct(n: number, d: number) { return d > 0 ? Math.round((100 * n) / d) : 0; }

// Module-level cache: the panel unmounts on every host tab flip / page switch.
let _jmCache: AdminJobMarketResponse | null = null;

// ─── the panel ────────────────────────────────────────────────────────────────
interface Props { getAuthHeaders?: () => Promise<Record<string, string>>; }

export default function JobMarketPanel({ getAuthHeaders }: Props) {
  const [data, setData] = useState<AdminJobMarketResponse | null>(() => _jmCache);
  const [loading, setLoading] = useState(!_jmCache);
  const [error, setError] = useState<string | null>(null);
  const [skillFam, setSkillFam] = useState<string>("__all__");

  useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      try {
        const headers = getAuthHeaders ? await getAuthHeaders() : {};
        const resp = await fetch(apiUrl("/api/admin/job-market"), { headers });
        const json = await resp.json() as AdminJobMarketResponse & { error?: string };
        if (!alive) return;
        if (json.error) { setError(json.error); if (!_jmCache) setData(null); }
        else { setData(json); _jmCache = json; }
      } catch (e) {
        if (alive && !_jmCache) { setError(e instanceof Error ? e.message : String(e)); setData(null); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [getAuthHeaders]);

  // Skill families that actually have data, ordered by demand.
  const skillFamilies = useMemo(() => {
    if (!data) return [];
    const order = data.families.map(f => f.family);
    return ["__all__", ...order.filter(f => data.skills_by_family[f]?.length)];
  }, [data]);

  const skillRows: JobMarketSkill[] = useMemo(() => {
    if (!data) return [];
    return skillFam === "__all__" ? data.skills_overall : (data.skills_by_family[skillFam] || []);
  }, [data, skillFam]);

  if (loading && !data) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: 88, borderRadius: 10, background: "var(--surface2)", opacity: 0.6 }} />)}
      </div>
    );
  }
  if (error && !data) {
    return <div style={{ background: "var(--red-bg, #fef2f2)", border: "1px solid var(--red-ink, #fecaca)", borderRadius: 8, padding: "11px 14px", color: "var(--red-ink, #b91c1c)", fontSize: 13 }}>{error}</div>;
  }
  if (!data) return null;

  const k = data.kpis;
  const wmTotal = data.work_model.reduce((s, w) => s + w.n, 0);
  const wmColor: Record<string, string> = { onsite: "var(--accent)", hybrid: "var(--green-ink, #10b981)", remote: "var(--amber-ink, #d97706)" };
  const salMax = Math.max(...data.salary.map(s => s.p75), 1);
  // Preferred seniority order (natural progression), fall back to any extras.
  const senOrder = ["intern", "entry", "mid", "senior", "lead", "principal", "director", "executive"];
  const seniority = [...data.seniority].sort((a, b) => senOrder.indexOf(a.k) - senOrder.indexOf(b.k));

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Job Market — live hiring demand</h2>
        <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{fmtInt(k.employers)} employers · {k.sources} sources</span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 18px", maxWidth: "68ch" }}>
        What U.S. employers are hiring for right now, from Resunova&rsquo;s active job-posting corpus — real currently-open postings, not projections.
      </p>

      {/* KPI strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <AdminKpiCard title="Active U.S. postings" value={fmtInt(k.active_us)} sub="currently open" />
        <AdminKpiCard title="Employers hiring" value={fmtInt(k.employers)} sub="distinct companies" />
        <AdminKpiCard title="Remote share" value={`${pct(k.remote, wmTotal)}%`} sub={`${pct(k.onsite, wmTotal)}% onsite · ${pct(k.hybrid, wmTotal)}% hybrid`} />
        <AdminKpiCard title="Salary transparency" value={`${pct(k.salary_disclosed, k.active_us)}%`} sub="of postings disclose pay" />
        <AdminKpiCard title="H-1B sponsor roles" value={fmtInt(k.h1b)} sub="visa-sponsor flagged" />
        <AdminKpiCard title="Job families" value={fmtInt(k.families)} sub="tracked" />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 15 }}>
        {/* Demand by family */}
        <AdminChartCard title="Demand by job family" cap={<>Active U.S. postings per family. <b style={{ color: "var(--text2, var(--muted))" }}>&ldquo;General&rdquo;</b> is the unclassified catch-all.</>}>
          <AdminBarRows data={data.families.map(f => [f.family, f.n] as [string, number])} label={titleize} dimKey={f => f === "general"} />
        </AdminChartCard>

        {/* Skills in demand */}
        <AdminChartCard title="Skills in demand" cap="Times a skill is required or preferred. Pick a family to drill in.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 13 }}>
            {skillFamilies.map(f => (
              <button key={f} type="button" onClick={() => setSkillFam(f)} aria-pressed={skillFam === f}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, cursor: "pointer",
                  fontFamily: "inherit", border: "1px solid var(--border)",
                  background: skillFam === f ? "var(--accent)" : "transparent",
                  color: skillFam === f ? "#fff" : "var(--muted)",
                }}>
                {titleize(f)}
              </button>
            ))}
          </div>
          <AdminBarRows data={skillRows.map(s => [s.skill, s.n] as [string, number])} />
        </AdminChartCard>

        {/* Salary bands */}
        <section style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "17px 17px 15px", background: "var(--surface)", gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 660, fontSize: 14.5 }}>Pay bands by family</div>
          <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 16px" }}>
            Annualized. <b>Bar = 25th→75th percentile</b>, dot = median. From the {pct(k.salary_disclosed, k.active_us)}% of postings that disclose pay; hourly annualized ×2,080.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {data.salary.map(s => (
              <div key={s.family} style={{ display: "grid", gridTemplateColumns: "116px 1fr", alignItems: "center", gap: 12 }}
                title={`${titleize(s.family)} — median ${money(s.median)} · ${money(s.p25)}–${money(s.p75)} (n=${fmtInt(s.n)})`}>
                <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "right" }}>{titleize(s.family)}</div>
                <div style={{ position: "relative", height: 20 }}>
                  <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "var(--surface2)", transform: "translateY(-50%)", borderRadius: 2 }} />
                  <div style={{ position: "absolute", top: "50%", height: 8, borderRadius: 5, background: "var(--accent)", opacity: 0.28, transform: "translateY(-50%)", left: `${(s.p25 / salMax) * 100}%`, width: `${((s.p75 - s.p25) / salMax) * 100}%` }} />
                  <div style={{ position: "absolute", top: "50%", width: 11, height: 11, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--surface)", transform: "translate(-50%,-50%)", left: `${(s.median / salMax) * 100}%` }} />
                  <div style={{ position: "absolute", top: "50%", transform: "translate(8px,-50%)", left: `${(s.p75 / salMax) * 100}%`, fontSize: 11.5, fontWeight: 650, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{money(s.median)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Work model */}
        <AdminChartCard title="Work model" cap={`Of the ${fmtInt(wmTotal)} postings that state one.`}>
          <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", gap: 2 }}>
            {data.work_model.map(w => (
              <div key={w.k} title={`${titleize(w.k)} — ${fmtInt(w.n)} (${pct(w.n, wmTotal)}%)`}
                style={{ width: `${(w.n / wmTotal) * 100}%`, background: wmColor[w.k] || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 650 }}>
                {pct(w.n, wmTotal) > 7 ? `${pct(w.n, wmTotal)}%` : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 13 }}>
            {data.work_model.map(w => (
              <span key={w.k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--muted)" }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: wmColor[w.k] || "var(--accent)" }} />
                {titleize(w.k)} <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtInt(w.n)}</b>
              </span>
            ))}
          </div>
        </AdminChartCard>

        {/* Seniority */}
        <AdminChartCard title="Seniority mix" cap="Labeled seniority across active U.S. postings.">
          <AdminBarRows data={seniority.map(s => [s.k, s.n] as [string, number])} label={titleize} />
        </AdminChartCard>

        {/* Trend */}
        <section style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "17px 17px 15px", background: "var(--surface)", gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 660, fontSize: 14.5 }}>Active postings by week posted</div>
          <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 12px", maxWidth: "72ch" }}>
            Freshness of the live corpus — <b>not</b> a market hiring trend. The ramp mostly reflects that active postings skew recent and that crawl coverage grew; older postings get retired.
          </div>
          <TrendChart trend={data.trend} />
        </section>
      </div>

      <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 13, fontSize: 12, color: "var(--dim)", lineHeight: 1.6 }}>
        Coverage: job family &amp; skills ~99% of postings · work model ~85% · seniority ~90% · salary disclosed ~{pct(k.salary_disclosed, k.active_us)}%. Pay bands describe the transparent subset, not all jobs. Snapshot generated {new Date(data.generated_at).toLocaleString()}.
      </div>
    </div>
  );
}

// ─── trend line (inline SVG) ──────────────────────────────────────────────────
function TrendChart({ trend }: { trend: Array<{ wk: string; n: number }> }) {
  if (trend.length < 2) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Not enough trend data yet.</p>;
  const W = 1000, H = 200, padL = 44, padR = 14, padT = 12, padB = 26;
  const ys = trend.map(d => d.n);
  const maxY = Math.ceil(Math.max(...ys) / 5000) * 5000 || 5000;
  const X = (i: number) => padL + (i / (trend.length - 1)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB);
  const line = trend.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(d.n).toFixed(1)}`).join("");
  const area = `${line}L${X(trend.length - 1).toFixed(1)},${Y(0)}L${X(0).toFixed(1)},${Y(0)}Z`;
  const gridVals: number[] = [];
  for (let v = 0; v <= maxY; v += Math.max(5000, Math.round(maxY / 4 / 5000) * 5000)) gridVals.push(v);
  const ticks = [0, Math.floor(trend.length / 3), Math.floor((2 * trend.length) / 3), trend.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Active postings by week posted" style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
      {gridVals.map(v => (
        <g key={v}>
          <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)} stroke="var(--border)" strokeWidth={1} />
          <text x={padL - 8} y={Y(v) + 3.5} textAnchor="end" fill="var(--muted)" fontSize={10.5} fontFamily="inherit">{v / 1000}K</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.11} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(trend.length - 1)} cy={Y(trend.at(-1)!.n)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
      {ticks.map(i => (
        <text key={i} x={X(i)} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize={10.5} fontFamily="inherit">
          {new Date(trend[i].wk).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </text>
      ))}
    </svg>
  );
}
