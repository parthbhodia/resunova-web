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
import { getSupabaseClient, upsertUserProfile, fetchJobPrepStatuses, fetchAnalyses, type JobPrepStatus, type AnalyzeRecord } from "@/lib/supabase";
import { loadProfile, saveProfile } from "@/lib/profileStorage";
import { fetchJobDetail, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import { prefillPrepFromJob } from "@/lib/interviewPrepLaunch";
import { useSignInDialog } from "@/components/SignInDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchJobFilters,
  createJobFilter,
  deleteJobFilter,
  type SavedFilter,
  type FilterSnapshot,
} from "@/lib/jobFiltersApi";
import CompanyLogo from "@/components/CompanyLogo";
import FeaturedCompaniesRail from "@/components/FeaturedCompaniesRail";
import BoostPanel from "@/components/BoostPanel";
import JobsOnboardingWizard from "@/components/JobsOnboardingWizard";
import { JobTopMatchesCard } from "@/components/jobs/JobTopMatchesCard";
import { useJobTopMatches, type JobTopMatch } from "@/lib/useJobTopMatches";
import type { JobsBrowseSelection } from "@/lib/jobsTaxonomy";
import { SENIORITY_BUCKET_VALS, NATIONWIDE_LOCATION } from "@/lib/jobsTaxonomy";

export type FeedJob = {
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
  | { status: "needs-role" }
  | { status: "signin" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: FeedJob[]; generatedAt: string; profileLocations: string[]; ranked: boolean; role?: string; hasMore?: boolean; nextOffset?: number; feedFamily?: string; totalMatching?: number };

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
const DEFAULT_AGE_FILTER: AgeFilterKey = "7";

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

// Country scope for the feed. Sent as ?country= to the backend, which filters on
// the accurate non_us flag ("US") or the `country` column (ISO codes) — NOT a
// literal location match. Ordered by corpus volume; "ALL"/"INTL" are meta-scopes.
const COUNTRIES = [
  { key: "US", label: "🇺🇸 United States" },
  { key: "GB", label: "🇬🇧 United Kingdom" },
  { key: "IN", label: "🇮🇳 India" },
  { key: "CA", label: "🇨🇦 Canada" },
  { key: "DE", label: "🇩🇪 Germany" },
  { key: "FR", label: "🇫🇷 France" },
  { key: "NL", label: "🇳🇱 Netherlands" },
  { key: "IE", label: "🇮🇪 Ireland" },
  { key: "ES", label: "🇪🇸 Spain" },
  { key: "PL", label: "🇵🇱 Poland" },
  { key: "AU", label: "🇦🇺 Australia" },
  { key: "SG", label: "🇸🇬 Singapore" },
  { key: "BR", label: "🇧🇷 Brazil" },
  { key: "MX", label: "🇲🇽 Mexico" },
  { key: "JP", label: "🇯🇵 Japan" },
  { key: "PH", label: "🇵🇭 Philippines" },
  { key: "IL", label: "🇮🇱 Israel" },
  { key: "INTL", label: "🌍 All international" },
  { key: "ALL", label: "🌐 Worldwide" },
] as const;
const COUNTRY_LABEL = (k: string) => COUNTRIES.find((c) => c.key === k)?.label ?? "🇺🇸 United States";
const JOBS_COUNTRY_KEY = "rn_jobs_country_v1";

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


/** Compact dropdown-trigger button style for the filter bar. */
const FEED_FAMILY_LABELS: Record<string, string> = {
  software: "Software Engineering", data: "Data & Analytics", product: "Product Management",
  design: "Design", marketing: "Marketing", operations: "Operations", recruiting: "Recruiting",
  finance: "Finance", legal: "Legal", healthcare: "Healthcare", sales: "Sales",
  education: "Education", hospitality: "Hospitality", general: "General",
};

function filterButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 500, padding: "7px 12px", borderRadius: 9,
    border: "1px solid " + (active ? "var(--accent)" : "var(--surface2)"),
    background: active ? "var(--accent-bg)" : "var(--surface)",
    color: active ? "var(--accent)" : "var(--text)",
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
  };
}
const COUNT_BADGE: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8,
  fontSize: 10.5, fontWeight: 700, background: "var(--accent)", color: "#fff",
};

/** Toggle a key in a Set-valued filter state. */
function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

/** Dropdown filter trigger + popover (closes on outside-click / Escape). */
function FilterMenu({ label, count = 0, active = false, align = "left", width = 220, onClear, children }: {
  label: string; count?: number; active?: boolean; align?: "left" | "right"; width?: number; onClear?: () => void; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = active || count > 0;
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={filterButtonStyle(isActive || open)}>
        {label}
        {count > 0 && <span style={COUNT_BADGE}>{count}</span>}
        <span style={{ fontSize: 9, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
        {isActive && onClear && (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            title="Clear filter"
            style={{ fontSize: 14, lineHeight: 1, opacity: 0.65, marginLeft: 1, cursor: "pointer", padding: "0 1px" }}
          >×</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", [align]: 0, zIndex: 50, width,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.16)", padding: 6,
        } as CSSProperties}>
          {children}
        </div>
      )}
    </div>
  );
}

/** A selectable row inside a FilterMenu — checkbox for multi, radio dot for single. */
function MenuOption({ label, selected, multi = false, onClick }: { label: string; selected: boolean; multi?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
      fontSize: 13, padding: "8px 9px", borderRadius: 8, border: "none",
      background: selected && !multi ? "var(--accent-bg)" : "transparent",
      color: selected ? "var(--accent)" : "var(--text)", cursor: "pointer", fontFamily: "inherit",
    }}>
      <span style={{
        width: 15, height: 15, flexShrink: 0, borderRadius: multi ? 4 : "50%",
        border: "1.5px solid " + (selected ? "var(--accent)" : "var(--surface2)"),
        background: selected ? "var(--accent)" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10,
      }}>{selected ? "✓" : ""}</span>
      {label}
    </button>
  );
}

const LOCATION_SUGGESTIONS = ["Remote", "New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Boston", "Seattle", "London", "Toronto"];

/** Free-text location search — any city, country, or "Remote". */
function LocationPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ padding: "2px 0" }}>
      <input
        autoFocus value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="City, state, country, or Remote…"
        style={{ width: "100%", fontSize: 13, padding: "7px 9px", borderRadius: 8, border: "1px solid var(--surface2)", background: "var(--bg)", color: "var(--text)", marginBottom: 8, boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {LOCATION_SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} style={{
            fontSize: 11.5, padding: "4px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${value === s ? "var(--accent)" : "var(--surface2)"}`,
            background: value === s ? "var(--accent-bg)" : "transparent",
            color: value === s ? "var(--accent)" : "var(--muted)",
          }}>{s}</button>
        ))}
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} style={{ width: "100%", marginTop: 8, fontSize: 12, padding: "6px 0", borderRadius: 8, border: "1px solid var(--surface2)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>
          Clear
        </button>
      )}
    </div>
  );
}

/** How many job cards to render per lazy-load page. */
const PAGE_SIZE = 20; // jobs shown per page (grows by this on "Load more")
const FALLBACK_LIMIT = 12; // "outside your filters" section cap

/** localStorage key for a no-résumé visitor's chosen target role — drives the
 *  role-scoped browse feed until they scan a résumé. */
const JOBS_ROLE_KEY = "rn_jobs_role_v1";

/** localStorage key for the no-résumé visitor's full browse selection (role +
 *  title/location alias terms + work model) collected by the onboarding wizard. */
const JOBS_BROWSE_KEY = "rn_jobs_browse_v1";

/** localStorage key for the chosen past scan to rank the feed against
 *  ("Update résumé" → recent-scans picker). Empty/absent → rank against latest. */
const JOBS_RANK_ANALYSIS_KEY = "rn_jobs_rank_analysis_v1";

/** Compact relative time for the recent-scans picker rows. */
function scanTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Score badge tint for a scan row (green strong / amber mid / neutral low). */
function scanScoreStyle(score: number | null | undefined): { bg: string; color: string } {
  if (score != null && score >= 70) return { bg: "color-mix(in srgb, var(--green-ink, #16a34a) 14%, transparent)", color: "var(--green-ink, #16a34a)" };
  if (score != null && score >= 50) return { bg: "color-mix(in srgb, #c4793a 14%, transparent)", color: "#9a5a23" };
  return { bg: "var(--surface2)", color: "var(--muted)" };
}

/** Feed cache key — identical in loadFeed and prefetchJobsFeed so a warmed
 *  prefetch entry is actually reused by the on-mount fetch. `rankAnalysisId`
 *  keeps a feed ranked against a specific past scan cached separately from the
 *  latest-scan feed (and correct on remount). */
function browseFeedCacheKey(days: number, roleQuery: string, sel: JobsBrowseSelection | null, rankAnalysisId = "", searchTerm = "", filterSig = ""): string {
  const f = sel
    ? `${(sel.titleTerms || []).join(",")}~${(sel.locationTerms || []).join(",")}~${sel.location || ""}~${sel.workModel || ""}~${sel.seniority || ""}`
    : "";
  return `${days}|${roleQuery}|${f}|a:${rankAnalysisId}|q:${searchTerm}|f:${filterSig}`;
}

/** Append the wizard's title/location/work-model filters to a feed request.
 *
 * `hardScope` (default true) is for the NO-résumé browse path, where the
 * wizard's title aliases + work-model are how the feed is scoped. On the
 * RÉSUMÉ-RANKED feed it must be false: the role drives role_family scoping and
 * the résumé ranks the whole family — applying the narrow title-alias list
 * (e.g. "software engineer|software developer|swe") + a hidden work-model as
 * HARD filters silently collapses the feed (e.g. 12k software jobs → ~280),
 * dropping "Backend Engineer"/"Full Stack Engineer"/hybrid+onsite roles the
 * user would want. Visible UI filters still apply via serverFilterEntries. */
