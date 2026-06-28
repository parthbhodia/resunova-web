/**
 * Saved job-feed filter sets ("Your Saved Filters") API client.
 * Mirrors lib/referralsApi.ts: Supabase bearer auth via authHeaders.
 *
 * The `filters` blob is owned by JobsFeed (FilterSnapshot below) — the backend
 * persists it opaquely.
 */
import { apiUrl } from "@/lib/utils";
import { authHeaders } from "@/lib/jobsApi";

/** The serializable slice of JobsFeed's filter state that a saved filter holds. */
export type FilterSnapshot = {
  locationStates: string[];
  workModels: string[];
  seniorities: string[];
  empType: string;
  industry: string;
  yearsBucket: string;
  scoreFilter: string;
  ageFilter: string;
  search: string;
  sortBy: string;
  clearance?: string;     // "any" | "required" | "exclude"
  citizenship?: string;   // "any" | "required" | "exclude"
};

export type SavedFilter = {
  id: string;
  name: string;
  filters: Partial<FilterSnapshot>;
  createdAt: string;
  updatedAt: string;
};

async function parseError(resp: Response): Promise<never> {
  const body = await resp.json().catch(() => ({}));
  throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
}

export async function fetchJobFilters(): Promise<SavedFilter[]> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl("/api/job-filters"), { headers });
  if (!resp.ok) return parseError(resp);
  return (await resp.json()).filters ?? [];
}

export async function createJobFilter(name: string, filters: Partial<FilterSnapshot>): Promise<SavedFilter> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl("/api/job-filters"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name, filters }),
  });
  if (!resp.ok) return parseError(resp);
  return (await resp.json()).filter;
}

export async function updateJobFilter(
  id: string,
  patch: { name?: string; filters?: Partial<FilterSnapshot> },
): Promise<SavedFilter> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl(`/api/job-filters/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) return parseError(resp);
  return (await resp.json()).filter;
}

export async function deleteJobFilter(id: string): Promise<void> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl(`/api/job-filters/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers,
  });
  if (!resp.ok) return parseError(resp);
}
