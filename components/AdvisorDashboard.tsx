"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSignInDialog } from "@/components/SignInDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ScoreLineChart,
  ScoreBarChart,
  DimensionTrendChart,
  buildBarEntries,
  weakestDimKeys,
  type CategoryHistoryPoint,
} from "@/components/advisor/AdvisorCharts";
import AdminAnalyticsPanel from "@/components/AdminAnalyticsPanel";
import SendTestEmailCard from "@/components/admin/SendTestEmailCard";
import { AdminKpiCard, AdminBarRows, AdminScoreBars, AdminStackedBar } from "@/components/admin/charts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DimAvgs {
  readability: number | null;
  atsCompatibility: number | null;
  jobMatch: number | null;
  achievementQuality: number | null;
  quantification: number | null;
  sectionStructure: number | null;
  languageQuality: number | null;
  technicalBranding: number | null;
}

interface ScoreTiers { low: number; mid: number; good: number; strong: number; }
interface WeakDim    { dimension: string; avg: number; }
interface TopIssue   { issue: string; count: number; }

interface Student {
  user_id: string;
  user_email?: string;
  latest_score: number | null;
  first_score?: number | null;
  score_delta?: number | null;
  latest_at: string | null;
  analysis_count: number;
}

interface CohortStats {
  student_count: number;
  analysis_count: number;
  tailored_resume_count?: number;
  avg_overall: number | null;
  score_tiers: ScoreTiers;
  dimension_avgs: DimAvgs;
  weakest_dims: WeakDim[];
  top_issues: TopIssue[];
  student_roster: Student[];
  global_admin?: boolean;
  generated_at: string;
}

interface BugReportRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  category: string | null;
  title: string | null;
  description: string | null;
  page_url: string | null;
  created_at: string | null;
}

interface ScorePoint { date: string | null; score: number | null; label: string | null; }

interface ResumeEntry { folder: string; company: string; role: string; score: number | null; pdf_url: string | null; created_at: string | null; }

interface StudentDetail {
  student_id: string;
  user_email: string | null;
  analysis_count: number;
  first_score: number | null;
  latest_score: number | null;
  score_delta: number | null;
  score_history: ScorePoint[];
  category_history?: CategoryHistoryPoint[];
  dim_avgs: DimAvgs;
  top_issues: TopIssue[];
  latest_strengths: string[];
  latest_category_scores: Record<string, number | null>;
  resumes: ResumeEntry[];
  latest_resume_text: string;
  latest_source_pdf_url?: string | null;
  latest_source_filename?: string | null;
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  matchScore: number | null;
  matchedCount: number;
  totalRequirements: number;
}

interface JobMatchesResponse {
  jobs: JobMatch[];
  ranked: boolean;
  needsResume?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  readability:        "Readability",
  atsCompatibility:   "ATS Compatibility",
  jobMatch:           "Job Match",
  achievementQuality: "Achievement Quality",
  quantification:     "Quantification",
  sectionStructure:   "Section Structure",
  languageQuality:    "Language Quality",
  technicalBranding:  "Field Branding",
};

function scoreColor(s: number | null): string {
  if (s === null) return "var(--dim)";
  if (s >= 75) return "var(--green)";
  if (s >= 55) return "var(--amber)";
  return "var(--red)";
}

function scoreBg(s: number | null): string {
  if (s === null) return "transparent";
  if (s >= 75) return "var(--green-bg)";
  if (s >= 55) return "var(--amber-bg)";
  return "var(--red-bg)";
}

function fmt(d: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

function pluralStudents(count: number): string {
  return count === 1 ? "student" : "students";
}

function resolvePublicPdfUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return apiUrl(url.startsWith("/") ? url : `/${url}`);
}

function StudentPdfEmbed({ url, title }: { url: string; title: string }) {
  const src = resolvePublicPdfUrl(url);
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--surface2)",
        marginBottom: 10,
      }}
    >
      <embed
        src={`${src}#view=FitH`}
        type="application/pdf"
        title={title}
        style={{ width: "100%", height: 360, display: "block" }}
      />
    </div>
  );
}

function fmtRelative(d: string | null): string {
  if (!d) return "—";
  try {
    const now = Date.now();
    const then = new Date(d).getTime();
    const diffMs = Math.max(0, now - then);
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(diffMs / dayMs);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return fmt(d);
  } catch {
    return d;
  }
}