function appendBrowseParams(
  params: URLSearchParams,
  sel: JobsBrowseSelection | null,
  hardScope = true,
): void {
  if (!sel) return;
  if (hardScope && sel.titleTerms?.length) params.set("title_any", sel.titleTerms.join("|"));
  if (sel.locationTerms?.length) params.set("location_any", sel.locationTerms.join("|"));
  else if (sel.location?.trim() && sel.location.trim() !== NATIONWIDE_LOCATION && !sel.workModel) params.set("location", sel.location.trim());
  if (hardScope && sel.workModel) params.set("work_model", sel.workModel);
  // Experience level carries on BOTH paths (it's a user choice, not a scope-
  // collapsing alias). On the ranked feed, serverFilterEntries re-sets this same
  // key from the live filter chip after this call, so they never conflict.
  const senVals = sel.seniority ? SENIORITY_BUCKET_VALS[sel.seniority] : undefined;
  if (senVals?.length) params.set("seniority_any", senVals.join("|"));
}

/** Module-level feed cache so switching away from and back to the Jobs tab
 *  (which unmounts/remounts this component) doesn't refetch the ranked feed
 *  every time. Keyed by the age filter; the manual refresh/retry bypass it with
 *  `force`. TTL keeps it fresh enough after a re-scan without a hard reload. */
type FeedReady = Extract<FeedState, { status: "ready" }>;
const FEED_TTL_MS = 5 * 60 * 1000;
let feedCache: { key: string; at: number; data: FeedReady } | null = null;
// Current page index, persisted at module scope so selecting a job (which remounts
// JobsFeed as JobsView swaps to the split layout) restores the page instead of
// snapping back to page 1. Reset to 0 on a genuine filter/search change.
let feedPage = 0;

/**
 * Warm the module-level feed cache so opening the Jobs tab is instant. Called
 * (best-effort) from the app shell once a signed-in session resolves — "start
 * the call when the user lands". Mirrors loadFeed's DEFAULT request: the
 * default date window + any role the no-résumé visitor previously picked. Anything
 * that doesn't map cleanly (no session, needsRole, error) is a silent no-op —
 * JobsFeed then just fetches on mount as before. The dynamic import that calls
 * this also warms the Jobs view's JS chunk, so both data and code are ready.
 */
export async function prefetchJobsFeed(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const days = AGE_FILTERS.find((f) => f.key === DEFAULT_AGE_FILTER)?.days ?? 0;
    let roleQuery = "";
    let browseSel: JobsBrowseSelection | null = null;
    try { roleQuery = localStorage.getItem(JOBS_ROLE_KEY) || ""; } catch { /* ignore */ }
    try { const raw = localStorage.getItem(JOBS_BROWSE_KEY); if (raw) browseSel = JSON.parse(raw) as JobsBrowseSelection; } catch { /* ignore */ }
    const cacheKey = browseFeedCacheKey(days, roleQuery, browseSel);
    // Already warm → nothing to do.
    if (feedCache && feedCache.key === cacheKey && Date.now() - feedCache.at < FEED_TTL_MS) return;

    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session?.access_token) return; // feed requires sign-in
    const params = new URLSearchParams();
    if (days) params.set("max_age_days", String(days));
    if (roleQuery) params.set("role", roleQuery);
    appendBrowseParams(params, browseSel);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(apiUrl(`/api/jobs/feed${qs}`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.needsRole) return; // no rows to cache; the tab renders the role prompt
    feedCache = {
      key: cacheKey,
      at: Date.now(),
      data: {
        status: "ready",
        jobs: Array.isArray(data?.jobs) ? data.jobs : [],
        generatedAt: data?.generatedAt || "",
        profileLocations: Array.isArray(data?.profileLocations) ? data.profileLocations : [],
        ranked: data?.ranked !== false,
        role: typeof data?.role === "string" && data.role ? data.role : (roleQuery || undefined),
        hasMore: data?.hasMore === true,
        nextOffset: typeof data?.nextOffset === "number" ? data.nextOffset : undefined,
        feedFamily: typeof data?.feedFamily === "string" ? data.feedFamily : "",
        totalMatching: typeof data?.totalMatching === "number" ? data.totalMatching : undefined,
      },
    };
  } catch {
    /* best-effort — JobsFeed fetches on mount if the warm-up didn't land */
  }
}

/** Warm the feed cache for a SPECIFIC browse selection (role + title/location
 *  terms), used by the onboarding wizard to prefetch matches while the user is
 *  still picking role/location — so the feed is instant the moment they upload a
 *  résumé. Same cache + key as loadFeed, so the warmed entry is reused. Writes an
 *  unranked (or prior-résumé-ranked) entry; the post-upload ranked refetch
 *  overwrites it in place. Best-effort: any miss just falls back to a fetch. */
async function warmFeed(sel: JobsBrowseSelection, days: number): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const roleQuery = sel.role.trim();
    const cacheKey = browseFeedCacheKey(days, roleQuery, sel);
    if (feedCache && feedCache.key === cacheKey && Date.now() - feedCache.at < FEED_TTL_MS) return;
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session?.access_token) return;
    const params = new URLSearchParams();
    if (days) params.set("max_age_days", String(days));
    if (roleQuery) params.set("role", roleQuery);
    appendBrowseParams(params, sel);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const resp = await fetch(apiUrl(`/api/jobs/feed${qs}`), { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.needsRole) return;
    feedCache = {
      key: cacheKey,
      at: Date.now(),
      data: {
        status: "ready",
        jobs: Array.isArray(data?.jobs) ? data.jobs : [],
        generatedAt: data?.generatedAt || "",
        profileLocations: Array.isArray(data?.profileLocations) ? data.profileLocations : [],
        ranked: data?.ranked !== false,
        role: typeof data?.role === "string" && data.role ? data.role : (roleQuery || undefined),
        hasMore: data?.hasMore === true,
        nextOffset: typeof data?.nextOffset === "number" ? data.nextOffset : undefined,
        feedFamily: typeof data?.feedFamily === "string" ? data.feedFamily : "",
        totalMatching: typeof data?.totalMatching === "number" ? data.totalMatching : undefined,
      },
    };
  } catch { /* best-effort */ }
}

/** Upload a résumé for analysis. Persists the analysis server-side (keyed by the
 *  signed-in user), which is what unlocks ranked feeds. Resolves on success;
 *  throws an Error with a user-facing message on 429 / parse failure. Moved out
 *  of the wizard so the parent feed can run it in the background while showing
 *  jobs. */
async function analyzeResumeUpload(file: File): Promise<{ seniorityGuess?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  // Two-phase opt-in (resunova-api): the backend persists the rankable profile
  // (extractedText + structuredResume) and returns in ~1–2s with
  // `analysisPending: true`, then finishes the comprehensive analysis in the
  // background. That's all the ranked feed refetch below needs — so the
  // ranked upgrade lands in ~1–2s instead of ~15s. The Analyze view does NOT
  // set this (it renders the full result synchronously).
  fd.append("defer_analysis", "1");
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  if (session?.user?.id) {
    fd.set("user_id", session.user.id);
    if (session.user.email) fd.set("user_email", session.user.email);
  }
  const resp = await fetch(apiUrl("/api/analyze-upload"), { method: "POST", body: fd, headers });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Daily scan limit reached — try tomorrow, or browse without ranking below.");
    throw new Error(json?.error || json?.message || "Couldn't read that file — use a text-based PDF résumé.");
  }
  // Optional: the backend may return an inferred experience-level bucket
  // (entry|mid|senior|lead) from the résumé's tenure, used to auto-default the
  // feed's seniority filter when the user didn't pick a level. Absent → no-op.
  const guess = typeof json?.seniorityGuess === "string" ? json.seniorityGuess : undefined;
  return { seniorityGuess: guess };
}

/** Read the most-recently cached feed jobs (the exact list the rail is showing),
 *  so side panels like "More matches" can reuse it without a second fetch.
 *  Returns null until the feed has loaded once. */
