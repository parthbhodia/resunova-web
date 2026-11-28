/**
 * Labels and formatting for one job posting's facts.
 *
 * Shared by the in-app job pane and the public job page so a posting reads the
 * same in both. Pure and server-safe.
 */

export const WM_LABEL: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };

export const SEN_LABEL: Record<string, string> = {
  intern: "Intern", entry: "Entry-level", mid: "Mid-level", senior: "Senior",
  lead: "Lead", principal: "Principal", director: "Director", executive: "Executive",
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  contractor: "Contract",
  temporary: "Temporary",
  temp: "Temporary",
  intern: "Internship",
  internship: "Internship",
  per_diem: "Per diem",
  volunteer: "Volunteer",
};

/**
 * "full_time", "FULL-TIME" and "Full time" all read as "Full-time". An unknown
 * value is shown as written rather than guessed; nothing at all returns null so
 * the row is left out instead of claiming a type the posting never stated.
 */
export function employmentTypeLabel(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const key = text.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  return EMPLOYMENT_LABEL[key] ?? text.replace(/_/g, " ");
}

export function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export type SalaryFields = {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
};

/** Full salary in Indeed's style: "$177,000 - $257,000 a year", no abbreviation. */
export function formatSalaryFull(job: SalaryFields): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const cur = job.salaryCurrency && job.salaryCurrency !== "USD" ? `${job.salaryCurrency} ` : "$";
  const period = (job.salaryPeriod || "year").toLowerCase();
  const unit =
    period === "hour" ? "an hour" : period === "month" ? "a month"
    : period === "week" ? "a week" : period === "day" ? "a day" : "a year";
  const fmt = (n: number) => (period === "hour" ? `${Math.round(n * 100) / 100}` : Math.round(n).toLocaleString("en-US"));
  const lo = job.salaryMin ?? job.salaryMax;
  const hi = job.salaryMax ?? job.salaryMin;
  if (lo == null || hi == null) return null;
  const range = lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(lo)} - ${cur}${fmt(hi)}`;
  return `${range} ${unit}`;
}