type StudentStatus = "Needs Work" | "Improving" | "Ready" | "On Track" | "No Analysis Yet";

function studentStatus(student: Student): StudentStatus {
  if ((student.analysis_count ?? 0) <= 0 || student.latest_score === null) return "No Analysis Yet";

  const count = student.analysis_count ?? 0;
  const delta = student.score_delta;
  const hasTrend = count >= 2 && typeof delta === "number";

  if (hasTrend && delta > 0) return "Improving";
  if (hasTrend && delta < 0) return "Needs Work";
  if (student.latest_score < 65) return "Needs Work";
  if (student.latest_score >= 80) return "Ready";
  return "On Track";
}

function studentPriority(student: Student): number {
  const status = studentStatus(student);
  if (status === "Needs Work") return 0;
  if (status === "No Analysis Yet") return 1;
  if (status === "Improving") return 2;
  if (status === "On Track") return 3;
  return 4;
}

// ── roster column sorting ────────────────────────────────────────────────────

type RosterSortKey = "email" | "score" | "status" | "latest_at" | "analyses";
type RosterSort = { key: RosterSortKey; dir: 1 | -1 };

/** Per-column comparable value. Nulls sort to the bottom regardless of
 *  direction via the fallback sentinels; status uses the review-priority order
 *  (Needs Work first when ascending), not alphabetical. */
function rosterSortValue(s: Student, key: RosterSortKey): number | string {
  switch (key) {
    case "email": return (s.user_email ?? "￿").toLowerCase();
    case "score": return s.latest_score ?? -1;
    case "status": return studentPriority(s);
    case "latest_at": return s.latest_at ? Date.parse(s.latest_at) || 0 : 0;
    case "analyses": return s.analysis_count ?? 0;
  }
}

function SortableHead({ label, k, sort, onSort }: {
  label: string; k: RosterSortKey; sort: RosterSort; onSort: (k: RosterSortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <TableHead aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex cursor-pointer select-none items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        <span aria-hidden className={active ? "text-foreground" : "opacity-25"}>
          {active && sort.dir === 1 ? "▲" : "▼"}
        </span>
      </button>
    </TableHead>
  );
}

function reviewReason(student: Student): string {
  const status = studentStatus(student);
  const delta = student.score_delta;
  if (status === "No Analysis Yet") return "No completed analysis yet";
  if (status === "Improving" && typeof delta === "number") {
    return `Score up ${delta > 0 ? "+" : ""}${delta} since first analysis`;
  }
  if (status === "Needs Work" && typeof delta === "number" && delta < 0) {
    return `Score down ${Math.abs(delta)} since first analysis`;
  }
  if (status === "Needs Work") return "Low latest score";
  if (status === "On Track") {
    return (student.analysis_count ?? 0) < 2
      ? "One analysis — run again to measure progress"
      : "Latest score steady between runs";
  }
  return "Strong profile, periodic check only";
}

async function advisorAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

// ── Module-level cache ────────────────────────────────────────────────────────
// The root RouterView unmounts this dashboard on every page switch (?view=…),
// so component state dies with it. Keep the loaded cohort payload + active tab
// here so returning to the page restores instantly (with a silent background
// refresh) instead of replaying the full skeleton + refetch cycle.
let cohortCache: { uid: string; data: CohortStats; globalAdmin: boolean } | null = null;
let advisorTabCache: "cohort" | "analytics" = "cohort";

function clearCohortCache() {
  cohortCache = null;
  advisorTabCache = "cohort";
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </div>
  );
}

// Delegates to the shared admin KPI card so the cohort strip and student-detail
// KPIs match the analytics / job-market tabs exactly (label/figure/sub scale).
function KpiCard({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return <AdminKpiCard title={label} value={value} sub={note} />;
}

function AdvisorCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <SectionLabel>{title}</SectionLabel>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant={score >= 75 ? "secondary" : score >= 55 ? "outline" : "destructive"} style={{ color: scoreColor(score), background: scoreBg(score) }}>
      {score}
    </Badge>
  );
}

// ── Student Detail Panel ──────────────────────────────────────────────────────

