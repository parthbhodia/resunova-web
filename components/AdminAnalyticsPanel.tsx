"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/utils";
import type { AdminAnalyticsJobsBlock, AdminAnalyticsResponse, AdminAnalyticsToolRow, AdminAnalyticsUserRow } from "@/lib/types";
import JobMarketPanel from "@/components/JobMarketPanel";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n || 0);
}
function fmtDate(iso: string) {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

// ─── analyst insights ────────────────────────────────────────────────────────

interface Insight { level: "info" | "warn" | "ok"; title: string; body: string; }

function computeInsights(data: AdminAnalyticsResponse): Insight[] {
  const insights: Insight[] = [];
  const { summary, users, tools, daily, activity } = data;

  if (summary.total_runs === 0 && activity.total_analyses > 0) {
    insights.push({ level: "warn", title: "Token logging not yet active",
      body: `${fmtInt(activity.total_analyses)} analysis runs exist but no token events recorded yet. Token tracking populates once the updated backend is live and users run analyses.` });
    return insights;
  }
  if (summary.total_runs === 0) {
    insights.push({ level: "info", title: "No events in this window",
      body: "No usage events in the selected time window. Try extending the window." });
    return insights;
  }

  const sorted = [...users].sort((a, b) => b.tokens - a.tokens);
  if (sorted.length >= 3) {
    const top3Pct = Math.round((100 * sorted.slice(0, 3).reduce((s, u) => s + u.tokens, 0)) / (summary.total_tokens || 1));
    const top1Pct = Math.round((100 * sorted[0].tokens) / (summary.total_tokens || 1));
    if (top3Pct >= 80) {
      insights.push({ level: "warn", title: `Top 3 users = ${top3Pct}% of all tokens`,
        body: `Heavy concentration: ${sorted[0].user_email || sorted[0].user_id} alone is ${top1Pct}%. If these are test accounts, filter before estimating real user costs.` });
    } else if (top3Pct >= 60) {
      insights.push({ level: "info", title: `Top 3 users = ${top3Pct}% of tokens`,
        body: `Moderate concentration — typical for an early-stage product. Watch for free-tier abuse if any are unauthenticated.` });
    } else {
      insights.push({ level: "ok", title: "Well-distributed token usage",
        body: `Top 3 users account for ${top3Pct}% — usage is spread across your base.` });
    }
  }

  if (summary.failure_rate_pct > 5) {
    insights.push({ level: "warn", title: `${summary.failure_rate_pct}% failure rate`,
      body: `${fmtInt(summary.failed_runs)} of ${fmtInt(summary.total_runs)} LLM calls failed. Check provider rate limits, API key quotas, or timeouts.` });
  } else if (summary.failure_rate_pct > 0) {
    insights.push({ level: "ok", title: `${summary.failure_rate_pct}% failure rate (healthy)`,
      body: "Low error rate. The Grok → Gemini fallback chain is working as intended." });
  }

  if (tools.length > 1) {
    const byEff = [...tools].filter(t => t.runs > 0).sort((a, b) => b.tokens_per_run - a.tokens_per_run);
    const most = byEff[0], least = byEff[byEff.length - 1];
    if (most && least && most.tokens_per_run > least.tokens_per_run * 3) {
      insights.push({ level: "info",
        title: `"${most.tool_name}" costs ${Math.round(most.tokens_per_run / (least.tokens_per_run || 1))}× more per call than "${least.tool_name}"`,
        body: `${fmtK(most.tokens_per_run)} tokens/run vs ${fmtK(least.tokens_per_run)} tokens/run. Consider prompt compression or a cheaper model tier.` });
    }
  }

  if (summary.total_prompt_tokens > 0 && summary.total_completion_tokens > 0) {
    const ratio = summary.total_completion_tokens / summary.total_prompt_tokens;
    if (ratio > 1.5) {
      insights.push({ level: "info", title: `Output/input ratio: ${ratio.toFixed(2)}× (verbose completions)`,
        body: "Completions are notably longer than prompts — normal for structured JSON extraction but watch for model padding." });
    }
  }

  if (daily.length >= 6) {
    const half = Math.floor(daily.length / 2);
    const first = daily.slice(0, half).reduce((s, d) => s + d.runs, 0);
    const last = daily.slice(-half).reduce((s, d) => s + d.runs, 0);
    if (first > 0) {
      const pct = Math.round((100 * (last - first)) / first);
      if (pct > 20) insights.push({ level: "ok", title: `+${pct}% run growth over the window`,
        body: "Usage is accelerating — LLM costs will scale proportionally. Good time to model break-even pricing." });
      else if (pct < -20) insights.push({ level: "warn", title: `${pct}% run decline over the window`,
        body: "Usage fell in the second half. Could be weekend effect, a bug that blocked users, or genuine churn." });
    }
  }

  if (activity.total_analyses > summary.total_runs && summary.total_runs > 0) {
    insights.push({ level: "info",
      title: `${fmtInt(activity.total_analyses - summary.total_runs)} analysis runs lack token attribution`,
      body: "These ran before token logging was enabled. Usage totals are understated; gap shrinks as the window rolls forward." });
  }

  return insights;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function KPICard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", background: "var(--surface)", minWidth: 0 }}>
      <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "var(--dim)", fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const colors = { warn: { bg: "#fffbeb", border: "#fde68a", dot: "#d97706" }, ok: { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a" }, info: { bg: "#eff6ff", border: "#bfdbfe", dot: "#2563eb" } };
  const c = colors[insight.level];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 13px", display: "flex", gap: 9 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0, marginTop: 4 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{insight.title}</div>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{insight.body}</div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color = "var(--accent)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((100 * value) / max)) : 0;
  return (
    <div style={{ height: 5, borderRadius: 3, background: "var(--surface2)", overflow: "hidden", marginTop: 3 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

function DailySparkline({ daily }: { daily: Array<{ date: string; tokens: number; runs: number }> }) {
  if (!daily.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No daily data yet.</p>;
  const maxTok = Math.max(...daily.map(d => d.tokens), 1);
  const last14 = daily.slice(-14);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
      {last14.map(d => {
        const h = Math.max(3, Math.round((48 * d.tokens) / maxTok));
        return <div key={d.date} title={`${fmtDate(d.date)}: ${fmtK(d.tokens)} tok, ${d.runs} runs`}
          style={{ flex: 1, height: h, background: "var(--accent)", borderRadius: "2px 2px 0 0", opacity: 0.8 }} />;
      })}
    </div>
  );
}

function UsersTable({ users }: { users: AdminAnalyticsUserRow[] }) {
  const [sortBy, setSortBy] = useState<"tokens" | "runs">("tokens");
  const sorted = useMemo(() => [...users].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 20), [users, sortBy]);
  const maxTok = Math.max(...sorted.map(u => u.tokens), 1);
  const maxRuns = Math.max(...sorted.map(u => u.runs), 1);
  const totalTok = users.reduce((s, u) => s + u.tokens, 0);
  if (!sorted.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No token events yet — activity table below shows analysis run counts.</p>;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["tokens", "runs"] as const).map(k => (
          <button key={k} onClick={() => setSortBy(k)}
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: sortBy === k ? "var(--accent)" : "#fff", color: sortBy === k ? "#fff" : "#374151", cursor: "pointer" }}>
            {k}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              {["User", "Tokens", "% share", "Runs", "Top tools"].map(h => <th key={h} style={{ padding: "7px 6px", color: "var(--muted)", fontWeight: 500 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((u, i) => (
              <tr key={u.user_id} style={{ borderBottom: "1px solid var(--surface2)" }}>
                <td style={{ padding: "7px 6px" }}>
                  <div style={{ fontWeight: i < 3 ? 600 : 400 }}>{u.user_email || u.user_id}</div>
                  {u.user_email && <div style={{ color: "var(--dim)", fontSize: 11 }}>{u.user_id.slice(0, 8)}…</div>}
                </td>
                <td style={{ padding: "7px 6px" }}><div>{fmtK(u.tokens)}</div><MiniBar value={u.tokens} max={maxTok} /></td>
                <td style={{ padding: "7px 6px", color: "var(--muted)" }}>{totalTok > 0 ? `${Math.round((100 * u.tokens) / totalTok)}%` : "—"}</td>
                <td style={{ padding: "7px 6px" }}><div>{fmtInt(u.runs)}</div><MiniBar value={u.runs} max={maxRuns} color="var(--green-ink, #10b981)" /></td>
                <td style={{ padding: "7px 6px", color: "var(--muted)", fontSize: 12 }}>{Object.entries(u.tools).slice(0, 3).map(([t, n]) => `${t}×${n}`).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToolsTable({ tools }: { tools: AdminAnalyticsToolRow[] }) {
  const maxTok = Math.max(...tools.map(t => t.tokens), 1);
  if (!tools.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No tool data yet.</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
          {["Endpoint", "Runs", "Total tokens", "Tokens / run", "Prompt / completion"].map(h =>
            <th key={h} style={{ padding: "7px 6px", color: "var(--muted)", fontWeight: 500 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {tools.map(t => (
          <tr key={t.tool_name} style={{ borderBottom: "1px solid var(--surface2)" }}>
            <td style={{ padding: "7px 6px", fontWeight: 500 }}>{t.tool_name}</td>
            <td style={{ padding: "7px 6px" }}>{fmtInt(t.runs)}</td>
            <td style={{ padding: "7px 6px" }}><div>{fmtK(t.tokens)}</div><MiniBar value={t.tokens} max={maxTok} /></td>
            <td style={{ padding: "7px 6px", color: t.tokens_per_run > 50000 ? "var(--red-ink, #dc2626)" : t.tokens_per_run > 20000 ? "var(--amber-ink, #d97706)" : "var(--text)" }}>{fmtK(t.tokens_per_run)}</td>
            <td style={{ padding: "7px 6px", color: "var(--muted)", fontSize: 12 }}>{fmtK(t.prompt_tokens || 0)} / {fmtK(t.completion_tokens || 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityTable({ byUser }: { byUser: Array<{ user_id: string; user_email: string | null; analyses: number }> }) {
  const max = Math.max(...byUser.map(u => u.analyses), 1);
  if (!byUser.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No analysis activity yet.</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
          <th style={{ padding: "7px 6px", color: "var(--muted)", fontWeight: 500 }}>User</th>
          <th style={{ padding: "7px 6px", color: "var(--muted)", fontWeight: 500 }}>Analyses run</th>
        </tr>
      </thead>
      <tbody>
        {byUser.slice(0, 20).map((u, i) => (
          <tr key={u.user_id} style={{ borderBottom: "1px solid var(--surface2)" }}>
            <td style={{ padding: "7px 6px", fontWeight: i < 3 ? 600 : 400 }}>{u.user_email || u.user_id}</td>
            <td style={{ padding: "7px 6px" }}><div>{fmtInt(u.analyses)}</div><MiniBar value={u.analyses} max={max} color="var(--green-ink, #10b981)" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── jobs pipeline ───────────────────────────────────────────────────────────

function fmtRelativeOrLocal(iso: string): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleString();
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ScanRunsTable({ recent }: { recent: AdminAnalyticsJobsBlock["scan_runs"]["recent"] }) {
  if (!recent.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No scan runs recorded yet.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
            {["Time", "Type", "Duration", "Fetched", "+Added", "Deactivated", "Extracted", "Failures", "Errors"].map(h =>
              <th key={h} style={{ padding: "7px 6px", color: "var(--muted)", fontWeight: 500 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {recent.map((r, i) => (
            <tr key={`${r.started_at}-${i}`} style={{ borderBottom: "1px solid var(--surface2)" }}>
              <td style={{ padding: "7px 6px", whiteSpace: "nowrap" }}>{fmtRelativeOrLocal(r.started_at)}</td>
              <td style={{ padding: "7px 6px" }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                  background: r.skip_fetch ? "#eff6ff" : "#f0fdf4",
                  color: r.skip_fetch ? "#2563eb" : "#16a34a",
                  border: `1px solid ${r.skip_fetch ? "#bfdbfe" : "#bbf7d0"}`,
                }}>
                  {r.skip_fetch ? "Extract-only" : "Full scan"}
                </span>
              </td>
              <td style={{ padding: "7px 6px", color: "var(--muted)" }}>{fmtDuration(r.duration_ms)}</td>
              <td style={{ padding: "7px 6px" }}>{fmtInt(r.fetched)}</td>
              <td style={{ padding: "7px 6px" }}>{fmtInt(r.upserted)}</td>
              <td style={{ padding: "7px 6px" }}>{fmtInt(r.deactivated)}</td>
              <td style={{ padding: "7px 6px" }}>{fmtInt(r.extracted)}</td>
              <td style={{ padding: "7px 6px", fontWeight: r.extraction_failures > 0 ? 600 : 400, color: r.extraction_failures > 0 ? "var(--amber-ink, #b45309)" : "inherit" }}>
                {fmtInt(r.extraction_failures)}
              </td>
              <td style={{ padding: "7px 6px", fontWeight: r.error_count > 0 ? 600 : 400, color: r.error_count > 0 ? "var(--red-ink, #b91c1c)" : "inherit" }}>
                {fmtInt(r.error_count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopCompaniesList({ companies }: { companies: AdminAnalyticsJobsBlock["engagement"]["top_companies"] }) {
  if (!companies.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No apply clicks yet.</p>;
  const max = Math.max(...companies.map(c => c.applies), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {companies.map((c, i) => (
        <div key={`${c.company}-${i}`}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ fontWeight: i < 3 ? 600 : 400 }}>{c.company}</span>
            <span style={{ color: "var(--muted)" }}>{fmtInt(c.applies)}</span>
          </div>
          <MiniBar value={c.applies} max={max} color="var(--green-ink, #10b981)" />
        </div>
      ))}
    </div>
  );
}

function TopPostingsList({ postings }: { postings: AdminAnalyticsJobsBlock["engagement"]["top_postings"] }) {
  if (!postings.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No apply clicks yet.</p>;
  const max = Math.max(...postings.map(p => p.applies), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {postings.map((p, i) => (
        <div key={`${p.title}-${p.company}-${i}`}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
            <span style={{ fontWeight: i < 3 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.title} <span style={{ color: "var(--dim)" }}>· {p.company}</span>
            </span>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>{fmtInt(p.applies)}</span>
          </div>
          <MiniBar value={p.applies} max={max} color="var(--accent)" />
        </div>
      ))}
    </div>
  );
}

function AppliersTable({ users }: { users: AdminAnalyticsJobsBlock["engagement"]["by_user"] }) {
  if (!users.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No apply clicks yet.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            <th style={{ padding: "6px 8px", fontWeight: 600 }}>User</th>
            <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Applies</th>
            <th style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>Postings</th>
            <th style={{ padding: "6px 8px", fontWeight: 600 }}>Companies</th>
            <th style={{ padding: "6px 8px", fontWeight: 600 }}>Last applied</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.user_id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--surface2)" : "none" }}>
              <td style={{ padding: "6px 8px" }}>
                {u.user_email
                  ? u.user_email
                  : <span style={{ color: "var(--dim)" }} title={u.user_id}>{u.user_id.slice(0, 8)}…</span>}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmtInt(u.applies)}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--muted)" }}>{fmtInt(u.postings)}</td>
              <td style={{ padding: "6px 8px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}
                title={u.companies.join(", ")}>
                {u.companies.length ? u.companies.join(", ") : "—"}
              </td>
              <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{u.last_applied_at ? fmtDate(u.last_applied_at) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DailyJobsAddedSparkline({ daily }: { daily: AdminAnalyticsJobsBlock["scan_runs"]["daily"] }) {
  if (!daily.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No daily scan data yet.</p>;
  const max = Math.max(...daily.map(d => d.jobs_added), 1);
  const last14 = daily.slice(-14);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
        {last14.map(d => {
          const h = Math.max(3, Math.round((48 * d.jobs_added) / max));
          return <div key={d.date} title={`${fmtDate(d.date)}: ${d.jobs_added} added, ${d.runs} runs, ${d.extracted} extracted`}
            style={{ flex: 1, height: h, background: "var(--green-ink, #10b981)", borderRadius: "2px 2px 0 0", opacity: 0.8 }} />;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--dim)" }}>
        <span>{fmtDate(last14[0]?.date ?? "")}</span>
        <span>{fmtDate(last14[last14.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}

function JobsPipelineSection({ jobs, tools }: { jobs: AdminAnalyticsJobsBlock; tools: AdminAnalyticsToolRow[] }) {
  const extractionTool = tools.find(t => t.tool_name === "jobs_extract");
  return (
    <section id="jobs-pipeline" style={{ marginTop: 22 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Jobs pipeline</h2>

      {/* KPI strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
        <KPICard title="Active postings" value={fmtInt(jobs.postings.active)} sub={`${fmtInt(jobs.postings.total)} total`} />
        <KPICard title="Extracted" value={fmtInt(jobs.postings.extracted)} sub={`${fmtInt(jobs.postings.pending_extraction)} pending`} />
        <KPICard title="Jobs added (window)" value={fmtInt(jobs.scan_runs.jobs_added)} sub={`${fmtInt(jobs.scan_runs.total_runs)} scan runs`} />
        <KPICard title="Apply clicks (window)" value={fmtInt(jobs.engagement.apply_clicks)} sub={`${fmtInt(jobs.engagement.unique_appliers)} unique users`} />
        <KPICard title="Extraction LLM tokens" value={extractionTool ? fmtK(extractionTool.tokens) : "0"}
          sub={extractionTool ? `${fmtInt(extractionTool.runs)} runs` : "no data"} />
      </section>

      {/* Daily jobs added + sources/companies */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Jobs added per day (last 14 days)</div>
          <DailyJobsAddedSparkline daily={jobs.scan_runs.daily} />
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Active postings by source</div>
          {jobs.postings.by_source.length === 0
            ? <p style={{ color: "var(--dim)", fontSize: 13 }}>No source data yet.</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {jobs.postings.by_source.map(s => (
                  <div key={s.source} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{s.source}</span>
                    <span style={{ color: "var(--muted)" }}>{fmtInt(s.active)}</span>
                  </div>
                ))}
              </div>}
        </div>
      </section>

      {/* Scan runs table */}
      <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)", marginBottom: 22 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Scan runs</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>Most recent runs of the job-board scanner (max 20).</div>
        <ScanRunsTable recent={jobs.scan_runs.recent} />
      </section>

      {/* Top companies by active postings */}
      <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)", marginBottom: 22 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Active postings by company (top 15)</div>
        {jobs.postings.by_company.length === 0
          ? <p style={{ color: "var(--dim)", fontSize: 13 }}>No company data yet.</p>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "5px 16px" }}>
              {jobs.postings.by_company.map(c => (
                <div key={c.company} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</span>
                  <span style={{ color: "var(--muted)", flexShrink: 0, marginLeft: 8 }}>{fmtInt(c.active)}</span>
                </div>
              ))}
            </div>}
      </section>

      {/* Engagement */}
      <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Engagement</div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>
          {fmtInt(jobs.engagement.apply_clicks)} apply clicks · {fmtInt(jobs.engagement.saves)} saves · {fmtInt(jobs.engagement.hides)} hides (window)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>Top companies by applies</div>
            <TopCompaniesList companies={jobs.engagement.top_companies} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>Top postings by applies</div>
            <TopPostingsList postings={jobs.engagement.top_postings} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, color: "var(--muted)" }}>Who applied</div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8 }}>
            {fmtInt(jobs.engagement.unique_appliers)} unique users · top 100 by applies (window)
          </div>
          <AppliersTable users={jobs.engagement.by_user} />
        </div>
      </section>
    </section>
  );
}

function BusinessSection({ jobs }: { jobs: AdminAnalyticsJobsBlock }) {
  const b = jobs.business;
  if (!b) return <p style={{ color: "var(--dim)", fontSize: 13 }}>No business metrics yet.</p>;
  const f = b.contact_funnel;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((100 * n) / d) : 0);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>Data assets</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
          The sellable supply-side inventory: market-intelligence and contact data captured as a byproduct of the feed.
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <KPICard title="Active postings" value={fmtInt(b.active_postings)} sub={`${fmtInt(b.companies)} companies`} />
          <KPICard title="Skill graphs" value={fmtInt(b.skills_extracted)} sub={`${pct(b.skills_extracted, b.active_postings)}% extracted`} />
          <KPICard title="Salary-tagged" value={fmtInt(b.with_salary)} sub={`${pct(b.with_salary, b.active_postings)}% of postings`} />
          <KPICard title="H-1B sponsor roles" value={fmtInt(b.h1b_sponsor_postings)} sub={`${fmtInt(b.dol_employers)} DOL employers`} />
          <KPICard title="HR/DOL contacts" value={fmtInt(b.dol_poc_emails)} sub={`${fmtInt(b.company_contacts)} company + ${fmtInt(b.job_contacts)} posting`} />
        </section>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>Contact engagement</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
          The gated hiring-contact reveal funnel: the signal for whether the contacts feature earns a premium tier.
        </p>
        {f.reveals === 0 ? (
          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "16px 18px", color: "var(--dim)", fontSize: 13 }}>
            No contact reveals in this window yet. This lights up as users tap Reveal contact on job pages.
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <KPICard title="Reveals" value={fmtInt(f.reveals)} sub={`${fmtInt(f.unique_revealers)} unique users`} />
            <KPICard title="Postings w/ reveal" value={fmtInt(f.postings_revealed)} />
            <KPICard title="Copied" value={fmtInt(f.copies)} sub={`${pct(f.copies, f.reveals)}% of reveals`} />
            <KPICard title="Emailed" value={fmtInt(f.emails)} sub={`${pct(f.emails, f.reveals)}% of reveals`} />
            <KPICard title="Action rate" value={`${f.action_rate_pct}%`} sub="copied or emailed" />
          </section>
        )}
      </div>
    </section>
  );
}

// ─── panel (exported) ────────────────────────────────────────────────────────

type TabKey = "product" | "jobs" | "business" | "market";
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "product", label: "Product & cost" },
  { key: "jobs", label: "Jobs pipeline" },
  { key: "business", label: "Data & revenue" },
  { key: "market", label: "Job market" },
];

// Module-level payload cache keyed by window: survives the panel unmount/remount
// that happens on every Cohort <-> Platform tab flip in the host dashboard.
const _panelCache = new Map<number, AdminAnalyticsResponse>();
// Last-selected tab + window survive remounts too, so flipping host tabs or
// switching pages doesn't bounce the panel back to Product & cost / 30 days.
let _lastTab: TabKey = "product";
let _lastDays = 30;

interface Props {
  /** Pass the caller's auth-header factory so the panel reuses existing session auth. */
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

function CardSkeleton({ h = 90 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 10, background: "var(--surface2)", opacity: 0.6 }} />;
}

export default function AdminAnalyticsPanel({ getAuthHeaders }: Props) {
  const [days, setDays] = useState(_lastDays);
  const [tab, setTab] = useState<TabKey>(_lastTab);
  const [loading, setLoading] = useState(!_panelCache.has(_lastDays));
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(() => _panelCache.get(_lastDays) ?? null);

  // Persist the selection so the next mount restores it.
  useEffect(() => { _lastTab = tab; _lastDays = days; }, [tab, days]);

  useEffect(() => {
    let alive = true;
    const cached = _panelCache.get(days);
    if (cached) { setData(cached); setLoading(false); } else { setLoading(true); }
    setError(null);
    (async () => {
      try {
        const headers = getAuthHeaders ? await getAuthHeaders() : {};
        const resp = await fetch(apiUrl(`/api/admin/analytics?days=${days}`), { headers });
        const json = await resp.json() as AdminAnalyticsResponse & { error?: string };
        if (!alive) return;
        if (json.error) { setError(json.error); if (!cached) setData(null); }
        else { setData(json as AdminAnalyticsResponse); _panelCache.set(days, json as AdminAnalyticsResponse); }
      } catch (e) {
        if (!alive) return;
        if (!cached) { setError(e instanceof Error ? e.message : String(e)); setData(null); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [days, getAuthHeaders]);

  const insights = useMemo(() => (data ? computeInsights(data) : []), [data]);
  const costLabel = data?.summary.cost_usd != null
    ? `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(data.summary.cost_usd)}`
    : null;

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ display: "inline-flex", gap: 4, background: "var(--surface2)", padding: 4, borderRadius: 10 }}>
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{
                fontSize: 13, fontWeight: 600, padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: "inherit",
                background: tab === t.key ? "var(--surface)" : "transparent",
                color: tab === t.key ? "var(--text)" : "var(--muted)",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Job market is a live snapshot, not a windowed series — no day picker. */}
        {tab !== "market" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Window</span>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 13, background: "var(--surface)", color: "var(--text)" }}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        )}
      </div>

      {/* Job market fetches its own endpoint independently of the analytics window. */}
      {tab === "market" && <JobMarketPanel getAuthHeaders={getAuthHeaders} />}

      {tab !== "market" && loading && !data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      {tab !== "market" && error && !data && (
        <div style={{ background: "var(--red-bg, #fef2f2)", border: "1px solid var(--red-ink, #fecaca)", borderRadius: 8, padding: "11px 14px", color: "var(--red-ink, #b91c1c)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {tab === "product" && (
            <>
              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 22 }}>
                <KPICard title="LLM Runs" value={fmtInt(data.summary.total_runs)} sub="with token data" />
                <KPICard title="Total Tokens" value={fmtK(data.summary.total_tokens)}
                  sub={`${fmtK(data.summary.total_prompt_tokens ?? 0)} in / ${fmtK(data.summary.total_completion_tokens ?? 0)} out`} />
                {costLabel && <KPICard title="Est. LLM cost" value={costLabel} sub="from configured rates" />}
                <KPICard title="Analyses" value={fmtInt(data.activity?.total_analyses ?? 0)} sub="from resume_analyses" />
                <KPICard title="Active Users" value={fmtInt(data.activity?.unique_users ?? data.summary.unique_users)} />
                <KPICard title="Failure Rate" value={`${data.summary.failure_rate_pct ?? 0}%`} sub={`${fmtInt(data.summary.failed_runs)} failed`} />
              </section>

              {insights.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Analyst notes</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                  </div>
                </section>
              )}

              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 22 }}>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Daily token trend (last 14 days)</div>
                  <DailySparkline daily={data.daily} />
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Models &amp; cost</div>
                  {data.models.length === 0
                    ? <p style={{ color: "var(--dim)", fontSize: 13 }}>No model data yet.</p>
                    : <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {data.models.map(m => (
                          <div key={m.model} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                            <span style={{ fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                              {m.model}
                              {m.free && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green-ink, #10b981)", border: "1px solid var(--green-ink, #10b981)", borderRadius: 5, padding: "0 4px" }}>LOCAL · FREE</span>}
                            </span>
                            <span style={{ color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
                              {fmtK(m.tokens)} tok{m.cost_usd != null && !m.free ? ` · $${m.cost_usd.toFixed(2)}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>}
                  {data.summary.unpriced_models && data.summary.unpriced_models.length > 0 && (
                    <div style={{ fontSize: 11, color: "var(--amber-ink, #b45309)", marginTop: 8 }}>
                      No price set for: {data.summary.unpriced_models.join(", ")} — cost undercounts. Add via ADMIN_MODEL_PRICES_JSON.
                    </div>
                  )}
                </div>
              </section>

              <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)", marginBottom: 22 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Endpoint cost breakdown</div>
                <ToolsTable tools={data.tools} />
              </section>
              <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)", marginBottom: 22 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Token usage per user</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 10 }}>Only users with token-instrumented calls.</div>
                <UsersTable users={data.users} />
              </section>
              <section style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Analysis activity by user</div>
                <ActivityTable byUser={data.activity?.by_user ?? []} />
              </section>
            </>
          )}

          {tab === "jobs" && (data.jobs
            ? <JobsPipelineSection jobs={data.jobs} tools={data.tools} />
            : <p style={{ color: "var(--dim)", fontSize: 13 }}>No jobs-pipeline data in this window.</p>)}

          {tab === "business" && (data.jobs
            ? <BusinessSection jobs={data.jobs} />
            : <p style={{ color: "var(--dim)", fontSize: 13 }}>No business data in this window.</p>)}
        </>
      )}
    </div>
  );
}
