/**
 * One open tailor job: the posting, its match, and the edits accepted for it.
 *
 * The résumé stays on the page. A tab is one of these records. Pure helpers
 * live here so the store and the page share one meaning of "empty", "full",
 * and "the same posting".
 */

import type { AddressedGapAction, GenerationResult, RatingsData } from "@/lib/types";
import type { LiveBulletItem } from "@/lib/resumeBulletMatch";
import {
  emptySuggestionsSnapshot,
  type SuggestionsSnapshot,
} from "@/lib/suggestionsSnapshot";

/** How many postings stay open on the tailor page. Older ones stay in History. */
export const MAX_OPEN_TAILOR_JOBS = 5;

export type TailorJobWork = {
  company: string;
  role: string;
  jd: string;
  jobUrl: string;
  result: GenerationResult | null;
  preview: string;
  jdKeywords: string[];
  analyzeError: string | null;
  error: string | null;
  requirementConcepts: readonly unknown[];
  tailorBulletAnalysis: LiveBulletItem[];
  tailorLineOverrides: Record<number, string>;
  /** Stored as an array so the snapshot can sit in memory and in the draft. */
  tailorAppliedBulletIndices: number[];
  appliedPillPairs: Array<{ original: string; applied: string }>;
  tailorFieldOverrides: Record<string, string>;
  tailorHeadlineOverride: string;
  tailorRewriteEdits: Record<number, string>;
  addressedGaps: string[];
  addressedGapActions: AddressedGapAction[];
  scoreStale: boolean;
  suggestions: SuggestionsSnapshot;
  suggestResearchDigest: string;
  suggestResearchQueries: string[];
  suggestResearchSources: { title: string | null; url: string }[];
  /** Results-panel section. Kept as a string so this module does not import the view. */
  resultsActiveTab: string;
  bulletEdits: Array<[number, string]>;
};

export type TailorJobTarget = {
  id: string;
  /** Library folder for this posting, once a match has been saved. */
  savedFolder: string | null;
  /** Last known match score, including a History row that has no ratings payload. */
  score: number | null;
  work: TailorJobWork;
};

export type TailorJobFields = Omit<TailorJobWork, "suggestions">;

export function emptyGenerationResult(): GenerationResult {
  return {
    folder: null,
    baseFolder: null,
    baseLoaded: null,
    texPath: null,
    pdfUrl: null,
    ratings: null,
    diff: [],
    adds: 0,
    removes: 0,
    rationales: [],
    sources: [],
    latexPreview: "",
    status: "",
  };
}

export function emptyTailorJobWork(): TailorJobWork {
  return {
    company: "",
    role: "",
    jd: "",
    jobUrl: "",
    result: null,
    preview: "",
    jdKeywords: [],
    analyzeError: null,
    error: null,
    requirementConcepts: [],
    tailorBulletAnalysis: [],
    tailorLineOverrides: {},
    tailorAppliedBulletIndices: [],
    appliedPillPairs: [],
    tailorFieldOverrides: {},
    tailorHeadlineOverride: "",
    tailorRewriteEdits: {},
    addressedGaps: [],
    addressedGapActions: [],
    scoreStale: false,
    suggestions: emptySuggestionsSnapshot(),
    suggestResearchDigest: "",
    suggestResearchQueries: [],
    suggestResearchSources: [],
    resultsActiveTab: "overall",
    bulletEdits: [],
  };
}

export function newTailorJobId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function tailorJobScore(ratings: RatingsData | null | undefined): number | null {
  if (!ratings) return null;
  const n = ratings.overall_score ?? ratings.match_score;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
}

export function tailorJobLabel(company: string, role: string): string {
  const c = company.trim();
  const r = role.trim();
  const named = (value: string) => value.length > 0 && value !== "—";
  if (named(c) && named(r)) return `${c} · ${r}`;
  if (named(r)) return r;
  if (named(c)) return c;
  return "New job";
}

