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

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient, upsertUserProfile } from "@/lib/supabase";
import { loadProfile, saveProfile } from "@/lib/profileStorage";
import { fetchJobDetail, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import {
  fetchJobFilters,
  createJobFilter,
  deleteJobFilter,
  type SavedFilter,
  type FilterSnapshot,
} from "@/lib/jobFiltersApi";
import CompanyLogo from "@/components/CompanyLogo";
import BoostPanel from "@/components/BoostPanel";

type FeedJob = {
  id: string;
  title: string;
  company: string;
  companySlug?: string;
  companyDomain?: string;
  url: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salarySource: string | null;
  workModel: string | null;
  seniority: string | null;
  visaSponsorship: string | null;
  employmentType: string | null;
  industry: string | null;
  minYears: number | null;
  h1bSponsor: boolean | null;
  h1bCertifiedCount: number | null;
  h1bMedianWage: number | null;
  postedAt: string | null;
  matchScore: number | null;
  matchedCount: number;
  totalRequirements: number;
  titleMatch: boolean;
  locationMatch: boolean;
};

type FeedState =
  | { status: "loading" }
  | { status: "no-resume" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: FeedJob[]; generatedAt: string; profileRoles: string[]; profileLocations: string[]; ranked: boolean };

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

const WORK_MODELS = [
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
  { key: "onsite", label: "On-site" },
] as const;

/** Experience-level facet — buckets the granular `seniority` values jobright-style. */
const SENIORITY_BUCKETS = [
  { key: "entry", label: "Entry", vals: ["intern", "entry"] },
  { key: "mid", label: "Mid", vals: ["mid"] },
  { key: "senior", label: "Senior", vals: ["senior"] },
  { key: "lead", label: "Lead+", vals: ["lead", "principal", "director", "executive"] },
] as const;

const SORT_OPTIONS = [
  { key: "match", label: "Best match" },
  { key: "newest", label: "Newest" },
  { key: "salary", label: "Salary" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const EMPLOYMENT_OPTIONS = [
  { key: "", label: "Any type" },
  { key: "full_time", label: "Full-time" },
  { key: "part_time", label: "Part-time" },
  { key: "contract", label: "Contract" },
  { key: "internship", label: "Internship" },
  { key: "temporary", label: "Temporary" },
] as const;

const YEARS_OPTIONS = [
  { key: "any", label: "Any experience", min: 0, max: 99 },
  { key: "0-2", label: "0–2 yrs", min: 0, max: 2 },
  { key: "3-5", label: "3–5 yrs", min: 3, max: 5 },
  { key: "6+", label: "6+ yrs", min: 6, max: 99 },
] as const;

function seniorityBucketKey(seniority: string | null): string | null {
  if (!seniority) return null;
  for (const b of SENIORITY_BUCKETS) if ((b.vals as readonly string[]).includes(seniority)) return b.key;
  return null;
}

/** Short match-strength tier shown under each card's score (jobright-style). */
function matchTierLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Low";
}

/** Shared pill style for the filter-bar toggle chips. */
function filterChipStyle(active: boolean): CSSProperties {
  return {
    fontSize: 12.5,
    padding: "5px 12px",
    borderRadius: 999,
    border: "1px solid " + (active ? "var(--accent)" : "var(--surface2)"),
    background: active ? "var(--accent-bg)" : "transparent",
    color: active ? "var(--accent)" : "var(--muted)",
    cursor: "pointer",
  };
}

const FILTER_SELECT_STYLE: CSSProperties = {
  fontSize: 12.5,
  padding: "5px 8px",
  borderRadius: 8,
  border: "1px solid var(--surface2)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  maxWidth: 150,
};

/** Toggle a key in a Set-valued filter state. */
function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

/** How many job cards to render per lazy-load page. */
const PAGE_SIZE = 25;

/** Module-level feed cache so switching away from and back to the Jobs tab
 *  (which unmounts/remounts this component) doesn't refetch the ranked feed
 *  every time. Keyed by the age filter; the manual refresh/retry bypass it with
 *  `force`. TTL keeps it fresh enough after a re-scan without a hard reload. */
type FeedReady = Extract<FeedState, { status: "ready" }>;
const FEED_TTL_MS = 5 * 60 * 1000;
let feedCache: { key: string; at: number; data: FeedReady } | null = null;

function scoreColors(score: number): { fg: string; bg: string } {
  if (score >= 70) return { fg: "var(--green-ink)", bg: "color-mix(in srgb, var(--green-ink) 12%, transparent)" };
  if (score >= 50) return { fg: "var(--amber-ink)", bg: "color-mix(in srgb, var(--amber-ink) 12%, transparent)" };
  return { fg: "var(--muted)", bg: "var(--surface2)" };
}

function formatSalary(job: FeedJob): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const cur = job.salaryCurrency === "USD" || !job.salaryCurrency ? "$" : `${job.salaryCurrency} `;
  const period = job.salaryPeriod || "year";
  const hourly = period === "hour";
  const fmt = (n: number) =>
    hourly ? `${Math.round(n * 100) / 100}` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;
  const lo = job.salaryMin ?? job.salaryMax;
  const hi = job.salaryMax ?? job.salaryMin;
  if (lo == null || hi == null) return null;
  const suffix = hourly ? "/hr" : period === "month" ? "/mo" : period === "week" ? "/wk" : period === "day" ? "/day" : "/yr";
  const range = lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(lo)}–${fmt(hi)}`;
  return `${range}${suffix}`;
}

const WORK_MODEL_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};
const SENIORITY_LABEL: Record<string, string> = {
  intern: "Intern",
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  director: "Director",
  executive: "Exec",
};

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
  const [workModels, setWorkModels] = useState<Set<string>>(new Set());
  const [seniorities, setSeniorities] = useState<Set<string>>(new Set());
  const [empType, setEmpType] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [yearsBucket, setYearsBucket] = useState<string>("any");
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [rolesOnly, setRolesOnly] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterKey>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilterKey>("30");
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeRoles, setNudgeRoles] = useState<string[]>([]);
  const [nudgeSaving, setNudgeSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Boost slide-over: feed cards only carry summary fields, so fetch the full
  // job detail on demand before mounting the shared BoostPanel in place.
  const [boostJob, setBoostJob] = useState<JobDetailData | null>(null);
  const [boostLoadingId, setBoostLoadingId] = useState<string | null>(null);
  const [boostError, setBoostError] = useState<string | null>(null);

  const openBoost = useCallback(async (id: string) => {
    setBoostLoadingId(id);
    setBoostError(null);
    try {
      const detail = await fetchJobDetail(id);
      setBoostJob(detail);
    } catch (err) {
      setBoostError(err instanceof Error ? err.message : "Couldn't load this job to boost");
    } finally {
      setBoostLoadingId(null);
    }
  }, []);

  const toggleNudgeRole = useCallback((r: string) => {
    setNudgeRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }, []);

  const loadFeed = useCallback(async (force = false) => {
    const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
    const cacheKey = String(days);
    // Serve a fresh-enough cached feed on tab remount instead of refetching.
    if (!force && feedCache && feedCache.key === cacheKey && Date.now() - feedCache.at < FEED_TTL_MS) {
      setState(feedCache.data);
      return;
    }
    setState({ status: "loading" });
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const qs = days ? `?max_age_days=${days}` : "";
      const resp = await fetch(apiUrl(`/api/jobs/feed${qs}`), { headers });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // Only the backend's explicit "no saved analysis" codes mean the user
        // needs a scan — a bare 404 can be an API deploy that predates the route.
        if (resp.status === 404 && (body?.error === "no_resume_analysis" || body?.error === "no_resume_text")) {
          feedCache = null;
          setState({ status: "no-resume" });
          return;
        }
        throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const ready: FeedReady = {
        status: "ready",
        jobs: Array.isArray(data?.jobs) ? data.jobs : [],
        generatedAt: data?.generatedAt || "",
        profileRoles: Array.isArray(data?.profileRoles) ? data.profileRoles : [],
        profileLocations: Array.isArray(data?.profileLocations) ? data.profileLocations : [],
        // Backend omits/false `ranked` for the signed-out / no-résumé browse feed
        // (no match scores). Default true so the ranked path is unaffected.
        ranked: data?.ranked !== false,
      };
      feedCache = { key: cacheKey, at: Date.now(), data: ready };
      setState(ready);
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
      void loadFeed(true);
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
    const filtered = state.jobs.filter((job) => {
      if (job.matchScore != null && job.matchScore < minScore) return false;
      if (workModels.size > 0) {
        // Fall back to a text heuristic when the posting has no structured work_model.
        const wm = job.workModel
          || (`${job.location} ${job.title}`.toLowerCase().includes("remote") ? "remote" : null);
        if (!wm || !workModels.has(wm)) return false;
      }
      if (seniorities.size > 0) {
        const b = seniorityBucketKey(job.seniority);
        if (!b || !seniorities.has(b)) return false;
      }
      if (empType && job.employmentType !== empType) return false;
      if (industry && job.industry !== industry) return false;
      if (yearsBucket !== "any") {
        const yb = YEARS_OPTIONS.find((y) => y.key === yearsBucket);
        if (yb && (job.minYears == null || job.minYears < yb.min || job.minYears > yb.max)) return false;
      }
      if (rolesOnly && !job.titleMatch) return false;
      if (q && !`${job.title} ${job.company} ${job.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === "newest") {
      return [...filtered].sort((a, b) => (Date.parse(b.postedAt || "") || 0) - (Date.parse(a.postedAt || "") || 0));
    }
    if (sortBy === "salary") {
      const sal = (j: FeedJob) => j.salaryMax ?? j.salaryMin ?? -1;
      return [...filtered].sort((a, b) => sal(b) - sal(a));
    }
    return filtered; // "match" — the backend already ranks by match score
  }, [state, search, workModels, seniorities, empType, industry, yearsBucket, rolesOnly, scoreFilter, sortBy]);

  // Distinct industries present in the current feed, for the Industry dropdown.
  const industryOptions = useMemo(() => {
    if (state.status !== "ready") return [];
    const set = new Set<string>();
    for (const j of state.jobs) if (j.industry) set.add(j.industry);
    return [...set].sort();
  }, [state]);

  // ── Saved filters ──
  useEffect(() => {
    fetchJobFilters().then(setSavedFilters).catch(() => { /* unauth / offline → none */ });
  }, []);

  const currentSnapshot = useMemo<FilterSnapshot>(() => ({
    workModels: [...workModels],
    seniorities: [...seniorities],
    empType, industry, yearsBucket, scoreFilter, ageFilter, search, sortBy, rolesOnly,
  }), [workModels, seniorities, empType, industry, yearsBucket, scoreFilter, ageFilter, search, sortBy, rolesOnly]);

  const applySnapshot = useCallback((f: Partial<FilterSnapshot>) => {
    setWorkModels(new Set(f.workModels ?? []));
    setSeniorities(new Set(f.seniorities ?? []));
    setEmpType(f.empType ?? "");
    setIndustry(f.industry ?? "");
    setYearsBucket(f.yearsBucket ?? "any");
    setScoreFilter((f.scoreFilter as ScoreFilterKey) ?? "all");
    setAgeFilter((f.ageFilter as AgeFilterKey) ?? "30");
    setSearch(f.search ?? "");
    setSortBy((f.sortBy as SortKey) ?? "match");
    setRolesOnly(!!f.rolesOnly);
  }, []);

  // Reset the lazy-load window whenever the filtered result set changes, so a
  // new filter/search starts from the top instead of keeping a stale offset.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, workModels, seniorities, empType, industry, yearsBucket, sortBy, rolesOnly, scoreFilter, ageFilter, state.status]);

  const pagedJobs = useMemo(() => visibleJobs.slice(0, visibleCount), [visibleJobs, visibleCount]);
  const hasMore = visibleCount < visibleJobs.length;

  // Infinite scroll: reveal the next page when the sentinel enters the viewport.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, pagedJobs.length]);

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 20px 64px", width: "100%", display: "flex", gap: 28, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Jobs for you</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            {state.status === "ready" && state.ranked === false
              ? "Live openings from company career boards — search and apply for free. Sign in and scan your résumé to rank them by fit."
              : "Live openings ranked against your latest analyzed résumé. Apply on the company's site — we hand you the match, you make the call."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadFeed(true)} disabled={state.status === "loading"}>
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
          {state.ranked && SCORE_FILTERS.map((f) => (
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
          <span style={{ width: 1, height: 18, background: "var(--surface2)" }} />
          <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Work</span>
          {WORK_MODELS.map((w) => (
            <button key={w.key} type="button" onClick={() => toggleInSet(setWorkModels, w.key)} style={filterChipStyle(workModels.has(w.key))}>
              {w.label}
            </button>
          ))}
          <span style={{ width: 1, height: 18, background: "var(--surface2)" }} />
          <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Level</span>
          {SENIORITY_BUCKETS.map((b) => (
            <button key={b.key} type="button" onClick={() => toggleInSet(setSeniorities, b.key)} style={filterChipStyle(seniorities.has(b.key))}>
              {b.label}
            </button>
          ))}
          <span style={{ width: 1, height: 18, background: "var(--surface2)" }} />
          <select value={empType} onChange={(e) => setEmpType(e.target.value)} aria-label="Job type" style={FILTER_SELECT_STYLE}>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <select value={yearsBucket} onChange={(e) => setYearsBucket(e.target.value)} aria-label="Years of experience" style={FILTER_SELECT_STYLE}>
            {YEARS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          {industryOptions.length > 0 && (
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry" style={FILTER_SELECT_STYLE}>
              <option value="">Any industry</option>
              {industryOptions.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          )}
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
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort jobs"
              style={{ fontSize: 12.5, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--surface2)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{`Sort: ${s.label}`}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {visibleJobs.length} of {state.jobs.length}
            </span>
          </div>
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

        {state.status === "ready" && state.ranked === false && (
          <div style={{ marginBottom: 16, borderRadius: 14, border: "1.5px solid rgba(47,129,247,0.22)", background: "var(--surface)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                Browsing all live jobs
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                Search and apply for free. Sign in and scan your résumé to rank these by fit and unlock per-job match scores.
              </div>
            </div>
            <Button onClick={() => router.push("/?view=analyze")} style={{ flexShrink: 0 }}>Scan my résumé</Button>
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
              <Button variant="outline" onClick={() => void loadFeed(true)}>
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
            {pagedJobs.map((job) => {
              const colors = job.matchScore != null ? scoreColors(job.matchScore) : null;
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
                    {job.matchScore != null && colors && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, width: 56 }}>
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
                        }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{job.matchScore}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.85 }}>MATCH</span>
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: colors.fg, textAlign: "center", lineHeight: 1.1 }}>
                        {matchTierLabel(job.matchScore)}
                      </span>
                    </div>
                    )}
                    <CompanyLogo company={job.company} companyDomain={job.companyDomain || ""} slug={job.companySlug || ""} size={44} radius={10} />
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
                            {salary}
                          </Badge>
                        )}
                        {job.workModel && WORK_MODEL_LABEL[job.workModel] && (
                          <Badge variant="secondary" style={{ fontSize: 11 }}>
                            {WORK_MODEL_LABEL[job.workModel]}
                          </Badge>
                        )}
                        {job.seniority && SENIORITY_LABEL[job.seniority] && (
                          <Badge variant="secondary" style={{ fontSize: 11 }}>
                            {SENIORITY_LABEL[job.seniority]}
                          </Badge>
                        )}
                        {(job.h1bSponsor || job.visaSponsorship === "yes") && (
                          <Badge
                            style={{
                              fontSize: 11,
                              background: "color-mix(in srgb, #16a34a 14%, transparent)",
                              color: "#16a34a",
                              border: "1px solid color-mix(in srgb, #16a34a 32%, transparent)",
                            }}
                          >
                            {job.h1bSponsor && job.h1bCertifiedCount
                              ? `H-1B sponsor · ${job.h1bCertifiedCount.toLocaleString()}`
                              : "H-1B sponsor"}
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
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 7, alignItems: "stretch" }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void openBoost(job.id); }}
                        disabled={boostLoadingId === job.id}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "none",
                          background: "#c4793a",
                          color: "#fff",
                          cursor: boostLoadingId === job.id ? "wait" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: boostLoadingId === job.id ? 0.7 : 1,
                          fontFamily: "inherit",
                        }}
                      >
                        {boostLoadingId === job.id ? "Loading…" : "✦ Optimize"}
                      </button>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); void trackApplyClick(job.id); }}
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          padding: "7px 14px",
                          borderRadius: 8,
                          textAlign: "center",
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {visibleJobs.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "28px 0" }}>
                No openings match the current filters.
              </p>
            )}

            {hasMore && (
              <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
                <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  Load more ({visibleJobs.length - pagedJobs.length} more)
                </Button>
              </div>
            )}

            {!hasMore && visibleJobs.length > PAGE_SIZE && (
              <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "16px 0 4px" }}>
                You&apos;ve reached the end · {visibleJobs.length} openings
              </p>
            )}
          </div>
        )}
      </div>
      </div>{/* /main column */}

      {state.status === "ready" && (
        <JobsSidebar
          savedFilters={savedFilters}
          currentSnapshot={currentSnapshot}
          onApply={applySnapshot}
          onSaved={(f) => setSavedFilters((prev) => [f, ...prev])}
          onDeleted={(id) => setSavedFilters((prev) => prev.filter((x) => x.id !== id))}
          onNavigate={(v) => router.push(`/?view=${v}`)}
        />
      )}

      {boostJob && <BoostPanel job={boostJob} onClose={() => setBoostJob(null)} />}

      {boostError && (
        <div
          onClick={() => setBoostError(null)}
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            background: "var(--surface)",
            border: "1px solid var(--surface2)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: "var(--text)",
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            cursor: "pointer",
            maxWidth: "90vw",
          }}
        >
          ⚠️ {boostError} <span style={{ color: "var(--muted)", marginLeft: 8 }}>(tap to dismiss)</span>
        </div>
      )}
    </div>
  );
}