function matchTier(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Strong", color: "var(--green, #15803d)" };
  if (score >= 70) return { label: "Good",   color: "var(--green, #15803d)" };
  if (score >= 50) return { label: "Fair",   color: "var(--amber, #b45309)" };
  return { label: "Weak", color: "var(--dim, #6b7280)" };
}

function StudentJobMatches({ loading, data }: { loading: boolean; data: JobMatchesResponse | null }) {
  if (loading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }
  if (!data || data.needsResume) {
    return <p style={{ fontSize: 13, color: "var(--dim)" }}>No analyzed résumé yet — ranking needs at least one résumé analysis.</p>;
  }
  if (!data.jobs.length) {
    return <p style={{ fontSize: 13, color: "var(--dim)" }}>No matching postings found in the current job corpus.</p>;
  }
  return (
    <div className="flex flex-col">
      {data.jobs.map((j, i) => {
        const score = j.matchScore ?? 0;
        const tier = matchTier(score);
        return (
          <div key={j.id ?? i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
            <div className="w-10 shrink-0 text-center">
              <div className="text-sm font-semibold text-foreground">{score}</div>
              <div className="text-[10px] font-medium" style={{ color: tier.color }}>{tier.label}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-foreground">{j.title || "—"}</div>
              <div className="truncate text-xs text-muted-foreground">
                {j.company || "—"}{j.location ? ` · ${j.location}` : ""}
                {j.totalRequirements > 0 ? ` · ${j.matchedCount}/${j.totalRequirements} reqs` : ""}
              </div>
            </div>
            {j.url ? (
              <a
                href={j.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StudentDetailPanel({
  studentId, onBack,
}: { studentId: string; onBack: () => void }) {
  const [detail, setDetail]   = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [matches, setMatches] = useState<JobMatchesResponse | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    advisorAuthHeaders()
      .then(headers => fetch(`${apiUrl("/api/student-detail")}?student_id=${encodeURIComponent(studentId)}`, { headers }))
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? `HTTP ${r.status}`)))
      .then(d => { if (!cancelled) setDetail(d as StudentDetail); })
      .catch(e => { if (!cancelled) setError(typeof e === "string" ? e : "Failed to load."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  // Top matched jobs — separate lazy fetch so the detail panel never blocks on
  // the (deterministic, zero-LLM) résumé→jobs scoring.
  useEffect(() => {
    let cancelled = false;
    setMatchesLoading(true);
    setMatches(null);
    advisorAuthHeaders()
      .then(headers => fetch(`${apiUrl("/api/student-job-matches")}?student_id=${encodeURIComponent(studentId)}&limit=10`, { headers }))
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) setMatches(d as JobMatchesResponse); })
      .catch(() => { if (!cancelled) setMatches({ jobs: [], ranked: false }); })
      .finally(() => { if (!cancelled) setMatchesLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  return (
    <div className="mx-auto max-w-[1060px] px-8 py-10 pb-24">

      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-7 px-0 text-muted-foreground hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to cohort
      </Button>

      {loading && (
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: "var(--red, #991b1b)" }}>{error}</p>}

      {detail && (() => {
        const d = detail;
        const delta = d.score_delta;
        return (
          <>
            {/* Header */}
            <div className="mb-8">
              <Badge variant="outline" className="mb-3">Student profile</Badge>
              <h2 className="m-0 text-xl font-medium tracking-[-0.03em] text-foreground">
                {d.user_email ?? "Anonymous student"}
              </h2>
            </div>

            {/* KPIs */}
            <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-4">
              <KpiCard value={d.analysis_count} label="Analyses run" />
              <KpiCard value={d.first_score ?? "—"} label="Starting score" />
              <KpiCard value={d.latest_score ?? "—"} label="Current score" />
              <KpiCard
                value={delta !== null ? `${delta > 0 ? "+" : ""}${delta}` : "—"}
                label="Improvement"
                note={delta !== null && delta > 0 ? "Trending up" : delta !== null && delta < 0 ? "Trending down" : "No change yet"}
              />
            </div>

            {/* Charts — score line, latest breakdown, averages, trends */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AdvisorCard title="Score history" description="Overall score across every analysis run">
                <ScoreLineChart history={d.score_history} />
              </AdvisorCard>

              <AdvisorCard title="Latest run breakdown" description="Category scores from the most recent analysis">
                <ScoreBarChart
                  entries={buildBarEntries(d.latest_category_scores, DIM_LABELS, Object.keys(DIM_LABELS))}
                  emptyMessage="No category scores on the latest run."
                />
              </AdvisorCard>

              <AdvisorCard title="Average by dimension" description="Mean score per category across all runs">
                <ScoreBarChart
                  entries={Object.entries(DIM_LABELS).map(([key, label]) => ({
                    key,
                    label,
                    value: d.dim_avgs[key as keyof DimAvgs],
                  }))}
                  emptyMessage="No dimension averages yet."
                />
              </AdvisorCard>

              <AdvisorCard
                title="Dimension trends"
                description="Weakest categories over time (needs 2+ analyses)"
              >
                <DimensionTrendChart
                  history={d.category_history ?? []}
                  dimLabels={DIM_LABELS}
                  focusKeys={weakestDimKeys(
                    Object.fromEntries(
                      Object.entries(DIM_LABELS).map(([k]) => [k, d.dim_avgs[k as keyof DimAvgs]]),
                    ),
                  )}
                />
              </AdvisorCard>
            </div>

            {/* Issues + Strengths */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

              <AdvisorCard title="Recurring issues">
                {d.top_issues.length === 0
                  ? <p style={{ fontSize: 13, color: "var(--dim)" }}>None detected.</p>
                  : d.top_issues.map((item, i) => {
                      const max = d.top_issues[0]?.count || 1;
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: "var(--text)" }}>{item.issue}</span>
                            <span style={{ color: "var(--dim)" }}>{item.count}×</span>
                          </div>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
                            <div style={{ width: `${(item.count / max) * 100}%`, height: "100%", background: "var(--dim)", borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })
                }
              </AdvisorCard>

              <AdvisorCard title="Latest strengths">
                {d.latest_strengths.length === 0
                  ? <p style={{ fontSize: 13, color: "var(--dim)" }}>No strengths recorded yet.</p>
                  : d.latest_strengths.map((s, i) => (
                      <div key={i} className="border-b border-border py-2 text-sm leading-relaxed text-muted-foreground last:border-b-0">
                        {s}
                      </div>
                    ))
                }
              </AdvisorCard>
            </div>

            {/* Top matched jobs — résumé ranked against the live posting corpus */}
            <AdvisorCard
              title="Top matched jobs"
              description="Active postings ranked against this student's latest résumé (deterministic, no LLM)."
              className="mb-4"
            >
              <StudentJobMatches loading={matchesLoading} data={matches} />
            </AdvisorCard>

            {/* Uploaded résumé — PDF when stored (Analyze uploads), else extracted text */}
            {(d.latest_source_pdf_url || d.latest_resume_text) && (
              <AdvisorCard
                title={d.latest_source_pdf_url ? "Latest uploaded résumé (PDF)" : "Latest uploaded résumé"}
                className="mb-4"
              >
                {d.latest_source_pdf_url ? (
                  <>
                    {d.latest_source_filename ? (
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)" }}>
                        {d.latest_source_filename}
                      </p>
                    ) : null}
                    <StudentPdfEmbed url={d.latest_source_pdf_url} title="Student résumé PDF" />
                    <a
                      href={resolvePublicPdfUrl(d.latest_source_pdf_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Open PDF in new tab
                    </a>
                  </>
                ) : (
                  <pre style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "var(--text)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 320,
                    overflowY: "auto",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "12px 14px",
                  }}>
                    {d.latest_resume_text}
                  </pre>
                )}
              </AdvisorCard>
            )}

            {/* Tailored resumes */}
            {d.resumes.length > 0 && (
              <AdvisorCard title="Tailored résumés" className="mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Job-fit Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.resumes.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-foreground">{r.role || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.company || "—"}</TableCell>
                        <TableCell>{r.score !== null ? <ScoreBadge score={r.score} /> : <Badge variant="outline">—</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmt(r.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {r.pdf_url ? (
                            <a
                              href={r.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                              Download PDF
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No PDF</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdvisorCard>
            )}
          </>
        );
      })()}
    </div>
  );
}

const BUG_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  analyze: "Analyze / scoring",
  tailor: "Tailor / builder",
  export: "PDF export",
  auth: "Login / account",
  performance: "Slow / crash",
  other: "Other",
};

function BugReportsPanel({
  reports,
  loading,
  error,
  onRefresh,
}: {
  reports: BugReportRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <Card className="mb-4 border-amber-500/30">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2 w-fit">Platform admin only</Badge>
          <CardTitle className="text-lg">Bug reports</CardTitle>
          <CardDescription>
            User-submitted feedback from the in-app report dialog. Not visible to institution advisors.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh reports"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && reports.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bug reports yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Page</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtRelative(r.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {BUG_CATEGORY_LABELS[r.category ?? ""] ?? r.category ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <div className="text-sm font-medium text-foreground">{r.title ?? "—"}</div>
                    {r.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.user_email ?? (r.user_id ? `${String(r.user_id).slice(0, 8)}…` : "Anonymous")}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs">
                    {r.page_url ? (
                      <a
                        href={r.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                        title={r.page_url}
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Cohort Overview ───────────────────────────────────────────────────────────

function CohortOverview({
  data,
  globalAdmin,
  bugReports,
  bugReportsLoading,
  bugReportsError,
  onRefreshBugReports,
  onRefresh,
  onSelectStudent,
}: {
  data: CohortStats;
  globalAdmin: boolean;
  bugReports: BugReportRow[];
  bugReportsLoading: boolean;
  bugReportsError: string | null;
  onRefreshBugReports: () => void;
  onRefresh: () => void;
  onSelectStudent: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  // Restore the last-open tab across remounts (page switches unmount us).
  // Non-admins never render the analytics tab, so force them onto cohort.
  const [activeTab, setActiveTab] = useState<"cohort" | "analytics">(
    globalAdmin ? advisorTabCache : "cohort",
  );
  useEffect(() => { advisorTabCache = activeTab; }, [activeTab]);
  const { score_tiers: tiers } = data;
  const tierTotal = tiers.low + tiers.mid + tiers.good + tiers.strong;
  const needAttentionCount = data.student_roster.filter(s => {
    const status = studentStatus(s);
    return status === "Needs Work" || status === "No Analysis Yet";
  }).length;
  const topImprovementAreas = data.top_issues.slice(0, 5);
  const studentsNeedingReview = [...data.student_roster]
    .sort((a, b) => {
      const p = studentPriority(a) - studentPriority(b);
      if (p !== 0) return p;
      const as = a.latest_score ?? -1;
      const bs = b.latest_score ?? -1;
      if (as !== bs) return as - bs;
      return (new Date(a.latest_at || 0).getTime()) - (new Date(b.latest_at || 0).getTime());
    })
    .filter(s => {
      const status = studentStatus(s);
      return status === "Needs Work" || status === "No Analysis Yet" || status === "Improving" || status === "On Track";
    })
    .slice(0, 6);
  // Roster sort: default = most recent activity first. Clicking a header
  // toggles direction; switching columns starts with that column's natural
  // direction (text/status ascending, numbers/dates descending).
  const [rosterSort, setRosterSort] = useState<RosterSort>({ key: "latest_at", dir: -1 });
  const onRosterSort = useCallback((k: RosterSortKey) => {
    setRosterSort(prev => prev.key === k
      ? { key: k, dir: prev.dir === 1 ? -1 : 1 }
      : { key: k, dir: k === "email" || k === "status" ? 1 : -1 });
  }, []);
  const filtered = useMemo(() => {
    const rows = data.student_roster.filter(s =>
      !search || (s.user_email ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const { key, dir } = rosterSort;
    return rows.sort((a, b) => {
      const av = rosterSortValue(a, key);
      const bv = rosterSortValue(b, key);
      const cmp = typeof av === "string"
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
      if (cmp !== 0) return cmp * dir;
      // Stable tiebreak: email A→Z so equal rows don't jump between clicks.
      return (a.user_email ?? "").localeCompare(b.user_email ?? "");
    });
  }, [data.student_roster, search, rosterSort]);
  const isEmpty = data.student_count === 0 && data.analysis_count === 0;

  return (
    <div className="mx-auto max-w-[1060px] px-8 py-10 pb-24">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3">
            {globalAdmin ? "Platform admin" : "UMBC Advisor View"}
          </Badge>
          <h1 className="m-0 text-2xl font-medium tracking-[-0.04em] text-foreground">Advisor Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {globalAdmin
              ? "Cohort analytics across all institutions."
              : "Resume insights based on UMBC Career Center guidelines."}
          </p>
          <div className="mt-2 text-xs text-muted-foreground">Updated {fmt(data.generated_at)}</div>
        </div>
        <div className="flex items-center gap-2">
          {globalAdmin && (
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button
                onClick={() => setActiveTab("cohort")}
                className={`px-4 py-1.5 transition-colors ${activeTab === "cohort" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                Cohort
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-1.5 transition-colors ${activeTab === "analytics" ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"}`}
              >
                Platform analytics
              </button>
            </div>
          )}
          {activeTab === "cohort" && (
            <Button onClick={onRefresh} variant="outline" size="sm">Refresh</Button>
          )}
        </div>
      </div>

      {/* ── Platform Analytics tab (global admins only) ── */}
      {globalAdmin && activeTab === "analytics" && (
        <div className="flex flex-col gap-6">
          <AdminAnalyticsPanel getAuthHeaders={advisorAuthHeaders} />
          <SendTestEmailCard getAuthHeaders={advisorAuthHeaders} />
          {/* Bug reports are a platform-support inbox, not cohort data — they
              belong here under Platform analytics, not the Cohort tab. */}
          <BugReportsPanel
            reports={bugReports}
            loading={bugReportsLoading}
            error={bugReportsError}
            onRefresh={onRefreshBugReports}
          />
        </div>
      )}

      {/* ── Cohort tab ── */}
      {activeTab === "cohort" && (<>

      <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-5">
        <KpiCard
          value={data.student_count}
          label={data.student_count === 1 ? "Total Student" : "Total Students"}
          note="Unique accounts"
        />
        <KpiCard value={data.analysis_count} label="Analyzed Resumes" />
        <KpiCard value={data.avg_overall !== null ? Math.round(data.avg_overall) : "—"} label="Average Resume Score" note="Out of 100" />
        <KpiCard
          value={needAttentionCount}
          label={needAttentionCount === 1 ? "Student Needing Attention" : "Students Needing Attention"}
        />
        <KpiCard value={data.tailored_resume_count ?? 0} label="Tailored Resumes Created" />
      </div>

      {isEmpty && (
        <Card className="mb-4 border-dashed">
          <CardHeader>
            <SectionLabel>No student data yet</SectionLabel>
            <CardDescription>
              Once students analyze resumes, this dashboard will show readiness, common improvement areas, review queue, and student roster actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>Check again</Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdvisorCard title="Resume readiness" description="How the cohort's latest scores split across tiers.">
          {tierTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              No student data yet. Invite students or wait for their first resume analysis.
            </p>
          ) : (
            <AdminStackedBar
              segments={[
                { label: "Strong (85-100)", value: tiers.strong, color: "var(--green)" },
                { label: "Good (70-84)", value: tiers.good, color: "var(--accent)" },
                { label: "Mid (50-69)", value: tiers.mid, color: "var(--amber)" },
                { label: "Needs work (<50)", value: tiers.low, color: "var(--red)" },
              ]}
            />
          )}
        </AdvisorCard>

        <AdvisorCard title="Top improvement areas" description="Most frequent weaknesses across students.">
          {topImprovementAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <AdminBarRows
              data={topImprovementAreas.map(item => [item.issue, item.count] as [string, number])}
              labelWidth={150}
            />
          )}
        </AdvisorCard>
      </div>

      <AdvisorCard
        title={studentsNeedingReview.length === 1 ? "Student needing review" : "Students needing review"}
        description="Prioritized queue for advisor follow-up."
        className="mb-4"
      >
        {studentsNeedingReview.length === 0 ? (
          <p className="text-sm text-muted-foreground">No urgent reviews right now.</p>
        ) : (
          studentsNeedingReview.map((s) => {
            const status = studentStatus(s);
            return (
              <div
                key={s.user_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{s.user_email ?? "Anonymous student"}</div>
                  <div className="text-xs text-muted-foreground">{reviewReason(s)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={s.latest_score} />
                  <Badge variant={status === "Needs Work" ? "destructive" : status === "Improving" ? "secondary" : status === "Ready" ? "secondary" : "outline"}>
                    {status}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onSelectStudent(s.user_id)}>
                    {status === "Needs Work" ? "Review" : "View"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </AdvisorCard>

      <AdvisorCard title="Dimension averages" description="Cohort-level category health, scored 0-100." className="mb-4">
        <AdminScoreBars
          data={Object.entries(DIM_LABELS).map(([k, label]) => ({
            label,
            score: data.dimension_avgs[k as keyof DimAvgs],
          }))}
          colorFn={scoreColor}
        />
      </AdvisorCard>

      <Card>
        <CardHeader>
          <SectionLabel>Student roster</SectionLabel>
          <CardDescription>Search and open student detail quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email"
              className="w-[240px]"
            />
            <div className="text-xs text-muted-foreground">
              {filtered.length} {pluralStudents(filtered.length)}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No students found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Student" k="email" sort={rosterSort} onSort={onRosterSort} />
                  <SortableHead label="Latest Score" k="score" sort={rosterSort} onSort={onRosterSort} />
                  <SortableHead label="Status" k="status" sort={rosterSort} onSort={onRosterSort} />
                  <SortableHead label="Last Activity" k="latest_at" sort={rosterSort} onSort={onRosterSort} />
                  <SortableHead label="Analyses" k="analyses" sort={rosterSort} onSort={onRosterSort} />
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const status = studentStatus(s);
                  return (
                    <TableRow key={s.user_id}>
                      <TableCell className="text-sm text-foreground">
                        {s.user_email ?? <span className="italic text-muted-foreground">anonymous</span>}
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={s.latest_score} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === "Needs Work" ? "destructive" : status === "Improving" ? "secondary" : status === "Ready" ? "secondary" : "outline"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtRelative(s.latest_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.analysis_count}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => onSelectStudent(s.user_id)}>
                          {status === "Needs Work" ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
        Dashboard flow: overview → trend hotspots → students needing review → student roster lookup.
      </div>
    </>)}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  const [userEmail,  setUserEmail]  = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Seed from the module cache so a remount (page switch away and back) shows
  // the dashboard immediately instead of a skeleton; a background refresh
  // still runs once the session resolves.
  const [data,       setData]       = useState<CohortStats | null>(() => cohortCache?.data ?? null);
  const [loading,    setLoading]    = useState(!cohortCache);
  const [error,      setError]      = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalAdmin, setGlobalAdmin] = useState(cohortCache?.globalAdmin ?? false);
  const [bugReports, setBugReports] = useState<BugReportRow[]>([]);
  const [bugReportsLoading, setBugReportsLoading] = useState(false);
  const [bugReportsError, setBugReportsError] = useState<string | null>(null);
  const { openSignIn } = useSignInDialog();
  const authUserIdRef = useRef<string | null>(null);

  const loadBugReports = useCallback(async () => {
    setBugReportsLoading(true);
    setBugReportsError(null);
    try {
      const resp = await fetch(apiUrl("/api/admin/bug-reports?limit=50"), {
        headers: await advisorAuthHeaders(),
      });
      if (resp.status === 403) {
        setBugReports([]);
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json() as { reports?: BugReportRow[] };
      setBugReports(payload.reports ?? []);
    } catch (e) {
      setBugReportsError(e instanceof Error ? e.message : "Failed to load bug reports.");
      setBugReports([]);
    } finally {
      setBugReportsLoading(false);
    }
  }, []);

  const load = useCallback(async (opts?: { keepStale?: boolean }) => {
    if (!opts?.keepStale) {
      setLoading(true);
    }
    setError(null);
    try {
      const resp = await fetch(apiUrl("/api/cohort-stats"), { headers: await advisorAuthHeaders() });
      if (resp.status === 401) { setError("not_signed_in"); setData(null); clearCohortCache(); return; }
      if (resp.status === 403) { setError("not_authorized"); setData(null); clearCohortCache(); return; }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const stats = await resp.json() as CohortStats;
      setData(stats);
      const isAdmin = !!stats.global_admin;
      setGlobalAdmin(isAdmin);
      if (authUserIdRef.current) {
        cohortCache = { uid: authUserIdRef.current, data: stats, globalAdmin: isAdmin };
      }
      if (isAdmin) void loadBugReports();
      else {
        setBugReports([]);
        setBugReportsError(null);
      }
    } catch (e) {
      // A failed *background* refresh must not replace already-rendered data
      // with an error card — keep showing the stale payload.
      if (!opts?.keepStale) setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [loadBugReports]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    const applySession = (session: { user?: { id?: string; email?: string | null } } | null) => {
      const uid = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      setAuthChecked(true);
      if (!uid) {
        authUserIdRef.current = null;
        clearCohortCache();
        setData(null);
        setSelectedId(null);
        setLoading(false);
        return;
      }
      const userChanged = authUserIdRef.current !== null && authUserIdRef.current !== uid;
      authUserIdRef.current = uid;
      if (userChanged) {
        clearCohortCache();
        setData(null);
        setGlobalAdmin(false);
        setSelectedId(null);
        void load();
      }
    };

    supabase.auth.getSession()
      .then(({ data: d }) => {
        if (cancelled) return;
        applySession(d.session);
        const uid = d.session?.user?.id;
        if (!uid) return;
        if (cohortCache && cohortCache.uid !== uid) {
          // Cache belongs to a different account — wipe and load fresh.
          clearCohortCache();
          setData(null);
          setGlobalAdmin(false);
          void load();
        } else {
          // Cache hit → refresh silently behind the rendered data;
          // cold start → normal skeleton load.
          void load({ keepStale: !!cohortCache });
        }
      })
      .catch(() => {
        if (cancelled) return;
        applySession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        applySession(null);
        return;
      }
      const prevUid = authUserIdRef.current;
      applySession(session); // handles the user-switch reload itself
      // supabase-js re-emits SIGNED_IN on tab refocus / session recovery for
      // the SAME user. Reloading there blanked the dashboard to a skeleton and
      // reset the active tab — only load on a genuinely new sign-in.
      const uid = session?.user?.id ?? null;
      if (event === "SIGNED_IN" && uid && prevUid === null) {
        void load({ keepStale: cohortCache?.uid === uid });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once auth wiring; load is stable
  }, []);

  // Recover if cohort data was cleared while the user is still signed in (e.g. race on mount).
  useEffect(() => {
    if (!authChecked || !userEmail || loading || error || data) return;
    void load();
  }, [authChecked, userEmail, loading, error, data, load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!authChecked || !userEmail || loading || error) return;
      if (!data) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authChecked, userEmail, loading, error, data, load]);

  if (loading) return (
    <div className="mx-auto grid min-h-[60vh] max-w-[760px] content-center gap-4 px-8">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );

  if (error === "not_signed_in" || (authChecked && !userEmail)) return (
    <Card className="mx-auto mt-24 max-w-[480px]">
      <CardHeader>
        <Badge variant="outline" className="w-fit">Google sign-in required</Badge>
        <CardTitle>Sign in to open the advisor dashboard.</CardTitle>
        <CardDescription>
          UMBC advisors use their Google account so access can be checked against the institution roster.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent>
        <Button onClick={() => openSignIn({ title: "Sign in to open the advisor dashboard", reason: "UMBC advisors use their Google account so access can be checked against the institution roster." })}>
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );

  if (error === "not_authorized") return (
    <Card className="mx-auto mt-24 max-w-[520px]">
      <CardHeader>
        <Badge variant="outline" className="w-fit">Advisor access not enabled</Badge>
        <CardTitle>This account is not on the advisor roster.</CardTitle>
        <CardDescription>
          You are signed in as <span className="text-foreground">{userEmail}</span>. Advisor dashboards are only shown
          to approved institution accounts. Sign in with an approved UMBC advisor email, or ask an administrator to add
          this email to the advisor access list.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void getSupabaseClient().auth.signOut()}>
          Sign out
        </Button>
        <Button variant="ghost" onClick={() => userEmail && void load()}>
          Check again
        </Button>
      </CardContent>
    </Card>
  );

  if (error) return (
    <Card className="mx-auto mt-24 max-w-[480px]">
      <CardHeader>
        <Badge variant="destructive" className="w-fit">Could not load dashboard</Badge>
        <CardDescription>{error}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => userEmail && void load()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );

  if (!data) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-[760px] content-center gap-4 px-8">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (selectedId) {
    return (
      <StudentDetailPanel
        studentId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <CohortOverview
      data={data}
      globalAdmin={globalAdmin}
      bugReports={bugReports}
      bugReportsLoading={bugReportsLoading}
      bugReportsError={bugReportsError}
      onRefreshBugReports={() => void loadBugReports()}
      onRefresh={() => userEmail && void load()}
      onSelectStudent={setSelectedId}
    />
  );
}
