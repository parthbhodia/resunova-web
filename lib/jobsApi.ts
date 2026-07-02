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
  /** Pay period the salary figures refer to: "year" | "hour" | etc. */
  salaryPeriod: string | null;
  /** Where the salary came from: "listing" (ATS feed) | "jd" (extracted) | null. */
  salarySource: string | null;
  /** "remote" | "hybrid" | "onsite" (null = unstated). */
  workModel: string | null;
  /** "intern" | "entry" | "mid" | "senior" | "lead" | "principal" | "director" | "executive". */
  seniority: string | null;
  /** "yes" | "no" (null = JD didn't say). */
  visaSponsorship: string | null;
  /** Company-level H-1B history from the DOL LCA dataset (fuzzy-matched). */
  h1bSponsor: boolean | null;
  h1bCertifiedCount: number | null;
  h1bMedianWage: number | null;
  /** How many applied. null = unknown; UI shows "Less than 25" when <25. */
  applicantCount: number | null;
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
  /** True for the résumé-ranked feed; false/absent for the no-résumé role browse. */
  ranked?: boolean;
  signedIn?: boolean;
  /** Set when a signed-in user has no résumé and hasn't picked a role yet. */
  needsRole?: boolean;
  /** Echo of the role the no-résumé browse feed was scoped to, + its family. */
  role?: string;
  roleFamily?: string;
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
  salaryPeriod: string | null;
  salarySource: string | null;
  workModel: string | null;
  seniority: string | null;
  visaSponsorship: string | null;
  h1bSponsor: boolean | null;
  h1bCertifiedCount: number | null;
  h1bMedianWage: number | null;
  applicantCount: number | null;
  postedAt: string | null;
  isActive: boolean;
  jdText: string;
  resumeAnalysisId: string | null;
  resumeSections: string[];
  /** Owner's latest résumé text + structured doc, for the Boost → tailor handoff. */
  resumeText: string;
  structuredResume: Record<string, unknown> | null;
  contacts?: JobContact[];
  matched: RequirementItem[];
  missing: RequirementItem[];
  injectableKeywords: string[];
  matchScore: number | null;
  matchedCount: number;
  totalRequirements: number;
};

export type JobContact = {
  email: string;
  type: "recruiter" | "careers" | "hr" | "generic";
  source: "job_description" | "ats_metadata" | "company_public_page" | "domain_guess" | "verified";
  confidence: number | null;
  createdAt: string | null;
};

/** Short match-quality label for a 0–100 score (null = not yet scanned). */
export function scoreLabel(score: number | null): string {
  if (score == null) return "SCAN TO MATCH";
  if (score >= 70) return "STRONG MATCH";
  if (score >= 50) return "GOOD MATCH";
  if (score >= 30) return "PARTIAL MATCH";
  return "LOW MATCH";
}

/** Company typeahead for the unified search box. Prefix search over corpus
 *  companies (US-active), each with its open-roles count. [] on any failure. */
export type CompanyOption = { company: string; domain: string; activeCount: number };
export async function fetchCompanyOptions(q: string): Promise<CompanyOption[]> {
  try {
    const resp = await fetch(apiUrl(`/api/jobs/companies?q=${encodeURIComponent(q.trim())}`));
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data?.companies) ? data.companies : [];
  } catch {
    return [];
  }
}

/** Title typeahead — real corpus job titles (substring match), each with its
 *  open-roles count. Complements the curated role suggestions. [] on any failure. */
export type TitleOption = { title: string; activeCount: number };
export async function fetchTitleOptions(q: string): Promise<TitleOption[]> {
  try {
    const resp = await fetch(apiUrl(`/api/jobs/titles?q=${encodeURIComponent(q.trim())}`));
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data?.titles) ? data.titles : [];
  } catch {
    return [];
  }
}

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
 * ATS APIs don't expose the real domain, so we resolve a logo from the
 * name-derived domain (e.g. anthropic.com), then the ATS-slug guess
 * ({slug}.com). Source = Google's favicon service (free, no token, always
 * reachable). NOTE: Clearbit's logo API (logo.clearbit.com) was decommissioned
 * by HubSpot — it no longer resolves, so do not use it. For crisper logos,
 * swap to logo.dev (needs a free publishable token).
 *
 * Caveat: Google returns a generic globe (not a 404) for unknown domains, so
 * the monogram fallback only triggers when there's no domain/slug at all.
 */
export function companyLogoCandidates(companyDomain: string, slug: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (host: string) => {
    const h = host.trim().toLowerCase();
    if (h && !seen.has(h)) {
      seen.add(h);
      out.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`);
    }
  };
  if (companyDomain) add(companyDomain);
  if (slug) add(`${slug}.com`);
  return out;
}

export type FeaturedCompany = {
  company: string;
  domain: string;
  activeCount: number;
};

/** Curated, recognizable companies that have LIVE openings right now, each with
 *  its open-roles count — powers the Jobs "Top companies hiring" rail. Public +
 *  cached server-side (counts are live, so a company that empties out drops off).
 *  Returns [] on any failure so the rail simply doesn't render. */
export async function fetchFeaturedCompanies(): Promise<FeaturedCompany[]> {
  try {
    const resp = await fetch(apiUrl("/api/jobs/featured-companies"));
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data?.companies) ? data.companies : [];
  } catch {
    return [];
  }
}