// ── Right sidebar: saved filters + a Resunova-native widget ──────────────────

const SIDEBAR_CARD: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
};
const SIDEBAR_INPUT: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12.5,
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid var(--surface2)",
  background: "var(--bg)",
  color: "var(--text)",
};

function JobsSidebar({
  savedFilters,
  currentSnapshot,
  onApply,
  onSaved,
  onDeleted,
  onNavigate,
}: {
  savedFilters: SavedFilter[];
  currentSnapshot: FilterSnapshot;
  onApply: (f: Partial<FilterSnapshot>) => void;
  onSaved: (f: SavedFilter) => void;
  onDeleted: (id: string) => void;
  onNavigate: (view: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    try {
      const created = await createJobFilter(n, currentSnapshot);
      onSaved(created);
      setName("");
      setNaming(false);
    } catch {
      /* ignore — sidebar is best-effort */
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    onDeleted(id);
    try {
      await deleteJobFilter(id);
    } catch {
      /* optimistic; ignore */
    }
  }

  return (
    <aside style={{ width: 264, flexShrink: 0, position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={SIDEBAR_CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Your saved filters</span>
          {!naming && (
            <button
              onClick={() => setNaming(true)}
              style={{ fontSize: 12, fontWeight: 600, padding: "4px 9px", borderRadius: 7, border: "1px solid var(--surface2)", background: "transparent", color: "var(--accent)", cursor: "pointer" }}
            >
              + Save
            </button>
          )}
        </div>

        {naming && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
              placeholder="Name this filter set"
              style={SIDEBAR_INPUT}
            />
            <button
              onClick={() => void save()}
              disabled={!name.trim() || saving}
              style={{ fontSize: 12, fontWeight: 600, padding: "0 12px", borderRadius: 8, border: "none", background: "#c4793a", color: "#fff", cursor: name.trim() && !saving ? "pointer" : "not-allowed", opacity: name.trim() && !saving ? 1 : 0.6 }}
            >
              {saving ? "…" : "Save"}
            </button>
          </div>
        )}

        {savedFilters.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            Save the current filter set to reuse it in one click.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedFilters.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => onApply(f.filters)}
                  title="Apply this filter set"
                  style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 12.5, fontWeight: 500, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--surface2)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {f.name}
                </button>
                <button onClick={() => void remove(f.id)} aria-label={`Delete ${f.name}`} style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 15, cursor: "pointer", padding: 2, flexShrink: 0 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resunova-native widget — replaces jobright's "Career Coach" upsell. */}
      <div style={SIDEBAR_CARD}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Sharpen your matches</div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 12px" }}>
          Your résumé is the match profile. Re-scan after edits to refresh every score across the feed.
        </p>
        <button
          onClick={() => onNavigate("analyze")}
          style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: "10px 0", borderRadius: 9, border: "1px solid var(--surface2)", background: "transparent", color: "var(--text)", cursor: "pointer" }}
        >
          Re-scan my résumé →
        </button>
      </div>
    </aside>
  );
}
