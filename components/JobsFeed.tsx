"use client";

/**
 * JobsFeed — "Jobs for you" view (/?view=jobs).
 *
 * Fetches GET /api/jobs/feed: active ATS postings ranked against the user's
 * latest analyzed résumé by the backend's deterministic weighted JD scorer
 * (zero LLM tokens per request). The résumé IS the matching profile — there
 * is no separate profile form; filters here are client-side intent filters.
 *
 * Apply stays an external link to the company's real posting: Resunova never
 * submits applications on the user's behalf.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient, upsertUserProfile } from "@/lib/supabase";
import { loadProfile, saveProfile } from "@/lib/profileStorage";

type FeedJob = {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  postedAt: string | null;
  matchScore: number;
  matchedCount: number;
  totalRequirements: number;
  titleMatch: boolean;
  locationMatch: boolean;
};

type FeedState =
  | { status: "loading" }
  | { status: "no-resume" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: FeedJob[]; generatedAt: string; profileRoles: string[]; profileLocations: string[] };

const ROLE_CHIPS = [
  "Software Engineer", "Backend Engineer", "Frontend Engineer", "Full-Stack Engineer",
  "Data Engineer", "Data Scientist", "ML Engineer", "DevOps / SRE",
  "Product Manager", "Platform Engineer", "iOS / Android Engineer", "QA Engineer",
];

const SCORE_FILTERS = [
  { key: "all", label: "All matches", min: 0 },
  { key: "50", label: "50%+", min: 50 },
  { key: "70", label: "70%+", min: 70 },
] as const;

type ScoreFilterKey = (typeof SCORE_FILTERS)[number]["key"];

const AGE_FILTERS = [
  { key: "1", label: "Past 24h", days: 1 },
  { key: "7", label: "Past week", days: 7 },
  { key: "30", label: "Past month", days: 30 },
  { key: "all", label: "Any age", days: 0 },
] as const;

type AgeFilterKey = (typeof AGE_FILTERS)[number]["key"];

function scoreColors(score: number): { fg: string; bg: string } {
  if (score >= 70) return { fg: "var(--green-ink)", bg: "color-mix(in srgb, var(--green-ink) 12%, transparent)" };
  if (score >= 50) return { fg: "var(--amber-ink)", bg: "color-mix(in srgb, var(--amber-ink) 12%, transparent)" };
  return { fg: "var(--muted)", bg: "var(--surface2)" };
}

function formatSalary(job: FeedJob): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const cur = job.salaryCurrency === "USD" || !job.salaryCurrency ? "$" : `${job.salaryCurrency} `;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);
  const lo = job.salaryMin ?? job.salaryMax;
  const hi = job.salaryMax ?? job.salaryMin;
  if (lo == null || hi == null) return null;
  return lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(lo)}–${fmt(hi)}`;
}

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function JobsFeed() {
  const router = useRouter();
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [rolesOnly, setRolesOnly] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterKey>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilterKey>("30");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeRoles, setNudgeRoles] = useState<string[]>([]);
  const [nudgeSaving, setNudgeSaving] = useState(false);

  const toggleNudgeRole = useCallback((r: string) => {
    setNudgeRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }, []);

  const loadFeed = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
      const qs = days ? `?max_age_days=${days}` : "";
      const resp = await fetch(apiUrl(`/api/jobs/feed${qs}`), { headers });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // Only the backend's explicit "no saved analysis" codes mean the user
        // needs a scan — a bare 404 can be an API deploy that predates the route.
        if (resp.status === 404 && (body?.error === "no_resume_analysis" || body?.error === "no_resume_text")) {
          setState({ status: "no-resume" });
          return;
        }
        throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setState({
        status: "ready",
        jobs: Array.isArray(data?.jobs) ? data.jobs : [],
        generatedAt: data?.generatedAt || "",
        profileRoles: Array.isArray(data?.profileRoles) ? data.profileRoles : [],
        profileLocations: Array.isArray(data?.profileLocations) ? data.profileLocations : [],
      });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load jobs" });
    }
  }, [ageFilter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const handleNudgeSave = useCallback(async () => {
    if (!nudgeRoles.length) return;
    setNudgeSaving(true);
    try {
      const current = loadProfile();
      const next = { ...current, roles: nudgeRoles.join(", ") };
      saveProfile(next);
      await upsertUserProfile(next);
      setNudgeDismissed(true);
      void loadFeed();
    } finally {
      setNudgeSaving(false);
    }
  }, [nudgeRoles, loadFeed]);

  const trackApplyClick = useCallback(async (postingId: string) => {
    // Optimistically mark as applied immediately
    setAppliedIds((prev) => new Set(prev).add(postingId));
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      await fetch(apiUrl("/api/jobs/event"), {
        method: "POST",
        headers,
        body: JSON.stringify({ posting_id: postingId, event: "apply_click" }),
        keepalive: true,
      });
    } catch {
      // tracking must never break the UX; keep the applied mark
    }
  }, []);

  const visibleJobs = useMemo(() => {
    if (state.status !== "ready") return [];
    const q = search.trim().toLowerCase();
    const minScore = SCORE_FILTERS.find((f) => f.key === scoreFilter)?.min ?? 0;
    return state.jobs.filter((job) => {
      if (job.matchScore < minScore) return false;
      if (remoteOnly && !`${job.location} ${job.title}`.toLowerCase().includes("remote")) return false;
      if (rolesOnly && !job.titleMatch) return false;
      if (q && !`${job.title} ${job.company} ${job.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [state, search, remoteOnly, rolesOnly, scoreFilter]);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Jobs for you</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            Live openings ranked against your latest analyzed résumé. Apply on the company&apos;s site — we hand you the
            match, you make the call.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadFeed()} disabled={state.status === "loading"}>
          Refresh
        </Button>
      </div>

      {state.status === "ready" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "18px 0 14px" }}>
          {AGE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setAgeFilter(f.key)}
              style={{
                fontSize: 12.5,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid " + (ageFilter === f.key ? "var(--accent)" : "var(--surface2)"),
                background: ageFilter === f.key ? "var(--accent-bg)" : "transparent",
                color: ageFilter === f.key ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
          <span style={{ width: 1, height: 18, background: "var(--surface2)" }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, company, location…"
            style={{ maxWidth: 280 }}
          />
          {SCORE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setScoreFilter(f.key)}
              style={{
                fontSize: 12.5,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid " + (scoreFilter === f.key ? "var(--accent)" : "var(--surface2)"),
                background: scoreFilter === f.key ? "var(--accent-bg)" : "transparent",
                color: scoreFilter === f.key ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRemoteOnly((v) => !v)}
            style={{
              fontSize: 12.5,
              padding: "5px 12px",
              borderRadius: 999,
              border: "1px solid " + (remoteOnly ? "var(--accent)" : "var(--surface2)"),
              background: remoteOnly ? "var(--accent-bg)" : "transparent",
              color: remoteOnly ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
            }}
          >
            Remote
          </button>
          {state.status === "ready" && state.profileRoles.length > 0 && (
            <button
              type="button"
              onClick={() => setRolesOnly((v) => !v)}
              title={`Jobs matching: ${state.profileRoles.join(", ")}`}
              style={{
                fontSize: 12.5,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid " + (rolesOnly ? "var(--accent)" : "var(--surface2)"),
                background: rolesOnly ? "var(--accent-bg)" : "transparent",
                color: rolesOnly ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              🎯 Your roles
            </button>
          )}
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
            {visibleJobs.length} of {state.jobs.length} openings
          </span>
        </div>
      )}

      <div style={{ marginTop: state.status === "ready" && state.jobs.length > 0 ? 0 : 20 }}>
        {state.status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
            ))}
          </div>
        )}

        {state.status === "no-resume" && (
          <Card>
            <CardContent style={{ padding: "40px 28px", textAlign: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                Your résumé is your job-match profile
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "10px auto 18px", maxWidth: 440 }}>
                Run a résumé scan first — we&apos;ll use it to score every opening and rank the ones worth your time.
                No forms to fill out.
              </p>
              <Button onClick={() => router.push("/?view=analyze")}>Scan my résumé</Button>
            </CardContent>
          </Card>
        )}

        {state.status === "error" && (
          <Card>
            <CardContent style={{ padding: "32px 28px", textAlign: "center" }}>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 14px" }}>
                Couldn&apos;t load the job feed: {state.message}
              </p>
              <Button variant="outline" onClick={() => void loadFeed()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {state.status === "ready" && state.jobs.length === 0 && (
          <Card>
            <CardContent style={{ padding: "40px 28px", textAlign: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>No openings in this window</h2>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "10px auto 0", maxWidth: 440 }}>
                Try a wider posting-age filter above — the feed is restocked by daily scans of company career boards.
              </p>
            </CardContent>
          </Card>
        )}

        {state.status === "ready" && state.profileRoles.length === 0 && !nudgeDismissed && (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 14,
              border: "1.5px solid rgba(47,129,247,0.22)",
              background: "var(--surface)",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                  Tell us what you&apos;re targeting
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  We&apos;ll sort matching jobs to the top of your feed.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNudgeDismissed(true)}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {ROLE_CHIPS.map((r) => {
                const active = nudgeRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleNudgeRole(r)}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 20,
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "rgba(47,129,247,0.1)" : "var(--surface2)",
                      color: active ? "var(--accent)" : "var(--text)",
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    {active ? "✓ " : ""}{r}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { void handleNudgeSave(); }}
              disabled={!nudgeRoles.length || nudgeSaving}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "none",
                background: nudgeRoles.length ? "var(--accent)" : "var(--surface2)",
                color: nudgeRoles.length ? "#fff" : "var(--dim)",
                fontSize: 13,
                fontWeight: 600,
                cursor: nudgeRoles.length && !nudgeSaving ? "pointer" : "default",
                fontFamily: "inherit",
                boxShadow: nudgeRoles.length ? "0 2px 10px rgba(47,129,247,0.28)" : "none",
              }}
            >
              {nudgeSaving ? "Saving…" : "Save preferences →"}
            </button>
          </div>
        )}

        {state.status === "ready" && state.jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleJobs.map((job) => {
              const colors = scoreColors(job.matchScore);
              const salary = formatSalary(job);
              const posted = formatPostedAt(job.postedAt);
              return (
                <Card
                  key={job.id}
                  onClick={() => router.push(`/?view=jobs&job=${encodeURIComponent(job.id)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <CardContent
                    style={{
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      title={`Matches ${job.matchedCount} of ${job.totalRequirements} extracted requirements`}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: colors.bg,
                        color: colors.fg,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{job.matchScore}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.85 }}>MATCH</span>
                    </div>
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>{job.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500 }}>{job.company}</span>
                        {job.location && <span>· {job.location}</span>}
                        {posted && <span>· {posted}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                        <Badge variant="secondary" style={{ fontSize: 11 }}>
                          {job.matchedCount}/{job.totalRequirements} requirements
                        </Badge>
                        {salary && (
                          <Badge variant="secondary" style={{ fontSize: 11 }}>
                            {salary}/yr
                          </Badge>
                        )}
                        {job.titleMatch && (
                          <Badge
                            style={{
                              fontSize: 11,
                              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                              color: "var(--accent)",
                              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                            }}
                          >
                            🎯 Target role
                          </Badge>
                        )}
                      </div>
                    </div>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.stopPropagation(); void trackApplyClick(job.id); }}
                      style={{
                        flexShrink: 0,
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "7px 14px",
                        borderRadius: 8,
                        border: appliedIds.has(job.id)
                          ? "1px solid color-mix(in srgb, var(--green-ink) 35%, transparent)"
                          : "1px solid var(--surface2)",
                        color: appliedIds.has(job.id) ? "var(--green-ink)" : "var(--text)",
                        background: appliedIds.has(job.id)
                          ? "color-mix(in srgb, var(--green-ink) 10%, transparent)"
                          : "transparent",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: "color 0.15s, border-color 0.15s, background 0.15s",
                      }}
                    >
                      {appliedIds.has(job.id) ? "Applied ✓" : "View & apply ↗"}
                    </a>
                  </CardContent>
                </Card>
              );
            })}
            {visibleJobs.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "28px 0" }}>
                No openings match the current filters.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
