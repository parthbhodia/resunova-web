/**
 * Employee referrer profiles: "I work at this company and can refer candidates."
 * Owner-only writes; open profiles are readable to signed-in users for /refer/?s=<slug>.
 *
 * Public reads return LoadResult so a failed query is not the same outcome as
 * an empty directory or a paused link. Supabase credentials stay in lib/supabase.ts.
 */
import { getSupabaseClient } from "@/lib/supabase";

export const REFERRAL_REQUEST_STATUSES = ["requested", "reviewing", "referred", "declined"] as const;
export type ReferralRequestStatus = (typeof REFERRAL_REQUEST_STATUSES)[number];

export const REFERRAL_REQUEST_STATUS_LABELS: Record<ReferralRequestStatus, string> = {
  requested: "Requested",
  reviewing: "Reviewing",
  referred: "Referred",
  declined: "Declined",
};

export type CompanyReferrer = {
  id: string;
  userId: string;
  displayName: string;
  company: string;
  companySlug: string;
  title: string;
  linkedin: string | null;
  slug: string;
  bio: string | null;
  openToRefer: boolean;
  /** People this employee has marked Referred. Absent means unknown, show 0. */
  referredCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyReferralRequest = {
  id: string;
  referrerId: string;
  candidateName: string;
  candidateEmail: string;
  candidateLinkedin: string | null;
  role: string;
  notes: string | null;
  source: "request" | "submitted";
  status: ReferralRequestStatus;
  createdAt: string;
  updatedAt?: string;
  nudgeCount?: number;
  lastNudgedAt?: string | null;
};

export type SentReferralRequest = CompanyReferralRequest & {
  referrerName: string;
  referrerCompany: string;
  referrerReferredCount: number;
};

export const REFERRER_LIMITS = {
  name: 80,
  company: 80,
  title: 80,
  bio: 400,
  url: 500,
  role: 120,
  email: 120,
  notes: 2000,
} as const;

export type ReferralWriteResult = {
  request: CompanyReferralRequest | null;
  error: string | null;
};

/** A read that either returned data or failed. `data: null` is a real miss, not an error. */
export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const REFERRER_LINK_INACTIVE = "This referral link is not active.";
export const REFERRER_LOOKUP_FAILED = "Could not load this referral link. Try again.";
export const REFERRER_SEARCH_FAILED = "Could not search referrers. Try again.";
export const REFERRER_COMPANIES_FAILED = "Could not load companies. Try again.";
export const REFERRER_SESSION_FAILED = "Could not check your session. Try again.";

/** One company with at least one open referrer. Used by the /refer directory grid. */
export type OpenReferralCompany = {
  company: string;
  companySlug: string;
  /** Favicon host when known (jobs corpus); empty → CompanyLogo guesses from slug. */
  companyDomain: string;
  openCount: number;
  referredCount: number;
};

const OPEN_COMPANIES_LIMIT = 200;

type ReferrerRow = {
  id: string;
  user_id?: string | null;
  display_name: string | null;
  company: string | null;
  company_slug: string | null;
  title: string | null;
  linkedin: string | null;
  slug: string;
  bio: string | null;
  open_to_refer: boolean | null;
  referred_count?: number | null;
  created_at: string;
  updated_at: string;
};

type RequestRow = {
  id: string;
  referrer_id: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_linkedin: string | null;
  role: string | null;
  notes: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
  updated_at?: string | null;
  nudge_count?: number | null;
  last_nudged_at?: string | null;
};

export function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function makeReferrerSlug(displayName: string, company: string, userId: string): string {
  const name = slugifyPart(displayName) || "employee";
  const co = slugifyPart(company) || "company";
  const suffix = userId.replace(/-/g, "").slice(0, 6) || "user";
  return `${name}-at-${co}-${suffix}`;
}

export function referrerPublicPath(slug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/refer/?s=${encodeURIComponent(slug)}`;
}

export function mapReferrerRow(row: ReferrerRow): CompanyReferrer {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    displayName: row.display_name ?? "",
    company: row.company ?? "",
    companySlug: row.company_slug ?? "",
    title: row.title ?? "",
    linkedin: row.linkedin,
    slug: row.slug,
    bio: row.bio,
    openToRefer: row.open_to_refer !== false,
    referredCount: row.referred_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRequestRow(row: RequestRow): CompanyReferralRequest {
  const status = REFERRAL_REQUEST_STATUSES.includes(row.status as ReferralRequestStatus)
    ? (row.status as ReferralRequestStatus)
    : "requested";
  return {
    id: row.id,
    referrerId: row.referrer_id,
    candidateName: row.candidate_name ?? "",
    candidateEmail: row.candidate_email ?? "",
    candidateLinkedin: row.candidate_linkedin,
    role: row.role ?? "",
    notes: row.notes,
    source: row.source === "submitted" ? "submitted" : "request",
    status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    nudgeCount: row.nudge_count ?? 0,
    lastNudgedAt: row.last_nudged_at ?? null,
  };
}

export function isUsableEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/** Strip LIKE wildcards so company search cannot list every open referrer. */
export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%_\\]/g, "").trim();
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function referralWriteError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  if (code === "23505" || message.includes("duplicate") || message.includes("unique")) {
    return "You already have an open request with this email.";
  }
  if (message.includes("inbox is full")) {
    return "This referrer is not accepting more requests right now.";
  }
  if (message.includes("row-level security") || message.includes("violates row-level")) {
    return REFERRER_LINK_INACTIVE;
  }
  return "Could not send this request. Add your name, a valid email, and the role you want.";
}

export function referrerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const REFERRAL_REQUEST_STATUS_TONES: Record<ReferralRequestStatus, "amber" | "blue" | "green" | "red"> = {
  requested: "amber",
  reviewing: "blue",
  referred: "green",
  declined: "red",
};

export function referralRequestPipeline(rows: CompanyReferralRequest[]): Record<ReferralRequestStatus, number> {
  const counts: Record<ReferralRequestStatus, number> = {
    requested: 0,
    reviewing: 0,
    referred: 0,
    declined: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function referralRequestsThisMonth(
  rows: CompanyReferralRequest[],
  now = new Date(),
): CompanyReferralRequest[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return rows.filter((row) => {
    const date = new Date(row.createdAt);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month;
  });
}

export function openRequestCount(rows: CompanyReferralRequest[]): number {
  return rows.filter(
    (row) => row.source === "request" && (row.status === "requested" || row.status === "reviewing"),
  ).length;
}

export const NUDGE_WAIT_MS = 3 * 24 * 60 * 60 * 1000;
export const NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const NUDGE_LIMIT = 2;

export type NudgeAvailability = "ready" | "too_soon" | "cooling_down" | "limit" | "closed";

export function nudgeAvailability(
  row: Pick<CompanyReferralRequest, "status" | "createdAt" | "nudgeCount" | "lastNudgedAt">,
  now = new Date(),
): NudgeAvailability {
  if (row.status !== "requested" && row.status !== "reviewing") return "closed";
  if ((row.nudgeCount ?? 0) >= NUDGE_LIMIT) return "limit";
  const created = Date.parse(row.createdAt);
  if (!Number.isFinite(created) || now.getTime() - created < NUDGE_WAIT_MS) return "too_soon";
  if (row.lastNudgedAt) {
    const nudged = Date.parse(row.lastNudgedAt);
    if (Number.isFinite(nudged) && now.getTime() - nudged < NUDGE_COOLDOWN_MS) return "cooling_down";
  }
  return "ready";
}

export function nudgeButtonLabel(
  row: Pick<CompanyReferralRequest, "status" | "createdAt" | "nudgeCount" | "lastNudgedAt">,
  now = new Date(),
): string | null {
  const state = nudgeAvailability(row, now);
  if (state === "closed") return null;
  if (state === "ready") return "Nudge";
  if (state === "cooling_down" || state === "limit") return "Nudged";
  const created = Date.parse(row.createdAt);
  const days = Math.max(1, Math.ceil((NUDGE_WAIT_MS - (now.getTime() - created)) / (24 * 60 * 60 * 1000)));
  return `Nudge in ${days} ${days === 1 ? "day" : "days"}`;
}

const REFERRER_SELECT_BASE =
  "id, user_id, display_name, company, company_slug, title, linkedin, slug, bio, open_to_refer, created_at, updated_at";
const REFERRER_SELECT = `${REFERRER_SELECT_BASE}, referred_count`;
const REFERRER_PUBLIC_SELECT_BASE =
  "id, display_name, company, company_slug, title, linkedin, slug, bio, open_to_refer, created_at, updated_at";
const REFERRER_PUBLIC_SELECT = `${REFERRER_PUBLIC_SELECT_BASE}, referred_count`;
const REQUEST_SELECT_BASE =
  "id, referrer_id, candidate_name, candidate_email, candidate_linkedin, role, notes, source, status, created_at";
const REQUEST_SELECT = `${REQUEST_SELECT_BASE}, updated_at, nudge_count, last_nudged_at`;

function columnMissing(error: { message?: string } | null | undefined, column: string): boolean {
  const message = (error?.message ?? "").toLowerCase();
  return message.includes(column) && (
    message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find")
  );
}

async function selectWithFallback(
  columns: string,
  fallback: string,
  missing: string,
  run: (columns: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<{ data: unknown; error: { message?: string } | null }> {
  const first = await run(columns);
  if (first.error && columnMissing(first.error, missing)) return run(fallback);
  return first;
}

async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.user?.id ?? null;
}

export async function fetchMyReferrerProfile(): Promise<CompanyReferrer | null> {
  try {
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await selectWithFallback(
      REFERRER_SELECT,
      REFERRER_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .select(columns)
        .eq("user_id", userId)
        .maybeSingle(),
    );
    if (error) {
      console.warn("[company_referrers] fetch mine:", error.message);
      return null;
    }
    return data ? mapReferrerRow(data as ReferrerRow) : null;
  } catch (err) {
    console.warn("[company_referrers] fetch mine:", err);
    return null;
  }
}

export async function fetchReferrerBySlug(slug: string): Promise<LoadResult<CompanyReferrer | null>> {
  const trimmed = slug.trim();
  if (!trimmed) return { ok: true, data: null };
  try {
    const { data, error } = await selectWithFallback(
      REFERRER_PUBLIC_SELECT,
      REFERRER_PUBLIC_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .select(columns)
        .eq("slug", trimmed)
        .eq("open_to_refer", true)
        .maybeSingle(),
    );
    if (error) {
      console.warn("[company_referrers] fetch slug:", error.message);
      return { ok: false, error: REFERRER_LOOKUP_FAILED };
    }
    return { ok: true, data: data ? mapReferrerRow(data as ReferrerRow) : null };
  } catch (err) {
    console.warn("[company_referrers] fetch slug:", err);
    return { ok: false, error: REFERRER_LOOKUP_FAILED };
  }
}

export async function searchOpenReferrers(company: string): Promise<LoadResult<CompanyReferrer[]>> {
  const q = sanitizeSearchTerm(company);
  if (q.length < 2) return { ok: true, data: [] };
  try {
    const { data, error } = await selectWithFallback(
      REFERRER_PUBLIC_SELECT,
      REFERRER_PUBLIC_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .select(columns)
        .eq("open_to_refer", true)
        .ilike("company", `%${q}%`)
        .limit(12),
    );
    if (error) {
      console.warn("[company_referrers] search:", error.message);
      return { ok: false, error: REFERRER_SEARCH_FAILED };
    }
    return { ok: true, data: ((data ?? []) as ReferrerRow[]).map(mapReferrerRow) };
  } catch (err) {
    console.warn("[company_referrers] search:", err);
    return { ok: false, error: REFERRER_SEARCH_FAILED };
  }
}

/** List open referrers for one company tile in the signed-in directory. */
export async function listOpenReferrersForCompany(companySlug: string): Promise<LoadResult<CompanyReferrer[]>> {
  const slug = companySlug.trim();
  if (!slug) return { ok: true, data: [] };
  try {
    const { data, error } = await selectWithFallback(
      REFERRER_PUBLIC_SELECT,
      REFERRER_PUBLIC_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .select(columns)
        .eq("company_slug", slug)
        .eq("open_to_refer", true)
        .order("display_name", { ascending: true })
        .limit(50),
    );
    if (error) {
      console.warn("[company_referrers] list company referrers:", error.message);
      return { ok: false, error: REFERRER_SEARCH_FAILED };
    }
    return { ok: true, data: ((data ?? []) as ReferrerRow[]).map(mapReferrerRow) };
  } catch (err) {
    console.warn("[company_referrers] list company referrers:", err);
    return { ok: false, error: REFERRER_SEARCH_FAILED };
  }
}

/**
 * Collapse open referrer rows into one tile per company. Prefer the longest
 * company spelling (more likely the full brand) and sum referred tallies.
 */
export function aggregateOpenCompanies(
  rows: Array<Pick<CompanyReferrer, "company" | "companySlug" | "referredCount">>,
  domainsBySlug: Record<string, string> = {},
): OpenReferralCompany[] {
  const bySlug = new Map<string, OpenReferralCompany>();
  for (const row of rows) {
    const slug = (row.companySlug || slugifyPart(row.company)).trim();
    if (!slug) continue;
    const existing = bySlug.get(slug);
    const referred = row.referredCount ?? 0;
    if (!existing) {
      bySlug.set(slug, {
        company: row.company.trim() || slug,
        companySlug: slug,
        companyDomain: domainsBySlug[slug] ?? "",
        openCount: 1,
        referredCount: referred,
      });
      continue;
    }
    existing.openCount += 1;
    existing.referredCount += referred;
    if (row.company.trim().length > existing.company.length) {
      existing.company = row.company.trim();
    }
    if (!existing.companyDomain && domainsBySlug[slug]) {
      existing.companyDomain = domainsBySlug[slug];
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return a.company.localeCompare(b.company);
  });
}

/** Filter the company grid; empty query returns the full list. */
export function filterOpenCompanies(companies: OpenReferralCompany[], query: string): OpenReferralCompany[] {
  const q = sanitizeSearchTerm(query).toLowerCase();
  if (q.length < 1) return companies;
  return companies.filter((c) =>
    c.company.toLowerCase().includes(q) || c.companySlug.includes(q),
  );
}

/** Public directory: every company that currently has an open referrer. */
export async function listOpenReferralCompanies(
  domainsBySlug: Record<string, string> = {},
): Promise<LoadResult<OpenReferralCompany[]>> {
  try {
    const { data, error } = await selectWithFallback(
      REFERRER_PUBLIC_SELECT,
      REFERRER_PUBLIC_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .select(columns)
        .eq("open_to_refer", true)
        .order("company", { ascending: true })
        .limit(OPEN_COMPANIES_LIMIT),
    );
    if (error) {
      console.warn("[company_referrers] list companies:", error.message);
      return { ok: false, error: REFERRER_COMPANIES_FAILED };
    }
    const rows = ((data ?? []) as ReferrerRow[]).map(mapReferrerRow);
    return { ok: true, data: aggregateOpenCompanies(rows, domainsBySlug) };
  } catch (err) {
    console.warn("[company_referrers] list companies:", err);
    return { ok: false, error: REFERRER_COMPANIES_FAILED };
  }
}

export async function upsertMyReferrerProfile(input: {
  displayName: string;
  company: string;
  title: string;
  linkedin?: string;
  bio?: string;
  openToRefer?: boolean;
}): Promise<CompanyReferrer | null> {
  const displayName = clip(input.displayName, REFERRER_LIMITS.name);
  const company = clip(input.company, REFERRER_LIMITS.company);
  const title = clip(input.title, REFERRER_LIMITS.title);
  if (!displayName || !company || !title) return null;
  try {
    const userId = await currentUserId();
    if (!userId) return null;
    const existing = await fetchMyReferrerProfile();
    const slug = existing?.slug || makeReferrerSlug(displayName, company, userId);
    const payload = {
      user_id: userId,
      display_name: displayName,
      company,
      company_slug: slugifyPart(company),
      title,
      linkedin: safeHttpUrl(input.linkedin),
      slug,
      bio: clip(input.bio ?? "", REFERRER_LIMITS.bio) || null,
      open_to_refer: input.openToRefer ?? true,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await selectWithFallback(
      REFERRER_SELECT,
      REFERRER_SELECT_BASE,
      "referred_count",
      (columns) => getSupabaseClient()
        .from("company_referrers")
        .upsert(payload, { onConflict: "user_id" })
        .select(columns)
        .single(),
    );
    if (error || !data) {
      console.warn("[company_referrers] upsert:", error?.message);
      return null;
    }
    return mapReferrerRow(data as ReferrerRow);
  } catch (err) {
    console.warn("[company_referrers] upsert:", err);
    return null;
  }
}

export async function fetchMyReferralRequests(referrerId?: string): Promise<CompanyReferralRequest[] | null> {
  try {
    const id = referrerId ?? (await fetchMyReferrerProfile())?.id;
    if (!id) return [];
    const { data, error } = await selectWithFallback(
      REQUEST_SELECT,
      REQUEST_SELECT_BASE,
      "nudge_count",
      (columns) => getSupabaseClient()
        .from("company_referral_requests")
        .select(columns)
        .eq("referrer_id", id)
        .order("created_at", { ascending: false }),
    );
    if (error) {
      console.warn("[company_referral_requests] fetch:", error.message);
      return null;
    }
    return ((data ?? []) as RequestRow[]).map(mapRequestRow);
  } catch (err) {
    console.warn("[company_referral_requests] fetch:", err);
    return null;
  }
}

export async function createReferralRequest(input: {
  referrerId: string;
  candidateName: string;
  candidateEmail?: string;
  candidateLinkedin?: string;
  role: string;
  notes?: string;
  source?: "request" | "submitted";
}): Promise<ReferralWriteResult> {
  const candidateName = clip(input.candidateName, REFERRER_LIMITS.name);
  const candidateEmail = clip(input.candidateEmail ?? "", REFERRER_LIMITS.email);
  const role = clip(input.role, REFERRER_LIMITS.role);
  const notes = clip(input.notes ?? "", REFERRER_LIMITS.notes) || null;
  const source = input.source ?? "request";
  if (!input.referrerId || !candidateName || !role) {
    return { request: null, error: source === "submitted" ? "Could not log this referral. Add the candidate name and role." : "Could not send this request. Add your name, a valid email, and the role you want." };
  }
  if (source !== "submitted" && !isUsableEmail(candidateEmail)) {
    return { request: null, error: "Could not send this request. Add your name, a valid email, and the role you want." };
  }
  const payload = {
    referrer_id: input.referrerId,
    candidate_name: candidateName,
    candidate_email: candidateEmail,
    candidate_linkedin: safeHttpUrl(input.candidateLinkedin),
    role,
    notes,
    source,
    status: source === "submitted" ? "referred" : "requested",
  };
  try {
    const userId = await currentUserId();
    if (source !== "submitted" && !userId) {
      return { request: null, error: "Sign in to ask for a referral." };
    }
    const insertRow = { ...payload, candidate_user_id: userId };
    if (userId) {
      const { data, error } = await getSupabaseClient()
        .from("company_referral_requests")
        .insert(insertRow)
        .select(REQUEST_SELECT_BASE)
        .single();
      if (error || !data) {
        console.warn("[company_referral_requests] insert:", error?.message);
        return { request: null, error: referralWriteError(error) };
      }
      return { request: mapRequestRow(data as RequestRow), error: null };
    }
    // Anon can INSERT but cannot SELECT the row back.
    const { error } = await getSupabaseClient()
      .from("company_referral_requests")
      .insert(insertRow);
    if (error) {
      console.warn("[company_referral_requests] insert:", error.message);
      return { request: null, error: referralWriteError(error) };
    }
    return {
      request: mapRequestRow({
        id: "pending",
        referrer_id: input.referrerId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_linkedin: payload.candidate_linkedin,
        role,
        notes,
        source,
        status: payload.status,
        created_at: new Date().toISOString(),
      }),
      error: null,
    };
  } catch (err) {
    console.warn("[company_referral_requests] insert:", err);
    return { request: null, error: referralWriteError(null) };
  }
}

export async function updateReferralRequestStatus(
  id: string,
  status: ReferralRequestStatus,
): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient()
      .from("company_referral_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.warn("[company_referral_requests] update:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[company_referral_requests] update:", err);
    return false;
  }
}

export async function fetchMySentReferralRequests(): Promise<SentReferralRequest[] | null> {
  try {
    const userId = await currentUserId();
    if (!userId) return [];
    const { data, error } = await selectWithFallback(
      REQUEST_SELECT,
      REQUEST_SELECT_BASE,
      "nudge_count",
      (columns) => getSupabaseClient()
        .from("company_referral_requests")
        .select(columns)
        .eq("candidate_user_id", userId)
        .eq("source", "request")
        .order("created_at", { ascending: false }),
    );
    if (error) {
      console.warn("[company_referral_requests] sent:", error.message);
      return null;
    }
    const rows = ((data ?? []) as RequestRow[]).map(mapRequestRow);
    const referrerIds = Array.from(new Set(rows.map((row) => row.referrerId).filter(Boolean)));
    const referrers = new Map<string, { name: string; company: string; count: number }>();
    if (referrerIds.length > 0) {
      const loaded = await selectWithFallback(
        "id, display_name, company, referred_count",
        "id, display_name, company",
        "referred_count",
        (columns) => getSupabaseClient()
          .from("company_referrers")
          .select(columns)
          .in("id", referrerIds),
      );
      for (const row of (loaded.data ?? []) as Array<{ id: string; display_name: string | null; company: string | null; referred_count?: number | null }>) {
        referrers.set(row.id, {
          name: row.display_name ?? "",
          company: row.company ?? "",
          count: row.referred_count ?? 0,
        });
      }
    }
    return rows.map((row) => {
      const referrer = referrers.get(row.referrerId);
      return {
        ...row,
        referrerName: referrer?.name ?? "",
        referrerCompany: referrer?.company ?? "",
        referrerReferredCount: referrer?.count ?? 0,
      };
    });
  } catch (err) {
    console.warn("[company_referral_requests] sent:", err);
    return null;
  }
}

export function nudgeErrorMessage(error: { message?: string } | null | undefined): string {
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("3 days")) return "You can nudge 3 days after asking.";
  if (message.includes("recently")) return "You already nudged them this week.";
  if (message.includes("limit")) return "You have used both nudges for this request.";
  if (message.includes("no longer")) return "This request can no longer be nudged.";
  return "Could not nudge this request.";
}

export async function nudgeReferralRequest(id: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await getSupabaseClient().rpc("nudge_referral_request", { request_id: id });
    if (error) {
      console.warn("[company_referral_requests] nudge:", error.message);
      return { ok: false, error: nudgeErrorMessage(error) };
    }
    return { ok: true, error: null };
  } catch (err) {
    console.warn("[company_referral_requests] nudge:", err);
    return { ok: false, error: nudgeErrorMessage(null) };
  }
}

export async function deleteReferralRequest(id: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseClient()
      .from("company_referral_requests")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("[company_referral_requests] delete:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[company_referral_requests] delete:", err);
    return false;
  }
}
