/**
 * Public job postings, read live from the API on the server.
 *
 * WHY THIS REPLACED A SNAPSHOT. The public `/jobs/<id>/` pages used to be
 * generated at build time from a committed list of the newest ~1000 postings,
 * on a host that could not render anything on demand. Every deploy replaced
 * most of that list, so a URL Google had indexed last week stopped existing
 * and the visitor got a 404 for a role that was usually still open. On Vercel a
 * page can be rendered when it is asked for, so the page now asks the API about
 * the id in the address. A posting that is open renders; one that is not is a
 * real 404; there is no list to fall out of.
 *
 * Server only. It reads the API anonymously: this is public data, the server
 * has no visitor session to attach, and `lib/apiClient.ts` is a browser module
 * (it reads the Supabase session). That is why this file calls `fetch`
 * directly, and why `lib/__tests__/apiClientUsage.test.ts` does not apply.
 *
 * THE RULE THAT MATTERS: "the API says it is gone" and "the API could not be
 * reached" are different answers and must never look alike. The first returns
 * null (the page 404s). The second throws, so the page errors, is not cached,
 * and the last good copy keeps serving. Turning an outage into a 404 would
 * retire every indexed job page for as long as the API was down, which is the
 * failure this module exists to remove.
 */

import { cache } from "react";
import { isPostingId } from "@/lib/staleJobLink";

export type PublicJob = {
  id: string;
  title: string;
  company: string;
  companySlug: string;
  companyDomain: string;
  url: string;
  location: string;
  postedAt: string | null;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  workModel: string | null;
  employmentType: string | null;
  industry: string | null;
  /** ISO-2 code for a posting outside the US; null for US or unknown. */
  country?: string | null;
};

/** The API could not be reached or answered something this module does not understand. */
export class PublicJobsUnavailableError extends Error {
  constructor(message: string) {
    super(`Public jobs unavailable: ${message}`);
    this.name = "PublicJobsUnavailableError";
  }
}

/** A posting page is rebuilt at most this often. */
export const JOB_REVALIDATE_SECONDS = 3600;
/** The listing and the sitemap move faster than any one posting. */
export const INDEX_REVALIDATE_SECONDS = 900;
/** Give up on a hung API well inside the platform's function limit. */
export const FETCH_TIMEOUT_MS = 8000;

/** Same window and cap the build-time snapshot used, so the listing is the same size. */
const INDEX_QUERY = "max_age_days=30&max_postings=1000";

export function jobHref(id: string): string {
  return `/jobs/${encodeURIComponent(id)}`;
}

function apiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  // A server that falls back to localhost fails every request with a
  // connection error that names nothing useful, so say what is missing.
  if (process.env.NODE_ENV === "production") {
    throw new PublicJobsUnavailableError("NEXT_PUBLIC_API_URL is not set for this deployment");
  }
  return "http://localhost:8765";
}

async function getFromApi(path: string, revalidate: number): Promise<Response> {
  const url = `${apiBase()}${path}`;
  try {
    return await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new PublicJobsUnavailableError(`${path}: ${reason}`);
  }
}

async function readJson(res: Response, path: string): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw new PublicJobsUnavailableError(`${path}: response was not JSON`);
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** `GET /api/jobs/{id}` → the fields the public page renders. */
function fromDetail(raw: Record<string, unknown>, requestedId: string): PublicJob {
  return {
    id: str(raw.id) || requestedId,
    title: str(raw.title),
    company: str(raw.company),
    companySlug: str(raw.companySlug),
    companyDomain: str(raw.companyDomain),
    url: str(raw.url),
    location: str(raw.location),
    postedAt: strOrNull(raw.postedAt),
    description: str(raw.jdText),
    salaryMin: numOrNull(raw.salaryMin),
    salaryMax: numOrNull(raw.salaryMax),
    salaryCurrency: strOrNull(raw.salaryCurrency),
    salaryPeriod: strOrNull(raw.salaryPeriod),
    workModel: strOrNull(raw.workModel),
    employmentType: strOrNull(raw.employmentType),
    industry: strOrNull(raw.industry),
    country: strOrNull(raw.country),
  };
}

/**
 * The posting for `id` if it is open, null if it is closed or does not exist.
 * Throws `PublicJobsUnavailableError` when that cannot be determined.
 */
export const fetchPublicJob = cache(async (id: string): Promise<PublicJob | null> => {
  if (!isPostingId(id)) return null;
  const path = `/api/jobs/${encodeURIComponent(id)}`;
  const res = await getFromApi(path, JOB_REVALIDATE_SECONDS);

  // The API answers 404 for an id it does not hold and 400 for a malformed one.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new PublicJobsUnavailableError(`${path}: HTTP ${res.status}`);

  const body = await readJson(res, path);
  if (!body || typeof body !== "object") throw new PublicJobsUnavailableError(`${path}: empty body`);
  const raw = body as Record<string, unknown>;

  // A missing flag is the API's contract changing under us, not a closed job.
  // Reading it as closed would 404 every posting at once.
  if (typeof raw.isActive !== "boolean") {
    throw new PublicJobsUnavailableError(`${path}: response has no isActive flag`);
  }
  if (!raw.isActive) return null;
  return fromDetail(raw, id);
});

/**
 * Whether a posting is worth putting in a search index. Mirrors the API's own
 * `_indexable_job` plus its US-only scope: a page without a title, description,
 * apply link, date or a real location is thin, and "12 locations" is not a place.
 */
export function isIndexablePosting(job: PublicJob): boolean {
  const location = job.location.trim();
  return Boolean(
    job.id &&
      job.title &&
      job.company &&
      job.description &&
      job.url &&
      job.postedAt &&
      location &&
      !/^\d+\s+locations?$/i.test(location) &&
      !job.country,
  );
}

function fromIndexRow(raw: unknown): PublicJob | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!isPostingId(id)) return null;
  return {
    id,
    title: str(r.title),
    company: str(r.company),
    companySlug: str(r.companySlug),
    companyDomain: str(r.companyDomain),
    url: str(r.url),
    location: str(r.location),
    postedAt: strOrNull(r.postedAt),
    description: str(r.description),
    salaryMin: numOrNull(r.salaryMin),
    salaryMax: numOrNull(r.salaryMax),
    salaryCurrency: strOrNull(r.salaryCurrency),
    salaryPeriod: strOrNull(r.salaryPeriod),
    workModel: strOrNull(r.workModel),
    employmentType: strOrNull(r.employmentType),
    industry: strOrNull(r.industry),
    country: null,
  };
}

export type PublicJobIndex = { jobs: PublicJob[]; generatedAt: string | null };

/**
 * The freshest public postings, for the `/jobs/` listing and the sitemap.
 * Throws when the API cannot be reached: an empty list caused by an outage
 * must not be cached as if the board were empty.
 */
export const fetchPublicJobIndex = cache(async (): Promise<PublicJobIndex> => {
  const path = `/api/seo/jobs?${INDEX_QUERY}`;
  const res = await getFromApi(path, INDEX_REVALIDATE_SECONDS);
  if (!res.ok) throw new PublicJobsUnavailableError(`${path}: HTTP ${res.status}`);

  const body = await readJson(res, path);
  const rows = body && typeof body === "object" ? (body as Record<string, unknown>).jobs : undefined;
  if (!Array.isArray(rows)) throw new PublicJobsUnavailableError(`${path}: response has no jobs array`);

  const jobs = rows.map(fromIndexRow).filter((j): j is PublicJob => j !== null && isIndexablePosting(j));
  const generatedAt = strOrNull((body as Record<string, unknown>).generatedAt);
  return { jobs, generatedAt };
});