export function getCachedFeedJobs(): FeedJob[] | null {
  return feedCache?.data.jobs ?? null;
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

export default function JobsFeed({
  selectedJobId = "",
  variant = "full",
}: {
  /** Currently-open job (desktop split view) — its card is highlighted. */
  selectedJobId?: string;
  /** "list" = compact rail beside a detail pane: no own sidebar, no per-card
   *  action buttons (the detail pane owns them). "full" = standalone feed. */
  variant?: "full" | "list";
} = {}) {
  const router = useRouter();
  const { openSignIn } = useSignInDialog();
  const isMobile = useIsMobile();
  const listMode = variant === "list";
  // Seed from the module-level cache so returning to Jobs (app-tab switch /
  // remount) shows the last feed INSTANTLY instead of a skeleton; loadFeed
  // revalidates below. (Cross-key edge self-corrects on the first loadFeed.)
  const [state, setState] = useState<FeedState>(() => feedCache?.data ?? { status: "loading" });
  // Coarse public count for the signed-out hero's proof chip (no auth). Best
  // effort — stays null on failure so the chip simply doesn't render.
  const [publicCount, setPublicCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const days = AGE_FILTERS.find((f) => f.key === DEFAULT_AGE_FILTER)?.days ?? 0;
    const qs = days ? `?max_age_days=${days}` : "";
    fetch(apiUrl(`/api/jobs/public-count${qs}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && typeof d.count === "number") setPublicCount(d.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  // A no-résumé visitor's chosen target role (free text or a suggested chip).
  // Restored from localStorage so it sticks across reloads until they scan.
  const [roleQuery, setRoleQuery] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(JOBS_ROLE_KEY) || ""; } catch { return ""; }
  });
  const [browseSel, setBrowseSel] = useState<JobsBrowseSelection | null>(() => {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(JOBS_BROWSE_KEY); return raw ? (JSON.parse(raw) as JobsBrowseSelection) : null; } catch { return null; }
  });
  const [search, setSearch] = useState("");
  // Debounced search → server query. The search box now hits the DB (title across
  // the WHOLE corpus, ranked), not just a client-side filter on the loaded page —
  // so searching a role outside your saved family (e.g. "business analyst") works.
  // Debounced so we don't refetch on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);
  // "Update résumé" popup on the ranked feed — re-scan a newer résumé and re-rank
  // in place. A non-trapping replacement for the reverted "change role": upload or
  // cancel, nothing else changes.
  const [updateResumeOpen, setUpdateResumeOpen] = useState(false);
  // Chosen past scan to rank against (empty = latest). Persisted so it sticks
  // across remounts until the user picks another or scans a new résumé.
  const [rankAnalysisId, setRankAnalysisId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(JOBS_RANK_ANALYSIS_KEY) || ""; } catch { return ""; }
  });
  // Recent scans for the "Update résumé" picker — fetched lazily when it opens.
  const [recentScans, setRecentScans] = useState<AnalyzeRecord[] | null>(null);
  useEffect(() => {
    if (!updateResumeOpen) return;
    let cancelled = false;
    fetchAnalyses(5)
      .then((r) => { if (!cancelled) setRecentScans(r); })
      .catch(() => { if (!cancelled) setRecentScans([]); });
    return () => { cancelled = true; };
  }, [updateResumeOpen]);
  // Country scope. Defaults to "us" so the feed isn't flooded with international
  const [locationText, setLocationText] = useState<string>("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(locationText.trim()), 400);
    return () => clearTimeout(t);
  }, [locationText]);
  const [workModels, setWorkModels] = useState<Set<string>>(new Set());
  // Seed from the onboarding wizard's experience-level pick (persisted in the
  // browse selection) so an "Entry" choice carries into the feed instead of
  // defaulting to the corpus, which is ~68% mid/senior.
  const [seniorities, setSeniorities] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(JOBS_BROWSE_KEY);
      const sel = raw ? (JSON.parse(raw) as JobsBrowseSelection) : null;
      return sel?.seniority ? new Set([sel.seniority]) : new Set();
    } catch { return new Set(); }
  });
  // Country scope (default US). Persisted so it survives reloads. Replaces the old
  // literal-location US match with the backend's accurate non_us/country filter.
  const [countryScope, setCountryScope] = useState<string>(() => {
    try { return localStorage.getItem(JOBS_COUNTRY_KEY) || "US"; } catch { return "US"; }
  });
  useEffect(() => { try { localStorage.setItem(JOBS_COUNTRY_KEY, countryScope); } catch { /* ignore */ } }, [countryScope]);
  const [empType, setEmpType] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [yearsBucket, setYearsBucket] = useState<string>("any");
  // 3-state eligibility filters: "any" | "required" | "exclude".
  const [clearance, setClearance] = useState<string>("any");
  const [citizenship, setCitizenship] = useState<string>("any");
  // Role-family override for the ranked feed's role chip. null = use the résumé's
  // inferred family (default); "" = broaden to ALL roles; "data"/etc = scope to a
  // chosen family. Sent as ?feed_family= on page 0 (backend honors it there).
  const [familyOverride, setFamilyOverride] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilterKey>("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilterKey>(DEFAULT_AGE_FILTER);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [appliedRefreshKey, setAppliedRefreshKey] = useState(0);
  // Featured-rail company scope (case-insensitive company name). Empty = no scope;
  // set → the feed shows only that company's roles (ranked if a résumé exists).
  const [companyFilter, setCompanyFilter] = useState<string>("");
  // Structured facet + location filters → server query params. `filterSig` keys
  // the cache + re-fetch; score stays client-side (computed field, no DB column).
  const { serverFilterEntries, filterSig } = useMemo(() => {
    const entries: [string, string][] = [];
    // Country scope → the backend's non_us/country filter (not a literal location).
    entries.push(["country", countryScope]);
    if (debouncedLocation) entries.push(["location", debouncedLocation]);
    if (workModels.size) entries.push(["work_model_any", [...workModels].join("|")]);
    // A single experience bucket uses the backend's NULL-inclusive `experience`
    // predicate so unlabeled entry jobs aren't hidden; multi-select falls back to
    // the legacy strict seniority_any.
    if (seniorities.size === 1) {
      const k = [...seniorities][0];
      entries.push(["experience", k]);
      // Also send legacy seniority_any so a not-yet-deployed backend still filters
      // (the new backend prefers `experience` and ignores this).
      const vals = SENIORITY_BUCKETS.find((b) => b.key === k)?.vals as readonly string[] | undefined;
      if (vals?.length) entries.push(["seniority_any", vals.join("|")]);
    } else if (seniorities.size > 1) {
      const senVals = [...seniorities].flatMap(
        (k) => (SENIORITY_BUCKETS.find((b) => b.key === k)?.vals as readonly string[] | undefined) ?? [],
      );
      if (senVals.length) entries.push(["seniority_any", senVals.join("|")]);
    }
    if (empType) entries.push(["employment_type", empType]);
    if (industry) entries.push(["industry", industry]);
    if (yearsBucket !== "any") {
      const yb = YEARS_OPTIONS.find((y) => y.key === yearsBucket);
      if (yb) {
        entries.push(["min_years", String(yb.min)]);
        if (yb.max < 99) entries.push(["max_years", String(yb.max)]);
      }
    }
    if (clearance !== "any") entries.push(["clearance", clearance]);
    if (citizenship !== "any") entries.push(["citizenship", citizenship]);
    // Featured-rail company scope. Sent as a server param like any other facet, so
    // it flows into the cache key (filterSig), the refetch, and pagination at once.
    // The backend treats it specially — overrides role-family scoping.
    if (companyFilter) entries.push(["company", companyFilter]);
    return { serverFilterEntries: entries, filterSig: entries.map(([k, v]) => `${k}=${v}`).join("&") };
  }, [countryScope, debouncedLocation, workModels, seniorities, empType, industry, yearsBucket, clearance, citizenship, companyFilter]);
  const [currentPage, setCurrentPage] = useState(feedPage);
  useEffect(() => { feedPage = currentPage; }, [currentPage]);
  const [loadingMore, setLoadingMore] = useState(false);
  // True while a feed fetch is in flight over an already-visible feed (search /
  // filter refine / background revalidate) — drives the small spinner in the
  // search box so a search never looks like "nothing happened" (we deliberately
  // don't blink to a skeleton when refining; see loadFeed).
  const [revalidating, setRevalidating] = useState(false);

  // ── Background résumé scan (progressive ranking) ──
  // `scanning` drives the slim "ranking…" strip over an already-visible feed;
  // `scanError` drives a non-blocking banner + retry. Both are orthogonal to the
  // FeedState union so the existing feed states are untouched.
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const uploadInFlightRef = useRef<Promise<void> | null>(null);
  const lastUploadFileRef = useRef<File | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

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

  // Interview Prep: which jobs the user already has a prep kit for ("Prep ready"),
  // and launching prep prefilled from a job (fetch detail → seed store → navigate).
  const [prepStatuses, setPrepStatuses] = useState<Record<string, JobPrepStatus>>({});
  const [prepLoadingId, setPrepLoadingId] = useState<string | null>(null);

  const openPrep = useCallback(async (id: string) => {
    setPrepLoadingId(id);
    setBoostError(null);
    try {
      const detail = await fetchJobDetail(id);
      prefillPrepFromJob(detail);
      router.push("/interview-prep/dashboard");
    } catch (err) {
      setBoostError(err instanceof Error ? err.message : "Couldn't load this job to prep");
      setPrepLoadingId(null);
    }
  }, [router]);

  // Load "Prep ready" status for the jobs in the current feed (signed-in only).
  useEffect(() => {
    if (state.status !== "ready" || state.jobs.length === 0) return;
    const ids = state.jobs.map((j) => j.id);
    let cancelled = false;
    void fetchJobPrepStatuses(ids).then((m) => { if (!cancelled) setPrepStatuses(m); });
    return () => { cancelled = true; };
  }, [state]);

  // No-résumé visitor picks/changes their target role. Persist it and let the
  // loadFeed effect (keyed on roleQuery) refetch the role-scoped browse feed.
  const submitBrowse = useCallback((sel: JobsBrowseSelection) => {
    try {
      localStorage.setItem(JOBS_BROWSE_KEY, JSON.stringify(sel));
      if (sel.role.trim()) localStorage.setItem(JOBS_ROLE_KEY, sel.role.trim());
    } catch { /* quota */ }
    feedCache = null;
    setBrowseSel(sel);
    setSeniorities(sel.seniority ? new Set([sel.seniority]) : new Set());
    // Keep the wizard mounted while the feed loads — loadFeed swaps to "ready"
    // when results land instead of flashing a skeleton here.
    setRoleQuery(sel.role.trim());
  }, []);

  const changeRole = useCallback(() => {
    try { localStorage.removeItem(JOBS_ROLE_KEY); localStorage.removeItem(JOBS_BROWSE_KEY); } catch { /* ignore */ }
    feedCache = null;
    setBrowseSel(null);
    setFamilyOverride(null);
    setRoleQuery("");
    setState({ status: "needs-role" });
  }, []);

  // Featured-rail tile click: toggle the company scope. Clicking the active tile
  // (or the rail's Clear control) passes the selected company again → clears it.
  // companyFilter is part of serverFilterEntries/filterSig, so the loadFeed effect
  // refetches the company-scoped feed (ranked if a résumé exists, else browsed).
  const handleCompanySelect = useCallback((company: string) => {
    setCompanyFilter((prev) => (prev.trim().toLowerCase() === company.trim().toLowerCase() ? "" : company));
    setCurrentPage(0);
  }, []);

  // `quiet`: skip the skeleton and merge the result in place (keeps status
  // "ready" so scroll/lazy-window aren't reset) — used for the post-upload ranked
  // upgrade. In quiet mode any failure rethrows instead of wiping the feed.
  const loadFeed = useCallback(async (force = false, quiet = false) => {
    const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
    const cacheKey = browseFeedCacheKey(days, roleQuery, browseSel, rankAnalysisId, debouncedSearch, filterSig + (familyOverride !== null ? `|ff:${familyOverride}` : ""));
    // Stale-while-revalidate: show the cached feed INSTANTLY on remount/return
    // (no skeleton), and only refetch in the background when it has gone stale.
    // The skeleton path is reserved for a genuine cold load with nothing to show.
    const cached = feedCache && feedCache.key === cacheKey ? feedCache : null;
    if (!force && cached) {
      setState(cached.data);
      if (Date.now() - cached.at < FEED_TTL_MS) return; // fresh enough — done
      // stale → keep it on screen and revalidate quietly below
    }
    // Don't blink to a skeleton when refining a search/filter over a feed that's
    // already on screen — keep it visible and swap in the new results when they
    // land (the final setState applies them). Skeleton only on a true cold load.
    // Keep the onboarding wizard (needs-role / no-resume) on screen while the
    // first browse feed loads — only skeleton on a true cold load with nothing
    // to show yet.
    if (!quiet && !cached) {
      setState((prev) =>
        prev.status === "ready" || prev.status === "needs-role" || prev.status === "no-resume"
          ? prev
          : { status: "loading" },
      );
    }
    setRevalidating(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const params = new URLSearchParams();
      if (days) params.set("max_age_days", String(days));
      if (roleQuery) params.set("role", roleQuery);
      if (rankAnalysisId) params.set("analysis_id", rankAnalysisId); // rank against a chosen past scan
      appendBrowseParams(params, browseSel, false); // ranked feed: role_family scoping + résumé ranking, NOT the wizard's narrow title aliases / hidden work-model
      if (familyOverride !== null) params.set("feed_family", familyOverride); // role-chip pick: "" broadens to all roles, else scope to it
      if (debouncedSearch) params.set("title_any", debouncedSearch); // search the DB by title across all roles
      serverFilterEntries.forEach(([k, v]) => params.set(k, v)); // facet filters → server (DB-wide)
      const qs = params.toString() ? `?${params.toString()}` : "";
      const resp = await fetch(apiUrl(`/api/jobs/feed${qs}`), { headers });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        // In quiet mode never swap the visible feed for an empty/state screen —
        // surface the failure to the caller instead so it can show a banner.
        if (!quiet) {
          // Only the backend's explicit "no saved analysis" codes mean the user
          // needs a scan — a bare 404 can be an API deploy that predates the route.
          if (resp.status === 404 && (body?.error === "no_resume_analysis" || body?.error === "no_resume_text")) {
            feedCache = null;
            setState({ status: "no-resume" });
            return;
          }
          // Jobs require sign-in (backend 401s anonymous feed requests). Show an
          // in-view sign-in prompt rather than bouncing to the marketing landing.
          // Don't bounce to sign-in on a transient 401 during a background
          // revalidation when we already have a feed shown (Supabase token-refresh
          // races) — keep the stale feed; the auth effect re-loads on real changes.
          if (resp.status === 401 && !cached) {
            feedCache = null;
            setState({ status: "signin" });
            return;
          }
        }
        throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // Signed-in, no résumé, no role chosen yet → ask which role to search first.
      if (data?.needsRole) {
        if (quiet) throw new Error("needs_role");
        feedCache = null;
        setState({ status: "needs-role" });
        return;
      }
      const ready: FeedReady = {
        status: "ready",
        jobs: Array.isArray(data?.jobs) ? data.jobs : [],
        generatedAt: data?.generatedAt || "",
        profileLocations: Array.isArray(data?.profileLocations) ? data.profileLocations : [],
        // Backend omits/false `ranked` for the no-résumé role-browse feed
        // (no match scores). Default true so the ranked path is unaffected.
        ranked: data?.ranked !== false,
        role: typeof data?.role === "string" && data.role ? data.role : (roleQuery || undefined),
        hasMore: data?.hasMore === true,
        nextOffset: typeof data?.nextOffset === "number" ? data.nextOffset : undefined,
        feedFamily: typeof data?.feedFamily === "string" ? data.feedFamily : "",
        totalMatching: typeof data?.totalMatching === "number" ? data.totalMatching : undefined,
      };
      feedCache = { key: cacheKey, at: Date.now(), data: ready };
      // Quiet upgrade: apply over the visible feed (status stays "ready" so the
      // lazy-load window + scroll survive) or over a skeleton if no warm feed
      // landed first; but if the user navigated elsewhere, leave that alone.
      setState((prev) =>
        !quiet || prev.status === "ready" || prev.status === "loading" ? ready : prev,
      );
    } catch (err) {
      if (quiet) throw err; // caller (résumé scan) keeps the feed + shows a banner
      if (cached) return;   // background revalidation failed → keep the stale feed
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load jobs" });
    } finally {
      setRevalidating(false);
    }
  }, [ageFilter, roleQuery, browseSel, rankAnalysisId, debouncedSearch, filterSig, serverFilterEntries, familyOverride]);

  // "Outside your filters" fallback. When the current search + filters yield an
  // empty list, fetch a RELAXED set — same search intent + résumé ranking, but
  // NO facet filters and NO posting-age cap — and show it in a separate section
  // so the user never hits a dead-end empty state. Country/state/score/etc. are
  // deliberately NOT applied to this set (it IS the out-of-filters bucket).
  const [fallback, setFallback] = useState<{ jobs: FeedJob[]; loading: boolean; key: string }>(
    { jobs: [], loading: false, key: "" },
  );
  const loadFallback = useCallback(async () => {
    const fkey = `${debouncedSearch}|${roleQuery}|${rankAnalysisId}`;
    setFallback((f) => (f.key === fkey && (f.loading || f.jobs.length) ? f : { jobs: [], loading: true, key: fkey }));
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setFallback({ jobs: [], loading: false, key: fkey }); return; }
      const params = new URLSearchParams();
      // No max_age_days → widest posting window; keep search + role + ranking.
      if (roleQuery) params.set("role", roleQuery);
      if (rankAnalysisId) params.set("analysis_id", rankAnalysisId);
      appendBrowseParams(params, browseSel, false); // relaxed fallback: no hard title/work-model scope
      if (debouncedSearch) params.set("title_any", debouncedSearch);
      if (companyFilter) params.set("company", companyFilter); // keep the fallback inside the company scope
      const resp = await fetch(apiUrl(`/api/jobs/feed?${params.toString()}`), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) { setFallback({ jobs: [], loading: false, key: fkey }); return; }
      const data = await resp.json();
      const jobs: FeedJob[] = Array.isArray(data?.jobs) ? data.jobs : [];
      setFallback({ jobs, loading: false, key: fkey });
    } catch {
      setFallback({ jobs: [], loading: false, key: fkey });
    }
  }, [debouncedSearch, roleQuery, rankAnalysisId, browseSel, companyFilter]);

  useEffect(() => {
    // Refetch whenever loadFeed's inputs change (search, filters, role, age…).
    // NOTE: previously guarded by `if (uploadInFlightRef.current) return` to keep
    // a background scan from re-entering the skeleton path — but loadFeed no
    // longer skeleton-flashes when a feed is already shown, and that guard
    // silently swallowed EVERY search/filter refetch whenever a scan ref lingered
    // (e.g. a hung "Update résumé"), making the search box appear dead. The scan
    // path still drives its own unranked→ranked load explicitly via loadFeedRef.
    void loadFeed();
  }, [loadFeed]);

  // Re-fetch when the user signs in/out *while on this page* — e.g. the Google
  // OAuth redirect lands back on /?view=jobs and Supabase establishes the
  // session a beat after JobsFeed has already mounted (and possibly 401'd into
  // the signed-out hero). Without this, the feed only fetches once on mount and
  // the hero stays stuck even though the user is now signed in. supabase-js
  // emits INITIAL_SESSION (not SIGNED_IN) on a normal load, so this won't
  // double-fetch the common already-signed-in case.
  const loadFeedRef = useRef(loadFeed);
  useEffect(() => { loadFeedRef.current = loadFeed; }, [loadFeed]);

  // Latest roleQuery, so a background scan can detect the user changing role
  // mid-flight and abandon its stale result.
  const roleQueryRef = useRef(roleQuery);
  useEffect(() => { roleQueryRef.current = roleQuery; }, [roleQuery]);

  // Wizard prefetch: warm the feed for the in-progress selection while the user
  // is still on the role/location steps, so the feed is instant on upload.
  const prefetchBrowse = useCallback((sel: JobsBrowseSelection) => {
    if (!sel.role.trim()) return;
    const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
    void warmFeed(sel, days);
  }, [ageFilter]);

  // Progressive ranking: on résumé upload, show the (prefetched) role/location
  // feed IMMEDIATELY with a "ranking…" strip, run analyze-upload in the
  // background, then upgrade to the ranked feed in place — no skeleton, no scroll
  // reset. Failures keep the unranked feed + show a retry banner.
  const startResumeRanking = useCallback((sel: JobsBrowseSelection, file: File) => {
    try {
      localStorage.setItem(JOBS_BROWSE_KEY, JSON.stringify(sel));
      if (sel.role.trim()) localStorage.setItem(JOBS_ROLE_KEY, sel.role.trim());
      localStorage.removeItem(JOBS_RANK_ANALYSIS_KEY); // fresh scan = new latest; clear any chosen-scan override
    } catch { /* quota */ }
    setRankAnalysisId("");
    lastUploadFileRef.current = file;
    setScanError(null);
    setScanning(true);
    setBrowseSel(sel);
    setSeniorities(sel.seniority ? new Set([sel.seniority]) : new Set());
    setFamilyOverride(null); // a new résumé re-derives its own family
    setRoleQuery(sel.role.trim());

    // 1) Show matches now: warm cache if present, else a quick unranked fetch.
    const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
    const key = browseFeedCacheKey(days, sel.role.trim(), sel);
    if (feedCache && feedCache.key === key) {
      setState(feedCache.data);
    } else {
      setState({ status: "loading" });
      void warmFeed(sel, days).then(() => {
        if (!mountedRef.current || roleQueryRef.current !== sel.role.trim()) return;
        if (feedCache && feedCache.key === key) setState((prev) => (prev.status === "loading" ? feedCache!.data : prev));
      });
    }

    // 2) Background: persist the analysis, then ranked upgrade in place.
    const p = (async () => {
      try {
        const { seniorityGuess } = await analyzeResumeUpload(file);
        if (!mountedRef.current || roleQueryRef.current !== sel.role.trim()) return;
        // Auto-default the experience-level filter from the résumé when the user
        // skipped the wizard's level step ("Any") — so a new-grad isn't buried
        // under senior roles even without an explicit pick. Persist it onto the
        // selection so it survives remounts.
        if (!sel.seniority && seniorityGuess && SENIORITY_BUCKET_VALS[seniorityGuess]) {
          setSeniorities(new Set([seniorityGuess]));
          const next = { ...sel, seniority: seniorityGuess };
          try { localStorage.setItem(JOBS_BROWSE_KEY, JSON.stringify(next)); } catch { /* quota */ }
          setBrowseSel(next);
        }
        feedCache = null; // cache key has no ranked dimension — force the ranked refetch
        await loadFeedRef.current(true, true); // force + quiet (merge in place)
      } catch (err) {
        if (!mountedRef.current || roleQueryRef.current !== sel.role.trim()) return;
        setScanError(err instanceof Error ? err.message : "Couldn't rank against your résumé.");
      } finally {
        if (mountedRef.current && roleQueryRef.current === sel.role.trim()) setScanning(false);
        uploadInFlightRef.current = null;
      }
    })();
    uploadInFlightRef.current = p;
  }, [ageFilter]);
  useEffect(() => {
    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        feedCache = null; // never serve a cache from across the auth boundary
        void loadFeedRef.current(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const updateJobMatchScore = useCallback((postingId: string, score: number) => {
    const patchFeed = (feed: FeedReady): FeedReady => ({
      ...feed,
      jobs: feed.jobs.map((job) => (job.id === postingId ? { ...job, matchScore: score } : job)),
    });
    setState((prev) => (prev.status === "ready" ? patchFeed(prev) : prev));
    setBoostJob((prev) => (prev?.id === postingId ? { ...prev, matchScore: score } : prev));
    if (feedCache?.data.status === "ready") {
      feedCache = { ...feedCache, data: patchFeed(feedCache.data) };
    }
  }, []);

  const hideAppliedJob = useCallback((postingId: string) => {
    const patchFeed = (feed: FeedReady): FeedReady => ({
      ...feed,
      jobs: feed.jobs.filter((job) => job.id !== postingId),
      totalMatching: typeof feed.totalMatching === "number" ? Math.max(0, feed.totalMatching - 1) : feed.totalMatching,
    });
    setState((prev) => (prev.status === "ready" ? patchFeed(prev) : prev));
    if (feedCache?.data.status === "ready") {
      feedCache = { ...feedCache, data: patchFeed(feedCache.data) };
    }
    setAppliedRefreshKey((n) => n + 1);
  }, []);

  const trackApplyClick = useCallback(async (postingId: string) => {
    // Optimistically mark as applied immediately
    setAppliedIds((prev) => new Set(prev).add(postingId));
    hideAppliedJob(postingId);
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
  }, [hideAppliedJob]);

  const handleBoostApplied = useCallback((postingId: string, score: number | null) => {
    if (typeof score === "number") updateJobMatchScore(postingId, score);
    void trackApplyClick(postingId);
  }, [trackApplyClick, updateJobMatchScore]);

  const handleBoostResumePromoted = useCallback((_analysisId: string) => {
    feedCache = null;
    setRankAnalysisId("");
    setAppliedRefreshKey((n) => n + 1);
    window.setTimeout(() => void loadFeedRef.current(true, true), 0);
  }, []);

  const visibleJobs = useMemo(() => {
    if (state.status !== "ready") return [];
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
      // NO client-side literal `includes(search)` filter — the SERVER does the
      // title search WITH synonym/semantic expansion, so a substring match here
      // would wrongly drop "Physical Therapist" when the user typed "physio".
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
  }, [state, debouncedSearch, workModels, seniorities, empType, industry, yearsBucket, scoreFilter, sortBy]);

  const topMatchDays = useMemo(() => AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0, [ageFilter]);
  const topMatchWorkModels = useMemo(() => [...workModels], [workModels]);
  const topMatches = useJobTopMatches({
    enabled: state.status === "ready" && state.ranked && !listMode,
    days: topMatchDays,
    countryScope,
    roleQuery,
    search: debouncedSearch,
    companyFilter,
    workModels: topMatchWorkModels,
    analysisId: rankAnalysisId,
    limit: 5,
    refreshKey: appliedRefreshKey,
  });

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
    countryScope, companyFilter, familyOverride,
    locationText, workModels: [...workModels],
    seniorities: [...seniorities],
    empType, industry, yearsBucket, scoreFilter, ageFilter, search, sortBy,
    clearance, citizenship,
  }), [countryScope, companyFilter, familyOverride, locationText, workModels, seniorities, empType, industry, yearsBucket, scoreFilter, ageFilter, search, sortBy, clearance, citizenship]);

  const applySnapshot = useCallback((f: Partial<FilterSnapshot>) => {
    setCountryScope(f.countryScope ?? "US");
    setCompanyFilter(f.companyFilter ?? "");
    setFamilyOverride(f.familyOverride === undefined ? null : f.familyOverride);
    setLocationText(f.locationText ?? "");
    setWorkModels(new Set(f.workModels ?? []));
    setSeniorities(new Set(f.seniorities ?? []));
    setEmpType(f.empType ?? "");
    setIndustry(f.industry ?? "");
    setYearsBucket(f.yearsBucket ?? "any");
    setScoreFilter((f.scoreFilter as ScoreFilterKey) ?? "all");
    setAgeFilter((f.ageFilter as AgeFilterKey) ?? DEFAULT_AGE_FILTER);
    setSearch(f.search ?? "");
    setSortBy((f.sortBy as SortKey) ?? "match");
    setClearance(f.clearance ?? "any");
    setCitizenship(f.citizenship ?? "any");
  }, []);

  const anyFilterActive =
    !!search || !!companyFilter || !!locationText || workModels.size > 0 || seniorities.size > 0 ||
    !!empType || !!industry || yearsBucket !== "any" || scoreFilter !== "all" || ageFilter !== DEFAULT_AGE_FILTER ||
    clearance !== "any" || citizenship !== "any";

  const clearAllFilters = useCallback(() => {
    setSearch(""); setLocationText(""); setWorkModels(new Set()); setSeniorities(new Set());
    setEmpType(""); setIndustry(""); setYearsBucket("any"); setScoreFilter("all"); setAgeFilter(DEFAULT_AGE_FILTER);
    setClearance("any"); setCitizenship("any"); setCompanyFilter("");
  }, []);

  // Reset to the first page whenever the filtered result set changes — but NOT on
  // the initial mount, so selecting a job (which remounts this component) restores
  // the persisted page instead of snapping back to page 1.
  const filterMountRef = useRef(false);
  useEffect(() => {
    if (!filterMountRef.current) { filterMountRef.current = true; return; }
    setCurrentPage(0);
  }, [search, companyFilter, locationText, workModels, seniorities, empType, industry, yearsBucket, clearance, citizenship, sortBy, scoreFilter, ageFilter]);

  // Numbered pagination over the loaded set (PAGE_SIZE per page). `serverHasMore`
  // means the backend has further pages past what we've fetched (the 600-cap is
  // per-page — see api_jobs_feed offset pagination); crossing into them fetches on
  // demand. Clamp the page if the loaded set shrank under it (filter/revalidate).
  const serverHasMore = state.status === "ready" && !!state.hasMore && typeof state.nextOffset === "number";
  const loadedPages = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  useEffect(() => {
    if (currentPage > loadedPages - 1) setCurrentPage(Math.max(0, loadedPages - 1));
  }, [loadedPages, currentPage]);
  const pagedJobs = useMemo(
    () => visibleJobs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [visibleJobs, currentPage],
  );
  const canPrev = currentPage > 0;
  const canNext = (currentPage + 1) * PAGE_SIZE < visibleJobs.length || serverHasMore;

  // Drive the "outside your filters" fallback: when the visible result is empty
  // AND a filter/search is narrowing things, fetch the relaxed set; otherwise
  // clear it so it never lingers under a populated feed.
  useEffect(() => {
    // Fire whenever the visible list is empty — the default US + past-month are
    // themselves filters that can empty the feed (the common case), so don't gate
    // on an *explicit* filter. loadFallback returns [] when even the relaxed set
    // is empty, so the section simply won't render then.
    if (state.status === "ready" && pagedJobs.length === 0) {
      void loadFallback();
    } else {
      setFallback((f) => (f.jobs.length || f.loading ? { jobs: [], loading: false, key: "" } : f));
    }
  }, [state.status, pagedJobs.length, debouncedSearch, filterSig, ageFilter, loadFallback]);

  // Why a fallback job is outside the current filters (cheap, best-effort tag).
  const outsideReason = useCallback((job: FeedJob): string => {
    const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
    if (days && job.postedAt) {
      const ageDays = (Date.now() - Date.parse(job.postedAt)) / 86_400_000;
      if (ageDays > days) return "📅 Older posting";
    }
    if (workModels.size > 0 && job.workModel && !workModels.has(job.workModel)) return "🏢 Other work model";
    return "Outside your filters";
  }, [ageFilter, workModels]);

  // Shared card renderer — used by the main list and the "outside your filters"
  // fallback section. `reasonChip` adds a muted tag explaining why a fallback
  // job didn't match the active filters.
  const renderJobCard = (job: FeedJob, reasonChip?: string) => {
    const salary = formatSalary(job);
    const posted = formatPostedAt(job.postedAt);
    return (
      <Card
        key={job.id}
        onClick={() => router.push(`/?view=jobs&job=${encodeURIComponent(job.id)}`)}
        style={{
          cursor: "pointer",
          ...(job.id === selectedJobId
            ? { outline: "2px solid var(--accent)", outlineOffset: -1, background: "var(--accent-bg)" }
            : null),
        }}
      >
        <CardContent
          style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <CompanyLogo company={job.company} companyDomain={job.companyDomain || ""} slug={job.companySlug || ""} size={44} radius={10} />
          <div style={{ flex: isMobile ? "1 1 140px" : "1 1 240px", minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>{job.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 500 }}>{job.company}</span>
              {job.location && <span>· {job.location}</span>}
              {posted && <span>· {posted}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
              {reasonChip && (
                <Badge style={{ fontSize: 11, background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--surface2)" }}>
                  {reasonChip}
                </Badge>
              )}
              {salary && <Badge variant="secondary" style={{ fontSize: 11 }}>{salary}</Badge>}
              {job.workModel && WORK_MODEL_LABEL[job.workModel] && (
                <Badge variant="secondary" style={{ fontSize: 11 }}>{WORK_MODEL_LABEL[job.workModel]}</Badge>
              )}
              {job.seniority && SENIORITY_LABEL[job.seniority] && (
                <Badge variant="secondary" style={{ fontSize: 11 }}>{SENIORITY_LABEL[job.seniority]}</Badge>
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
          {!listMode && (
            <div style={{ flexShrink: 0, display: "flex", flexDirection: isMobile ? "row" : "column", gap: 7, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap", width: isMobile ? "100%" : "auto" }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void openBoost(job.id); }}
                disabled={boostLoadingId === job.id}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "none",
                  background: "#c4793a", color: "#fff",
                  cursor: boostLoadingId === job.id ? "wait" : "pointer", whiteSpace: "nowrap",
                  opacity: boostLoadingId === job.id ? 0.7 : 1, fontFamily: "inherit",
                  flex: isMobile ? "1 1 auto" : undefined,
                }}
              >
                {boostLoadingId === job.id ? "Loading…" : "✦ Optimize"}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void openPrep(job.id); }}
                disabled={prepLoadingId === job.id}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
                  border: prepStatuses[job.id]
                    ? "1px solid color-mix(in srgb, var(--green-ink) 35%, transparent)"
                    : "1px solid var(--surface2)",
                  background: prepStatuses[job.id]
                    ? "color-mix(in srgb, var(--green-ink) 10%, transparent)"
                    : "transparent",
                  color: prepStatuses[job.id] ? "var(--green-ink)" : "var(--text)",
                  cursor: prepLoadingId === job.id ? "wait" : "pointer", whiteSpace: "nowrap",
                  opacity: prepLoadingId === job.id ? 0.7 : 1, fontFamily: "inherit",
                  flex: isMobile ? "1 1 auto" : undefined,
                }}
              >
                {prepLoadingId === job.id ? "Loading…" : prepStatuses[job.id] ? "🎤 Prep ready" : "🎤 Prep interview"}
              </button>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); void trackApplyClick(job.id); }}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 8, textAlign: "center",
                  flex: isMobile ? "1 1 100%" : undefined,
                  border: appliedIds.has(job.id)
                    ? "1px solid color-mix(in srgb, var(--green-ink) 35%, transparent)"
                    : "1px solid var(--surface2)",
                  color: appliedIds.has(job.id) ? "var(--green-ink)" : "var(--text)",
                  background: appliedIds.has(job.id)
                    ? "color-mix(in srgb, var(--green-ink) 10%, transparent)"
                    : "transparent",
                  textDecoration: "none", whiteSpace: "nowrap",
                  transition: "color 0.15s, border-color 0.15s, background 0.15s",
                }}
              >
                {appliedIds.has(job.id) ? "Applied ✓" : "View & apply ↗"}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Count label: "342 of 9,338 jobs" when the backend reports the feed-scope
  // total (server count over the same family/location/recency) and the visible
  // set is a subset — i.e. the page cap and/or an active client filter (country,
  // search, …) is hiding some. Falls back to "342+ jobs" / "342 jobs" when the
  // backend sent no total (older API, or the count query failed). visibleJobs is
  // a subset of the loaded page, which is a subset of the total, so total is
  // always ≥ visible.
  const totalMatching = state.status === "ready" ? state.totalMatching : undefined;
  // Show the count of cards actually RENDERED (the page), not the full loaded-
  // and-client-filtered window (which produced a confusing middle number like
  // "427"). Reads "Showing 20 of 12,374 jobs" and grows as you Load more.
  const shownCount = pagedJobs.length;
  const rangeStart = shownCount === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = currentPage * PAGE_SIZE + shownCount;
  const totalLabel =
    typeof totalMatching === "number"
      ? totalMatching.toLocaleString()
      : `${visibleJobs.length.toLocaleString()}${serverHasMore ? "+" : ""}`;
  const jobWord = `job${(totalMatching ?? shownCount) === 1 ? "" : "s"}`;
  // "Showing 21–40 of 12,374 jobs" — the current page's range, not a cumulative count.
  const feedCountLabel = `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${totalLabel} ${jobWord}`;

  // Flicker guard: when a search/filter empties the main feed, the "outside your
  // filters" fallback fetches in the background. Show a loading skeleton (NOT the
  // "No openings" card) until that fallback settles, so the feed never flashes an
  // empty "no results" state mid-search.
  const fallbackFkey = `${debouncedSearch}|${roleQuery}|${rankAnalysisId}`;
  const fallbackSettled = fallback.key === fallbackFkey && !fallback.loading;
  const mainEmpty = state.status === "ready" && state.jobs.length === 0;
  const showEmptyCard = mainEmpty && fallbackSettled && fallback.jobs.length === 0;
  const showFeedLoading = mainEmpty && !fallbackSettled && fallback.jobs.length === 0;

  // Fetch the next backend page and append (dedup by id). Mirrors loadFeed's
  // params + offset + the echoed feed_family so the page scopes the same set.
  const loadMoreFromServer = useCallback(async () => {
    if (state.status !== "ready" || !state.hasMore || typeof state.nextOffset !== "number" || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const headers: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const days = AGE_FILTERS.find((f) => f.key === ageFilter)?.days ?? 0;
      const params = new URLSearchParams();
      if (days) params.set("max_age_days", String(days));
      if (roleQuery) params.set("role", roleQuery);
      if (rankAnalysisId) params.set("analysis_id", rankAnalysisId); // keep paging ranked against the same scan
      appendBrowseParams(params, browseSel, false); // ranked paging: match loadFeed's scope (no wizard hard filters)
      if (debouncedSearch) params.set("title_any", debouncedSearch); // page the same DB search
      serverFilterEntries.forEach(([k, v]) => params.set(k, v)); // page the same facet filters
      params.set("offset", String(state.nextOffset));
      params.set("feed_family", state.feedFamily ?? "");
      const resp = await fetch(apiUrl(`/api/jobs/feed?${params.toString()}`), { headers });
      if (!resp.ok) return;
      const data = await resp.json();
      const more: FeedJob[] = Array.isArray(data?.jobs) ? data.jobs : [];
      const cacheKey = browseFeedCacheKey(
        days, roleQuery, browseSel, rankAnalysisId, debouncedSearch,
        filterSig + (familyOverride !== null ? `|ff:${familyOverride}` : ""),
      );
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        const seen = new Set(prev.jobs.map((j) => j.id));
        const fresh = more.filter((j) => j && !seen.has(j.id));
        const next: FeedReady = {
          ...prev,
          jobs: [...prev.jobs, ...fresh],
          hasMore: data?.hasMore === true,
          nextOffset: typeof data?.nextOffset === "number" ? data.nextOffset : undefined,
          feedFamily: typeof data?.feedFamily === "string" ? data.feedFamily : prev.feedFamily,
          // Total is the same across pages — keep page-0's if a later page omits it.
          totalMatching: typeof data?.totalMatching === "number" ? data.totalMatching : prev.totalMatching,
        };
        // Persist appended pages in the module cache so a tab switch / remount
        // doesn't rewind to page 0 only.
        if (feedCache?.key === cacheKey) feedCache = { key: cacheKey, at: Date.now(), data: next };
        return next;
      });
    } catch {
      /* keep the current feed on failure */
    } finally {
      setLoadingMore(false);
    }
  }, [state, loadingMore, ageFilter, roleQuery, browseSel, rankAnalysisId, debouncedSearch, serverFilterEntries, filterSig, familyOverride]);

  // Page controls: within the loaded set we just move the window; stepping past the
  // last loaded page fetches the next server page first, then advances.
  const goToPage = useCallback(async (p: number) => {
    const target = Math.max(0, p);
    if (target * PAGE_SIZE >= visibleJobs.length && serverHasMore) await loadMoreFromServer();
    setCurrentPage(target);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [visibleJobs.length, serverHasMore, loadMoreFromServer]);

  // Signed-out visitors get one focused sign-in moment — no dashboard header,
  // tabs, Refresh, or résumé-ranking copy (which assumes a résumé they lack).
  if (state.status === "signin") {
    return (
      <SignedOutJobsHero
        count={publicCount}
        onSignIn={() =>
          openSignIn({
            title: "Sign in to browse jobs",
            reason: "See live openings from company career boards and rank them against your résumé. Free — no credit card.",
          })
        }
      />
    );
  }

  // In-place résumé scan (the design replaces the cross-page jump to Analyze).
  // Seeded from any role/location already chosen while browsing so re-entry from
  // the unranked feed's "Scan my résumé" opens straight on the résumé step.
  const hasBrowseRole = !!browseSel?.role?.trim();
  const onboardingWizard = (
    <JobsOnboardingWizard
      initialStep={hasBrowseRole ? 4 : 1}
      initialRole={browseSel?.role ?? ""}
      initialRoleTerms={browseSel?.titleTerms ?? null}
      initialLocation={browseSel?.location ?? ""}
      initialMetroTerms={browseSel?.locationTerms ?? null}
      initialWorkModel={browseSel?.workModel ?? ""}
      initialSeniority={browseSel?.seniority ?? ""}
      onBrowse={submitBrowse}
      onResumeUploadStart={startResumeRanking}
      onPrefetch={prefetchBrowse}
    />
  );

  return (
    <div style={listMode
      ? { width: "100%", display: "flex", flexDirection: "column" }
      : { maxWidth: 1240, margin: "0 auto", padding: isMobile ? "18px 14px 88px" : "28px 20px 64px", width: "100%", display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 28, alignItems: isMobile ? "stretch" : "flex-start" }}>
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
      {!listMode ? (
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Jobs for you</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            {state.status === "needs-role"
              ? "Pick a role to see live openings — or scan your résumé to auto-match and rank by fit."
              : state.status === "ready" && state.ranked === false
              ? "Live openings from company career boards. Scan your résumé to rank them by fit and unlock match scores."
              : "Live openings ranked against your latest analyzed résumé. Apply on the company's site — we hand you the match, you make the call."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {state.status === "ready" && state.ranked && (
            <Button variant="outline" size="sm" onClick={() => setUpdateResumeOpen(true)} disabled={scanning}>
              Update résumé
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void loadFeed(true)} disabled={state.status === "loading"}>
            Refresh
          </Button>
        </div>
      </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
            {state.status === "ready" ? feedCountLabel : "Jobs"}
          </span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {state.status === "ready" && state.ranked && (
              <Button variant="outline" size="sm" onClick={() => setUpdateResumeOpen(true)} disabled={scanning}>
                Update résumé
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadFeed(true)} disabled={state.status === "loading"}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* "Top companies hiring" rail — recognizable companies with live roles,
          shown on landing in every signed-in state (ranked, browse, needs-role).
          Clicking a tile scopes the feed to that company. */}
      {!listMode && (
        <FeaturedCompaniesRail selected={companyFilter} onSelect={handleCompanySelect} />
      )}

      <Dialog open={updateResumeOpen} onOpenChange={setUpdateResumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update your résumé</DialogTitle>
            <DialogDescription>
              Rank these jobs against a different scan, or upload a new one. Your role and filters stay the same.
            </DialogDescription>
          </DialogHeader>
          {recentScans && recentScans.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted)" }}>Recent scans</span>
              <div style={{ maxHeight: 236, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 }}>
                {recentScans.map((scan) => {
                  const isActive = scan.id === (rankAnalysisId || recentScans[0]?.id);
                  const sc = scanScoreStyle(scan.score);
                  // Labels are usually the résumé's full contact header
                  // ("NAME | phone | email | linkedin…") — show just the name
                  // (first segment) so the row isn't a wall of contact text.
                  const rawLabel = (scan.label || scan.sourceFilename || "Résumé scan").trim();
                  const label = rawLabel.split("|")[0].trim() || rawLabel;
                  return (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => {
                        if (!isActive) {
                          try { localStorage.setItem(JOBS_RANK_ANALYSIS_KEY, scan.id); } catch { /* quota */ }
                          setRankAnalysisId(scan.id);
                        }
                        setUpdateResumeOpen(false);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        border: isActive ? "2px solid var(--accent)" : "1px solid var(--surface2)",
                        background: isActive ? "var(--accent-bg, color-mix(in srgb, var(--accent) 7%, transparent))" : "var(--surface)",
                      }}
                    >
                      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {scan.score != null ? scan.score : "—"}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{scanTimeAgo(scan.createdAt)}</span>
                      </span>
                      {isActive
                        ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>✓ Now ranking</span>
                        : <span style={{ flexShrink: 0, fontSize: 12, color: "var(--muted)" }}>Use →</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--surface2)" }} />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>or upload a new one</span>
                <div style={{ flex: 1, height: 1, background: "var(--surface2)" }} />
              </div>
            </div>
          )}
          <label
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "22px 16px", border: "1.5px dashed var(--accent)",
              background: "var(--accent-bg, color-mix(in srgb, var(--accent) 6%, transparent))",
              borderRadius: 12, cursor: "pointer", textAlign: "center",
            }}
          >
            <input
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!f) return;
                setUpdateResumeOpen(false);
                const sel: JobsBrowseSelection = browseSel ?? { role: "", titleTerms: [], location: "", locationTerms: [], workModel: "", seniority: "" };
                startResumeRanking(sel, f);
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Choose résumé (PDF)</span>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>We&apos;ll re-score every job against the new résumé.</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateResumeOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {state.status === "ready" && (
        <div style={{ margin: listMode ? "10px 0 12px" : "18px 0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Row 1 — keyword + location (LinkedIn/Indeed style) */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: listMode ? undefined : 340, minWidth: 0 }}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setDebouncedSearch(search.trim()); }}
                placeholder="Search title or company…  (Enter to search)"
                style={{ width: "100%", paddingRight: revalidating ? 32 : undefined }}
              />
              {revalidating && (
                <span aria-hidden style={{
                  position: "absolute", right: 10, top: "calc(50% - 8px)", width: 15, height: 15,
                  borderRadius: "50%", border: "2px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite", pointerEvents: "none",
                }} />
              )}
            </div>
            <FilterMenu label={COUNTRY_LABEL(countryScope)} active={countryScope !== "US"} onClear={() => setCountryScope("US")} width={220}>
              {COUNTRIES.map((c) => (
                <MenuOption key={c.key} label={c.label} selected={countryScope === c.key} onClick={() => setCountryScope(c.key)} />
              ))}
            </FilterMenu>
            <FilterMenu
              label={locationText ? `📍 ${locationText}` : "📍 City"}
              active={!!locationText}
              onClear={() => setLocationText("")}
              width={260}
            >
              <LocationPicker value={locationText} onChange={setLocationText} />
            </FilterMenu>
          </div>

          {/* Row 2 — filter dropdowns */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <FilterMenu label={`Date: ${AGE_FILTERS.find((f) => f.key === ageFilter)?.label ?? "Any"}`} active={ageFilter !== DEFAULT_AGE_FILTER} onClear={() => setAgeFilter(DEFAULT_AGE_FILTER)} width={180}>
              {AGE_FILTERS.map((f) => (
                <MenuOption key={f.key} label={f.label} selected={ageFilter === f.key} onClick={() => setAgeFilter(f.key)} />
              ))}
            </FilterMenu>

            <FilterMenu label="Work model" count={workModels.size} onClear={() => setWorkModels(new Set())} width={180}>
              {WORK_MODELS.map((w) => (
                <MenuOption key={w.key} label={w.label} multi selected={workModels.has(w.key)} onClick={() => toggleInSet(setWorkModels, w.key)} />
              ))}
            </FilterMenu>

            <FilterMenu label="Experience" count={seniorities.size} onClear={() => setSeniorities(new Set())} width={180}>
              {SENIORITY_BUCKETS.map((b) => (
                <MenuOption key={b.key} label={b.label} multi selected={seniorities.has(b.key)} onClick={() => toggleInSet(setSeniorities, b.key)} />
              ))}
            </FilterMenu>

            <FilterMenu label={empType ? (EMPLOYMENT_OPTIONS.find((o) => o.key === empType)?.label ?? "Job type") : "Job type"} active={!!empType} onClear={() => setEmpType("")} width={190}>
              {EMPLOYMENT_OPTIONS.map((o) => (
                <MenuOption key={o.key || "any"} label={o.label} selected={empType === o.key} onClick={() => setEmpType(o.key)} />
              ))}
            </FilterMenu>

            <FilterMenu
              label="More"
              count={(yearsBucket !== "any" ? 1 : 0) + (industry ? 1 : 0) + (state.ranked && scoreFilter !== "all" ? 1 : 0) + (clearance !== "any" ? 1 : 0) + (citizenship !== "any" ? 1 : 0)}
              onClear={() => { setYearsBucket("any"); setIndustry(""); setScoreFilter("all"); setClearance("any"); setCitizenship("any"); }}
              width={210}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", padding: "2px 9px 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>🔒 Security clearance</div>
              <MenuOption label="Any" selected={clearance === "any"} onClick={() => setClearance("any")} />
              <MenuOption label="Required only" selected={clearance === "required"} onClick={() => setClearance("required")} />
              <MenuOption label="Exclude (no clearance)" selected={clearance === "exclude"} onClick={() => setClearance("exclude")} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", padding: "8px 9px 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>🇺🇸 US citizenship</div>
              <MenuOption label="Any" selected={citizenship === "any"} onClick={() => setCitizenship("any")} />
              <MenuOption label="Required only" selected={citizenship === "required"} onClick={() => setCitizenship("required")} />
              <MenuOption label="Exclude (not required)" selected={citizenship === "exclude"} onClick={() => setCitizenship("exclude")} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", padding: "8px 9px 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Experience years</div>
              {YEARS_OPTIONS.map((o) => (
                <MenuOption key={o.key} label={o.label} selected={yearsBucket === o.key} onClick={() => setYearsBucket(o.key)} />
              ))}
              {state.ranked && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", padding: "8px 9px 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Match score</div>
                  {SCORE_FILTERS.map((f) => (
                    <MenuOption key={f.key} label={f.label} selected={scoreFilter === f.key} onClick={() => setScoreFilter(f.key)} />
                  ))}
                </>
              )}
              {industryOptions.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", padding: "8px 9px 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Industry</div>
                  <MenuOption label="Any industry" selected={!industry} onClick={() => setIndustry("")} />
                  {industryOptions.map((ind) => (
                    <MenuOption key={ind} label={ind} selected={industry === ind} onClick={() => setIndustry(ind)} />
                  ))}
                </>
              )}
            </FilterMenu>

            {anyFilterActive && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{ fontSize: 12.5, padding: "7px 8px", borderRadius: 8, border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
              >
                Clear all
              </button>
            )}

            {state.status === "ready" && state.ranked && (
              <FilterMenu
                label={`📋 ${state.feedFamily ? (FEED_FAMILY_LABELS[state.feedFamily] ?? state.feedFamily) : "All roles"}`}
                width={220}
                active={familyOverride !== null}
                onClear={familyOverride !== null ? () => setFamilyOverride(null) : undefined}
              >
                <MenuOption label="Match my résumé" selected={familyOverride === null} onClick={() => setFamilyOverride(null)} />
                <MenuOption label="All roles" selected={familyOverride === ""} onClick={() => setFamilyOverride("")} />
                {Object.entries(FEED_FAMILY_LABELS)
                  .filter(([k]) => k !== "general")
                  .map(([k, lbl]) => (
                    <MenuOption key={k} label={lbl} selected={familyOverride === k} onClick={() => setFamilyOverride(k)} />
                  ))}
              </FilterMenu>
            )}

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <FilterMenu label={`Sort: ${SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? "Best match"}`} align="right" width={170}>
                {SORT_OPTIONS.map((s) => (
                  <MenuOption key={s.key} label={s.label} selected={sortBy === s.key} onClick={() => setSortBy(s.key)} />
                ))}
              </FilterMenu>
              {!listMode && (
                <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {feedCountLabel}
                </span>
              )}
            </div>
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

        {/* Progressive ranking: slim strip while the résumé scan runs in the
            background over the already-visible feed. */}
        {state.status === "ready" && scanning && (
          <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)", background: "color-mix(in srgb, var(--accent) 5%, var(--surface))", padding: "11px 16px", display: "flex", alignItems: "center", gap: 11 }}>
            <span aria-hidden style={{ display: "inline-block", width: 15, height: 15, flexShrink: 0, borderRadius: "50%", border: "2px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderTopColor: "var(--accent)", animation: "rn-spin 0.7s linear infinite" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
              {state.ranked ? "Re-ranking against your new résumé…" : "Ranking these against your résumé…"}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>scores appear in a moment</span>
            <style>{"@keyframes rn-spin{to{transform:rotate(360deg)}}"}</style>
          </div>
        )}

        {/* Scan failed: keep the (unranked) feed; offer a retry. */}
        {state.status === "ready" && scanError && !scanning && (
          <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid color-mix(in srgb, var(--red, #f87171) 35%, transparent)", background: "color-mix(in srgb, var(--red, #f87171) 6%, var(--surface))", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--text)", minWidth: 0 }}>{scanError}</span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Button variant="outline" size="sm" onClick={() => setScanError(null)}>Dismiss</Button>
              {lastUploadFileRef.current && browseSel && (
                <Button size="sm" onClick={() => { const f = lastUploadFileRef.current; if (f && browseSel) startResumeRanking(browseSel, f); }}>Retry</Button>
              )}
            </div>
          </div>
        )}

        {state.status === "ready" && state.ranked === false && !scanning && (
          <div style={{ marginBottom: 16, borderRadius: 14, border: "1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)", background: "var(--surface)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                {state.role ? <>Showing <span style={{ color: "var(--accent)" }}>{state.role}</span> roles</> : "Browsing live jobs"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                Scan your résumé to rank these by fit and unlock per-job match scores.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Button variant="outline" onClick={changeRole}>Change role</Button>
              <Button onClick={() => setState({ status: "needs-role" })}>Scan my résumé</Button>
            </div>
          </div>
        )}


        {state.status === "no-resume" && onboardingWizard}

        {state.status === "needs-role" && onboardingWizard}

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

        {state.status === "ready" && companyFilter && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 14px", marginBottom: 12, borderRadius: 10, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--accent) 9%, transparent)" }}>
            <span style={{ fontSize: 13, color: "var(--text)" }}>
              Showing jobs at <strong style={{ fontWeight: 700 }}>{companyFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => handleCompanySelect(companyFilter)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear ✕
            </button>
          </div>
        )}

        {showFeedLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-busy="true" aria-label="Loading jobs">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[96px] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {showEmptyCard && (
          <Card>
            <CardContent style={{ padding: "40px 28px", textAlign: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>No openings in this window</h2>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "10px auto 0", maxWidth: 440 }}>
                Try a wider posting-age filter above — the feed is restocked by daily scans of company career boards.
              </p>
            </CardContent>
          </Card>
        )}

        {state.status === "ready" && state.jobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pagedJobs.map((job) => renderJobCard(job))}
            {visibleJobs.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "28px 0" }}>
                No openings match the current filters.
              </p>
            )}

            {(canPrev || canNext) && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "14px 0 4px" }}>
                <Button variant="outline" size="sm" disabled={!canPrev || loadingMore} onClick={() => void goToPage(currentPage - 1)}>
                  ← Prev
                </Button>
                <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 96, textAlign: "center" }}>
                  {loadingMore
                    ? "Loading…"
                    : `Page ${(currentPage + 1).toLocaleString()}${
                        typeof totalMatching === "number"
                          ? ` of ${Math.max(1, Math.ceil(totalMatching / PAGE_SIZE)).toLocaleString()}`
                          : serverHasMore
                          ? ""
                          : ` of ${loadedPages.toLocaleString()}`
                      }`}
                </span>
                <Button variant="outline" size="sm" disabled={!canNext || loadingMore} onClick={() => void goToPage(currentPage + 1)}>
                  Next →
                </Button>
              </div>
            )}

            {!canNext && visibleJobs.length > PAGE_SIZE && (
              <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "12px 0 4px" }}>
                End · {(typeof totalMatching === "number" ? totalMatching : visibleJobs.length).toLocaleString()} openings
              </p>
            )}
          </div>
        )}

        {/* Outside-your-filters fallback: never dead-end on an empty result —
            show the relaxed set (same search, no facet/age/country limits) in a
            clearly separate section so the user can still see what's out there. */}
        {state.status === "ready" && pagedJobs.length === 0 && fallback.jobs.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 0 10px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Outside your filters
              </h3>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {debouncedSearch
                  ? `Matches for “${debouncedSearch}” beyond your current date / location / filters`
                  : "Roles beyond your current date / location / filters"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fallback.jobs.slice(0, FALLBACK_LIMIT).map((job) => renderJobCard(job, outsideReason(job)))}
            </div>
            {!fallback.loading && fallback.jobs.length > FALLBACK_LIMIT && (
              <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "12px 0 0" }}>
                Showing {FALLBACK_LIMIT} of {fallback.jobs.length} — widen a filter above to see more in your main feed.
              </p>
            )}
          </div>
        )}
      </div>
      </div>{/* /main column */}

      {state.status === "ready" && !listMode && (
        <JobsSidebar
          isMobile={isMobile}
          savedFilters={savedFilters}
          currentSnapshot={currentSnapshot}
          topMatches={topMatches.jobs}
          topMatchesLoading={topMatches.loading}
          onApply={applySnapshot}
          onSaved={(f) => setSavedFilters((prev) => [f, ...prev])}
          onDeleted={(id) => setSavedFilters((prev) => prev.filter((x) => x.id !== id))}
          onNavigate={(v) => router.push(`/?view=${v}`)}
          onOpenJob={(id) => router.push(`/?view=jobs&job=${encodeURIComponent(id)}`)}
        />
      )}

      {boostJob && (
        <BoostPanel
          job={boostJob}
          onClose={() => setBoostJob(null)}
          onApplied={handleBoostApplied}
          onScoreChange={updateJobMatchScore}
          onResumePromoted={handleBoostResumePromoted}
        />
      )}

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
  isMobile,
  savedFilters,
  currentSnapshot,
  topMatches,
  topMatchesLoading,
  onApply,
  onSaved,
  onDeleted,
  onNavigate,
  onOpenJob,
}: {
  isMobile: boolean;
  savedFilters: SavedFilter[];
  currentSnapshot: FilterSnapshot;
  topMatches: JobTopMatch[];
  topMatchesLoading: boolean;
  onApply: (f: Partial<FilterSnapshot>) => void;
  onSaved: (f: SavedFilter) => void;
  onDeleted: (id: string) => void;
  onNavigate: (view: string) => void;
  onOpenJob: (id: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // On mobile the sidebar is a collapsed disclosure (closed by default) so the
  // job feed stays the sole focus, LinkedIn-style. Desktop renders it expanded.
  const [expanded, setExpanded] = useState(false);
  const showCards = !isMobile || expanded;

  async function save() {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const created = await createJobFilter(n, currentSnapshot);
      onSaved(created);
      setName("");
      setNaming(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save this filter");
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
    <aside style={{ width: isMobile ? "100%" : 264, flexShrink: 0, position: isMobile ? "static" : "sticky", top: 16, display: "flex", flexDirection: "column", gap: 16, order: isMobile ? 1 : 0 }}>
      {isMobile && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 13.5, fontWeight: 600, color: "var(--text)", padding: "11px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Saved filters &amp; tools
          <span style={{ fontSize: 10, opacity: 0.6, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
        </button>
      )}
      {showCards && (
      <>
      <JobTopMatchesCard jobs={topMatches} loading={topMatchesLoading} onOpenJob={onOpenJob} />
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
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: saveError ? 6 : 10 }}>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); if (saveError) setSaveError(""); }}
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
            {saveError && (
              <p style={{ fontSize: 11.5, color: "var(--red, #b91c1c)", margin: "0 0 10px", lineHeight: 1.4 }}>
                {saveError}
              </p>
            )}
          </>
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
      </>
      )}
    </aside>
  );
}

/**
 * Signed-out Jobs landing — a full job-board-style preview that's gated, not a
 * tiny card. Real-looking search + filter bar + category chips over a larger
 * blurred grid of openings; ANY interaction opens the shared sign-in modal
 * (onSignIn). Low on prose by design — the "more" is interactive, not paragraphs.
 */
function SignedOutJobsHero({ count, onSignIn }: { count: number | null; onSignIn: () => void }) {
  const rounded =
    count && count > 200
      ? count >= 1000
        ? Math.floor(count / 1000) * 1000
        : Math.floor(count / 100) * 100
      : null;
  const proofText = rounded ? `${rounded.toLocaleString()}+ live openings this week` : "Live openings updated daily";

  const categories = [
    "Software Engineer", "Data Scientist", "Product Manager", "Product Designer",
    "Data Analyst", "DevOps / SRE", "Marketing", "Sales",
  ];
  const sample = [
    { title: "Frontend Engineer", co: "Stripe", loc: "Remote (US)", match: "92%" },
    { title: "Product Designer", co: "Figma", loc: "New York, NY", match: "88%" },
    { title: "Machine Learning Engineer", co: "Notion", loc: "San Francisco, CA", match: "90%" },
    { title: "Data Scientist", co: "Airbnb", loc: "Remote", match: "85%" },
    { title: "Product Manager", co: "Linear", loc: "Remote (US)", match: "87%" },
    { title: "Backend Engineer", co: "Vercel", loc: "Remote", match: "91%" },
  ];

  const chevron = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
  );
  const filterBtn: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500,
    color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "9px 13px", cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 72px", width: "100%" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: "var(--accent)", background: "var(--accent-bg, color-mix(in srgb, var(--accent) 10%, transparent))", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
          {proofText}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.6, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.15 }}>
          Find jobs that match your résumé
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 auto", maxWidth: 420, lineHeight: 1.5 }}>
          Live openings from company career boards, ranked by fit.
        </p>
      </div>

      {/* Search + filters (gated) */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <button type="button" onClick={onSignIn} style={{ display: "flex", alignItems: "center", gap: 9, flex: "1 1 320px", maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ color: "var(--muted)", display: "inline-flex" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <span style={{ fontSize: 14, color: "var(--dim)" }}>Search title or company…</span>
        </button>
        <button type="button" onClick={onSignIn} style={filterBtn}>Location {chevron}</button>
        <button type="button" onClick={onSignIn} style={filterBtn}>Past month {chevron}</button>
        <button type="button" onClick={onSignIn} style={filterBtn}>Work model {chevron}</button>
      </div>

      {/* Category quick-picks (gated) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 26 }}>
        {categories.map((c) => (
          <button key={c} type="button" onClick={onSignIn} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 999, padding: "6px 13px", cursor: "pointer", fontFamily: "inherit" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Blurred results grid + centered unlock CTA. Height-capped so the unlock
          card stays in view even on a tall single-column mobile grid. */}
      <div style={{ position: "relative", minHeight: 320 }}>
        <div onClick={onSignIn} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, maxHeight: 400, overflow: "hidden", filter: "blur(3px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }} aria-hidden>
          {sample.map((j) => (
            <div key={j.title} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface2)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{j.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{j.co} · {j.loc}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Full-time</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{j.match} match</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, background: "linear-gradient(to bottom, transparent, var(--bg))", pointerEvents: "none" }} aria-hidden />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", padding: "24px 28px", maxWidth: 360 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Sign in to see your matches</div>
            <Button size="lg" onClick={onSignIn} style={{ minWidth: 230 }}>Sign in to browse</Button>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 11 }}>Free · no credit card</div>
          </div>
        </div>
      </div>
    </div>
  );
}
