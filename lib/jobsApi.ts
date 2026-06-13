/**
 * Job-feed API helpers. The feed (GET /api/jobs/feed) and detail
 * (GET /api/jobs/<id>) are both scored deterministically server-side —
 * no LLM tokens per request.
 */
import { apiUrl } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";

export type RequirementItem = {
  canonical: string;
  type: string;
  importance: string;
  matched: boolean;
  matchedText: string | null;
};

export type JobFeedItem = {
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
  /** True when job title contains one of the user's target roles (from profile). */
  titleMatch: boolean;
  /** True when job location matches one of the user's preferred locations. */
  locationMatch: boolean;
};

export type JobFeedResponse = {
  jobs: JobFeedItem[];
  resumeAnalysisId: string | null;
  generatedAt: string;
  /** Parsed profile roles that were used for boosting, e.g. ["backend engineer"]. */
  profileRoles: string[];
  profileLocations: string[];
};

export type JobDetail = {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  companyDomain: string;
  source: string;
  url: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  postedAt: string | null;
  isActive: boolean;
  jdText: string;
  resumeAnalysisId: string | null;
  resumeSections: string[];
  /** Owner's latest résumé text + structured doc, for the Boost → tailor handoff. */
  resumeText: string;
  structuredResume: Record<string, unknown> | null;
  matched: RequirementItem[];
  missing: RequirementItem[];
  injectableKeywords: string[];
  matchScore: number | null;
  matchedCount: number;
  totalRequirements: number;
};

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl(`/api/jobs/${encodeURIComponent(id)}`), { headers });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

/** Ordered logo URL candidates for a company, best guess first.
 *
 * ATS APIs don't expose the real domain, so we try the name-derived domain
 * (e.g. anthropic.com), then the ATS-slug guess (e.g. {slug}.com). The UI
 * walks these on <img> error and falls back to a monogram if all fail.
 */
export function companyLogoCandidates(companyDomain: string, slug: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (host: string) => {
    const h = host.trim().toLowerCase();
    if (h && !seen.has(h)) { seen.add(h); out.push(`https://logo.clearbit.com/${h}`); }
  };
  if (companyDomain) add(companyDomain);
  if (slug) add(`${slug}.com`);
  return out;
}
