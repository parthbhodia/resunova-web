/**
 * Display cleanup for the public /jobs index.
 *
 * The listing is a raw feed: duplicate postings, "Copy of" titles, a few
 * recurring name typos, and coordinates stored where a city should be. The
 * API owns the rows; this only decides what the page is willing to show.
 */
import type { PublicJob } from "@/lib/publicJobs";

const COORD_RE = /^-?\d{1,3}\.\d+\s*[|,]\s*-?\d{1,3}\.\d+\s*$/;

export function cleanEntityName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^copy of\s+/i, "")
    .replace(/Schrdinger/g, "Schrödinger")
    .replace(/\bAmercia\b/g, "America")
    .trim();
}

/** Coordinates are not a place a reader can use. Remote stays remote. */
export function displayJobLocation(location: string, workModel: string | null): string {
  const raw = location.replace(/\s+/g, " ").trim();
  if (!COORD_RE.test(raw)) return raw;
  if (workModel && /remote/i.test(workModel)) return "Remote";
  return "United States";
}

export function preparePublicJob(job: PublicJob): PublicJob {
  return {
    ...job,
    title: cleanEntityName(job.title),
    company: cleanEntityName(job.company),
    location: displayJobLocation(job.location, job.workModel),
  };
}

/** Same company, title, and place, listed twice, is one row. */
export function preparePublicJobs(jobs: PublicJob[]): PublicJob[] {
  const seen = new Set<string>();
  const out: PublicJob[] = [];
  for (const job of jobs) {
    const next = preparePublicJob(job);
    const key = `${next.company.toLowerCase()}|${next.title.toLowerCase()}|${next.location.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

function compactMoney(amount: number, symbol: string): string {
  if (amount >= 1000) return `${symbol}${Math.round(amount / 1000)}k`;
  return `${symbol}${Math.round(amount)}`;
}

export function formatPublicSalary(
  job: Pick<PublicJob, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">,
): string | null {
  const { salaryMin: min, salaryMax: max } = job;
  if (min == null && max == null) return null;
  const currency = (job.salaryCurrency || "USD").toUpperCase();
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const range =
    min != null && max != null && min !== max
      ? `${compactMoney(min, symbol)}–${compactMoney(max, symbol)}`
      : compactMoney((min ?? max) as number, symbol);
  const period =
    job.salaryPeriod === "year" || job.salaryPeriod === "annual"
      ? "/yr"
      : job.salaryPeriod === "hour"
        ? "/hr"
        : job.salaryPeriod === "month"
          ? "/mo"
          : "";
  return `${range}${period}`;
}

export type PublicBoardFilters = {
  search: string;
  fn: string;
  level: string;
  place: string;
  sponsor: "" | "yes";
};

export const EMPTY_BOARD_FILTERS: PublicBoardFilters = {
  search: "",
  fn: "",
  level: "",
  place: "",
  sponsor: "",
};

export const PUBLIC_FUNCTIONS: { id: string; label: string }[] = [
  { id: "engineering", label: "Engineering" },
  { id: "data", label: "Data" },
  { id: "product", label: "Product" },
  { id: "design", label: "Design" },
  { id: "sales", label: "Sales" },
];

export const PUBLIC_LEVELS: { id: string; label: string }[] = [
  { id: "intern", label: "Intern" },
  { id: "entry", label: "Entry" },
  { id: "senior", label: "Senior" },
  { id: "lead", label: "Lead and up" },
];

export const PUBLIC_PLACES: { id: string; label: string }[] = [
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

export function jobFunctionId(title: string): string {
  const t = title.toLowerCase();
  if (/designer|\bux\b|\bui\b/.test(t)) return "design";
  if (/product manager|product owner/.test(t)) return "product";
  if (/\bdata\b|analyst|scientist|machine learning/.test(t)) return "data";
  if (/sales|account executive|business development/.test(t)) return "sales";
  if (/engineer|developer|\bsre\b|devops/.test(t)) return "engineering";
  return "";
}

export function jobLevelId(title: string): string {
  const t = title.toLowerCase();
  if (/\bintern\b|co-op|\bcoop\b/.test(t)) return "intern";
  if (/\bjunior\b|entry level|new grad|\bassociate\b/.test(t)) return "entry";
  if (/\bstaff\b|\bprincipal\b|\bdirector\b|head of|\bvp\b|\blead\b/.test(t)) return "lead";
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "senior";
  return "";
}

export function jobPlaceId(job: Pick<PublicJob, "location" | "workModel">): string {
  const model = (job.workModel || "").toLowerCase();
  const loc = job.location.toLowerCase();
  if (model.includes("remote") || /\bremote\b/.test(loc)) return "remote";
  if (model.includes("hybrid") || /\bhybrid\b/.test(loc)) return "hybrid";
  if (
    model.includes("onsite") ||
    model.includes("on-site") ||
    model.includes("on site") ||
    model.includes("office")
  ) {
    return "onsite";
  }
  return "";
}

export function jobSponsors(job: Pick<PublicJob, "title" | "description">): boolean {
  return /visa sponsor|sponsorship|h-1b|h1b|will sponsor/i.test(`${job.title} ${job.description}`);
}

export function filterPublicJobs(jobs: PublicJob[], filters: PublicBoardFilters): PublicJob[] {
  const q = filters.search.trim().toLowerCase();
  return jobs.filter((job) => {
    if (q && !`${job.title} ${job.company} ${job.location}`.toLowerCase().includes(q)) return false;
    if (filters.fn && jobFunctionId(job.title) !== filters.fn) return false;
    if (filters.level && jobLevelId(job.title) !== filters.level) return false;
    if (filters.place && jobPlaceId(job) !== filters.place) return false;
    if (filters.sponsor === "yes" && !jobSponsors(job)) return false;
    return true;
  });
}