export function tailorJobIsEmpty(job: Pick<TailorJobTarget, "savedFolder" | "work">): boolean {
  return !job.savedFolder && !job.work.jd.trim() && !job.work.result?.ratings;
}

export function createTailorJob(partial?: {
  id?: string;
  savedFolder?: string | null;
  score?: number | null;
  work?: Partial<TailorJobWork>;
}): TailorJobTarget {
  const work = { ...emptyTailorJobWork(), ...partial?.work };
  const savedFolder = partial?.savedFolder ?? work.result?.folder ?? null;
  const score = partial?.score ?? tailorJobScore(work.result?.ratings);
  return {
    id: partial?.id ?? newTailorJobId(),
    savedFolder,
    score,
    work,
  };
}

export function withTailorJobWork(
  job: TailorJobTarget,
  partial: Partial<TailorJobWork>,
): TailorJobTarget {
  const work = { ...job.work, ...partial };
  let { score, savedFolder } = job;
  if ("result" in partial) {
    const fromRatings = tailorJobScore(partial.result?.ratings);
    if (fromRatings != null) score = fromRatings;
    if (partial.result?.folder) savedFolder = partial.result.folder;
  }
  return { ...job, work, score, savedFolder };
}

/** Same saved match, or the same pasted posting. */
export function findOpenTailorJob(
  jobs: readonly TailorJobTarget[],
  needle: { savedFolder?: string | null; company?: string; role?: string; jd?: string },
): TailorJobTarget | null {
  const folder = needle.savedFolder?.trim();
  if (folder) {
    const byFolder = jobs.find((job) => job.savedFolder === folder);
    if (byFolder) return byFolder;
  }
  const jd = needle.jd?.trim() ?? "";
  if (!jd) return null;
  const company = (needle.company ?? "").trim();
  const role = (needle.role ?? "").trim();
  return (
    jobs.find((job) => {
      if (job.work.jd.trim() !== jd) return false;
      if (company && job.work.company.trim() !== company) return false;
      if (role && job.work.role.trim() !== role) return false;
      return true;
    }) ?? null
  );
}

export type PersistedTailorJob = {
  id: string;
  savedFolder: string | null;
  score: number | null;
  company: string;
  role: string;
  jd: string;
  jobUrl: string;
  result: GenerationResult | null;
};

export function persistTailorJob(job: TailorJobTarget): PersistedTailorJob {
  const result = job.work.result ? { ...job.work.result, latexPreview: "" } : null;
  return {
    id: job.id,
    savedFolder: job.savedFolder,
    score: job.score,
    company: job.work.company,
    role: job.work.role,
    jd: job.work.jd,
    jobUrl: job.work.jobUrl,
    result,
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function tailorJobFromPersisted(raw: unknown): TailorJobTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = asString(row.id).trim();
  if (!id) return null;
  const result =
    row.result && typeof row.result === "object"
      ? ({ ...emptyGenerationResult(), ...(row.result as GenerationResult), latexPreview: "" } as GenerationResult)
      : null;
  return createTailorJob({
    id,
    savedFolder: asString(row.savedFolder).trim() || result?.folder || null,
    score: typeof row.score === "number" && Number.isFinite(row.score) ? Math.round(row.score) : tailorJobScore(result?.ratings),
    work: {
      company: asString(row.company),
      role: asString(row.role),
      jd: asString(row.jd),
      jobUrl: asString(row.jobUrl),
      result,
    },
  });
}

export function parsePersistedTailorJobs(raw: unknown): TailorJobTarget[] {
  if (!Array.isArray(raw)) return [];
  const jobs: TailorJobTarget[] = [];
  for (const row of raw) {
    const job = tailorJobFromPersisted(row);
    if (!job) continue;
    if (jobs.some((existing) => existing.id === job.id)) continue;
    jobs.push(job);
    if (jobs.length >= MAX_OPEN_TAILOR_JOBS) break;
  }
  return jobs;
}
