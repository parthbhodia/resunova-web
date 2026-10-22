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

/**
 * What a candidate reports back after a referral.
 *
 * `interview`, `offer` and `placed` all mean it worked; the first two earn the
 * same 10-day reward today and `placed` is informational, so a direct report of
 * a hire still pays those 10 days. `closed` records the honest miss and earns
 * nothing. Declared here because it is a column on the request row, and
 * lib/referralRewards re-exports it rather than the other way round, so there is
 * one definition.
 *
 * The order matters: the RPC only moves forwards (interview -> offer -> placed)
 * and treats placed/closed as final.
 */
export const REFERRAL_OUTCOMES = ["interview", "offer", "placed", "closed"] as const;
export type ReferralOutcome = (typeof REFERRAL_OUTCOMES)[number];

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
  /** City/region or Remote, where this desk hires from. */
  companyLocation: string | null;
  /** Company homepage or careers URL. Required on save. */
  companyWebsite: string | null;
  openToRefer: boolean;
  /** People this employee has marked Referred. Absent means unknown, show 0. */
  referredCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyReferralRequest = {
  id: string;
  referrerId: string;
  candidateUserId: string | null;
  candidateName: string;
  candidateEmail: string;
  candidateLinkedin: string | null;
  /** Private Storage object path in `referral-resumes` (not a public URL). */
  resumePdfPath: string | null;
  candidatePhone: string | null;
  /** Whole years of experience at ask time (0–50). */
  candidateYearsExperience: number | null;
  candidateHeadline: string | null;
  role: string;
  notes: string | null;
  source: "request" | "submitted";
  status: ReferralRequestStatus;
  /**
   * What the candidate reported back after being referred. Only the candidate
   * can set it (migration 059), because the referrer is the party the interview
   * reward pays.
   */
  candidateOutcome: ReferralOutcome | null;
  candidateOutcomeAt: string | null;
  createdAt: string;
  updatedAt?: string;
  nudgeCount?: number;
  lastNudgedAt?: string | null;
};

/** Private bucket for PDFs attached to candidate asks. */
export const REFERRAL_RESUME_BUCKET = "referral-resumes";
export const REFERRAL_RESUME_MAX_BYTES = 5 * 1024 * 1024;

export type SentReferralRequest = CompanyReferralRequest & {
  referrerName: string;
  referrerCompany: string;
  referrerReferredCount: number;
};

export const REFERRER_LIMITS = {
  name: 80,
  company: 80,
  location: 80,
  title: 80,
  bio: 400,
  url: 500,
  role: 120,
  email: 120,
  notes: 2000,
  phone: 40,
  headline: 160,
  years: 50,
} as const;

export const REFERRER_PROFILE_REQUIRED =
  "Add your name, company, title, company website, and company location.";

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
  /** Favicon host when known (desk website, else jobs corpus); empty → CompanyLogo guesses from slug. */
  companyDomain: string;
  companyLocation: string;
  companyWebsite: string;
  openCount: number;
  referredCount: number;
};

/**
 * Directory order.
 *
 * `referred` is the default because it is the only order that tells a candidate
 * anything: a company with one open referrer who has submitted six people is a
 * better bet than a company with six referrers who have submitted none.
 */
export type OpenCompanySort = "referred" | "open";

export function sortOpenCompanies(
  companies: OpenReferralCompany[],
  mode: OpenCompanySort = "referred",
): OpenReferralCompany[] {
  return [...companies].sort((a, b) => {
    if (mode === "open" && b.openCount !== a.openCount) return b.openCount - a.openCount;
    if (b.referredCount !== a.referredCount) return b.referredCount - a.referredCount;
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return a.company.localeCompare(b.company);
  });
}

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
  company_location?: string | null;
  company_website?: string | null;
  open_to_refer: boolean | null;
  referred_count?: number | null;
  created_at: string;
  updated_at: string;
};

type RequestRow = {
  id: string;
  referrer_id: string;
  candidate_user_id?: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_linkedin: string | null;
  resume_pdf_path?: string | null;
  candidate_phone?: string | null;
  candidate_years_experience?: number | null;
  candidate_headline?: string | null;
  role: string | null;
  notes: string | null;
  source: string | null;
  status: string | null;
  candidate_outcome?: string | null;
  candidate_outcome_at?: string | null;
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
    companyLocation: row.company_location?.trim() || null,
    companyWebsite: row.company_website?.trim() || null,
    openToRefer: row.open_to_refer !== false,
    referredCount: row.referred_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Hostname for CompanyLogo / favicon. Empty when the URL is not usable. */
export function websiteHostname(value: string | null | undefined): string {
  const url = safeHttpUrl(value);
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function mapOutcome(value: string | null | undefined): ReferralOutcome | null {
  return REFERRAL_OUTCOMES.includes(value as ReferralOutcome) ? (value as ReferralOutcome) : null;
}

export function mapRequestRow(row: RequestRow): CompanyReferralRequest {
  const status = REFERRAL_REQUEST_STATUSES.includes(row.status as ReferralRequestStatus)
    ? (row.status as ReferralRequestStatus)
    : "requested";
  const years = row.candidate_years_experience;
  return {
    id: row.id,
    referrerId: row.referrer_id,
    candidateUserId: row.candidate_user_id ?? null,
    candidateName: row.candidate_name ?? "",
    candidateEmail: row.candidate_email ?? "",
    candidateLinkedin: row.candidate_linkedin,
    resumePdfPath: row.resume_pdf_path ?? null,
    candidatePhone: row.candidate_phone ?? null,
    candidateYearsExperience:
      typeof years === "number" && Number.isFinite(years) ? Math.max(0, Math.min(50, Math.round(years))) : null,
    candidateHeadline: row.candidate_headline ?? null,
    role: row.role ?? "",
    notes: row.notes,
    source: row.source === "submitted" ? "submitted" : "request",
    status,
    candidateOutcome: mapOutcome(row.candidate_outcome),
    candidateOutcomeAt: row.candidate_outcome_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    nudgeCount: row.nudge_count ?? 0,
    lastNudgedAt: row.last_nudged_at ?? null,
  };
}

/** Parse a whole-year count from a typed value or labels like "5 years". */
export function parseYearsExperience(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= 0 && n <= REFERRER_LIMITS.years ? n : null;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/(\d{1,2})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 && n <= REFERRER_LIMITS.years ? n : null;
}

/** Approximate years from extracted experience date strings (YYYY…YYYY). */
export function approxYearsFromExperience(
  experience: ReadonlyArray<{ dates?: string | null }> | null | undefined,
): number | null {
  if (!experience?.length) return null;
  let earliest = new Date().getFullYear();
  let latest = 0;
  for (const exp of experience) {
    const startMatch = exp.dates?.match(/(\d{4})/);
    if (startMatch) {
      const year = parseInt(startMatch[1], 10);
      if (year < earliest) earliest = year;
    }
    const endMatch = exp.dates?.match(/(Present|Current|\d{4})\s*$/i);
    if (endMatch) {
      const year = /present|current/i.test(endMatch[1])
        ? new Date().getFullYear()
        : parseInt(endMatch[1], 10);
      if (year > latest) latest = year;
    }
  }
  if (latest < earliest) return null;
  return parseYearsExperience(latest - earliest);
}

/** Deep link to the referrer-facing candidate packet for one request. */
export function referralCandidatePath(requestId: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/refer/candidate/?r=${encodeURIComponent(requestId)}`;
}

/**
 * A company's LinkedIn page or its website — the thing a candidate can click to
 * check the company is real before handing over their résumé.
 *
 * ⚠️ A PERSONAL LinkedIn IS REJECTED, and that is the whole reason this is not
 * a plain URL check. The field directly above it in the form is the referrer's
 * OWN `linkedin.com/in/...` profile, so pasting the same value here is the
 * mistake everyone will make, and it would pass any generic validator while
 * verifying nothing about the company.
 */
export function isUsableCompanyUrl(value: string): boolean {
  const raw = (value || "").trim();
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // ⚠️ USERINFO IS THE LOAD-BEARING GUARD, and a test is what found it.
  // "mailto:hr@stripe.com" became "https://mailto:hr@stripe.com" once the
  // scheme was prepended, which parses with userinfo "mailto:hr" and host
  // "stripe.com" — so it PASSED. Same shape as "https://evil.com@stripe.com",
  // and this value is rendered as a clickable link offered to candidates AS
  // verification, which makes it worse than a cosmetic bug.
  // A separate "reject non-http schemes" check was tried and REMOVED: probed
  // against twelve scheme-carrying inputs it rejected nothing this line and the
  // dotted-host check below do not already reject, and a guard no mutation can
  // turn red is one that rots into false confidence.
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  // A bare label ("localhost", "intranet") names nothing a candidate can check.
  if (!host.includes(".") || host.endsWith(".")) return false;

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    // Only the company directory. /in/ and /pub/ are people.
    return /^\/(company|school)\/[^/]+/i.test(url.pathname);
  }
  return true;
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
  if (message.includes("linkedin or resume")) {
    return "Could not send this request. Add a LinkedIn URL or upload your resume.";
  }
  if (message.includes("row-level security") || message.includes("violates row-level")) {
    return REFERRER_LINK_INACTIVE;
  }
  return "Could not send this request. Add your name, a valid email, the role you want, and a LinkedIn URL or resume PDF.";
}

export function isReferralResumeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

/** Upload a candidate résumé PDF into the private referral bucket. */
export async function uploadReferralResume(
  file: File,
): Promise<{ path: string; error: null } | { path: null; error: string }> {
  if (!isReferralResumeFile(file)) {
    return { path: null, error: "Upload a PDF résumé." };
  }
  if (file.size <= 0 || file.size > REFERRAL_RESUME_MAX_BYTES) {
    return { path: null, error: "Resume must be a PDF under 5 MB." };
  }
  try {
    const userId = await currentUserId();
    if (!userId) {
      return { path: null, error: "Sign in to ask for a referral." };
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "resume.pdf";
    const path = `${userId}/${crypto.randomUUID()}-${safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`}`;
    const { error } = await getSupabaseClient().storage
      .from(REFERRAL_RESUME_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (error) {
      console.warn("[referral-resumes] upload:", error.message);
      return { path: null, error: "Could not upload your resume. Try again." };
    }
    return { path, error: null };
  } catch (err) {
    console.warn("[referral-resumes] upload:", err);
    return { path: null, error: "Could not upload your resume. Try again." };
  }
}

/**
 * Open a referral résumé WITHOUT ever producing a shareable link.
 *
 * ⚠️ THIS REPLACES A SIGNED URL, AND THE DIFFERENCE IS THE WHOLE POINT.
 * `createSignedUrl` returns a bearer credential in a query string: anyone
 * holding that string reads the file, no login, until it expires. It was
 * handed to the browser and opened in a new tab, so it sat in the address bar
 * and the history, one copy-paste from leaving the product — which is exactly
 * how it got forwarded into a WhatsApp thread. The payload is a résumé: a real
 * person's name, email, phone and employment history.
 *
 * A `blob:` URL cannot be forwarded. It is scoped to this origin AND this
 * document, so pasting it anywhere else resolves to nothing, and it dies when
 * the tab does. Authorization is also checked at REQUEST time against the
 * caller's own session and the storage RLS policies, rather than baked into a
 * token minted an hour earlier.
 *
 * ⚠️ The bucket was never the weak part: it is private, PDF-only, 5MB-capped,
 * and its RLS lets a referrer read only a résumé attached to a request on
 * their OWN desk. What leaked was the handle, not the door.
 */
export async function openReferralResumePdf(
  path: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = (path || "").trim();
  if (!trimmed) return { ok: false, error: "No resume on this request." };
  try {
    const { data, error } = await getSupabaseClient().storage
      .from(REFERRAL_RESUME_BUCKET)
      .download(trimmed);
    if (error || !data) {
      console.warn("[referral-resumes] download:", error?.message);
      return { ok: false, error: "Could not open that resume. Try again in a moment." };
    }
    const objectUrl = URL.createObjectURL(data);
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      // ⚠️ `window.open` after an await is outside the user-gesture window and
      // browsers block it. An anchor click is not subject to that, so the
      // popup blocker degrades to a download rather than to nothing happening.
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = trimmed.split("/").pop() || "resume.pdf";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // Long enough for the new tab to read it, short enough not to linger.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { ok: true };
  } catch (err) {
    console.warn("[referral-resumes] download:", err);
    return { ok: false, error: "Could not open that resume. Try again in a moment." };
  }
}

/**
 * `company_referrers.title` is `text not null default ''` (migration 044), so a
 * row seeded outside the signup path carries no title and a naive template
 * renders an orphan leading period, or a dangling " at Acme". Drop the empty
 * parts before joining rather than patching each call site.
 */
/**
 * Join the parts that are actually present, with any separator.
 *
 * ⚠️ THE RULE IS SEPARATOR-AGNOSTIC ON PURPOSE. `company_referrers.title` is
 * `text not null default ''` (migration 044), so a row seeded outside the
 * signup path has an empty title and a naive template renders a leading
 * orphan — a stray "." in the ask form, a dangling " · " in the finder. That
 * defect has now survived TWO full rewrites of this feature, each time because
 * the new templates re-derived the join themselves. Reach for this rather than
 * writing `a + sep + b` at a call site.
 */
export function joinNonEmpty(separator: string, ...parts: Array<string | null | undefined>): string {
  return parts.map((part) => (part || "").trim()).filter(Boolean).join(separator);
}

export function joinReferrerSentences(...parts: Array<string | null | undefined>): string {
  return joinNonEmpty(". ", ...parts);
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

/**
 * Whether this caller may send an ask through a referral link.
 *
 * The gate is plan-based, and the answer is deliberately NOT derived from a
 * Pro subscription here: the authoritative tier comes from the API's
 * entitlements policy via `GET /api/scan-limit-status`, and duplicating the
 * rule in the browser is how the two drift. This type exists so a call site has
 * to make the decision explicitly and so the copy that follows can name a
 * remedy rather than guess.
 */
export type ReferralAskBlockReason = "upgrade" | "sign_in";

export type ReferralAskEntitlement =
  /** Pro, admin, or an institution seat. */
  | { allowed: true; reason?: undefined }
  /** Free plan: can browse the directory, cannot send an ask. */
  | { allowed: false; reason: ReferralAskBlockReason };

export const REFERRAL_ASK_BLOCKED_COPY: Record<ReferralAskBlockReason, string> = {
  upgrade: "Asking for a referral is part of Pro. Your desk and your saved requests stay on the free plan.",
  sign_in: "Sign in to ask for a referral.",
};

export function referralAskEntitlement(input: {
  signedIn: boolean;
  /** `plan` from /api/scan-limit-status, or null when unknown. */
  plan: string | null;
  unlimited: boolean;
}): ReferralAskEntitlement {
  // Session wins over any stale plan field left on a guest payload.
  if (!input.signedIn) return { allowed: false, reason: "sign_in" };
  const plan = (input.plan || "").trim().toLowerCase();
  // Metered Pro still has plan:"pro" with unlimited:false. Institution/admin
  // are named tiers even if a status payload drops unlimited.
  if (
    input.unlimited
    || plan === "pro"
    || plan === "admin"
    || plan === "institution"
  ) {
    return { allowed: true };
  }
  // Free (plan omitted or "free") and unknown named plans: Pro wall.
  // /api/scan-limit-status omits `plan` on the metered free tier, so null while
  // signed in is the normal free reading, not a missing session.
  return { allowed: false, reason: "upgrade" };
}

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
  "id, user_id, display_name, company, company_slug, title, linkedin, slug, bio, company_location, company_website, open_to_refer, created_at, updated_at";
const REFERRER_SELECT = `${REFERRER_SELECT_BASE}, referred_count`;
const REFERRER_PUBLIC_SELECT_BASE =
  "id, display_name, company, company_slug, title, linkedin, slug, bio, company_location, company_website, open_to_refer, created_at, updated_at";
const REFERRER_PUBLIC_SELECT = `${REFERRER_PUBLIC_SELECT_BASE}, referred_count`;
const REQUEST_SELECT_BASE =
  "id, referrer_id, candidate_user_id, candidate_name, candidate_email, candidate_linkedin, resume_pdf_path, candidate_phone, candidate_years_experience, candidate_headline, role, notes, source, status, created_at";
const REQUEST_SELECT = `${REQUEST_SELECT_BASE}, updated_at, nudge_count, last_nudged_at`;
/**
 * The outcome columns arrived in migration 059, so every read falls back to the
 * pre-059 set if they are missing. Without that, applying the migration and
 * deploying the web half in the wrong order breaks the inbox rather than
 * deferring the feature.
 */
const REQUEST_SELECT_OUTCOME = `${REQUEST_SELECT}, candidate_outcome, candidate_outcome_at`;
const REQUEST_SELECT_OUTCOME_MISSING = "candidate_outcome";

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
      // Sort by the tally so the most proven referrer leads the list, but only
      // order by it when the column was actually selected: the fallback column
      // set omits it, and ordering by a column that is not in the select fails.
      (columns) => {
        let query = getSupabaseClient()
          .from("company_referrers")
          .select(columns)
          .eq("company_slug", slug)
          .eq("open_to_refer", true);
        query = columns.includes("referred_count")
          ? query.order("referred_count", { ascending: false }).order("display_name", { ascending: true })
          : query.order("display_name", { ascending: true });
        return query.limit(50);
      },
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
  rows: Array<
    Pick<CompanyReferrer, "company" | "companySlug" | "referredCount">
    & Partial<Pick<CompanyReferrer, "companyLocation" | "companyWebsite">>
  >,
  domainsBySlug: Record<string, string> = {},
): OpenReferralCompany[] {
  const bySlug = new Map<string, OpenReferralCompany>();
  for (const row of rows) {
    const slug = (row.companySlug || slugifyPart(row.company)).trim();
    if (!slug) continue;
    const existing = bySlug.get(slug);
    const referred = row.referredCount ?? 0;
    const location = (row.companyLocation ?? "").trim();
    const website = safeHttpUrl(row.companyWebsite) ?? "";
    const fromWebsite = websiteHostname(website);
    if (!existing) {
      bySlug.set(slug, {
        company: row.company.trim() || slug,
        companySlug: slug,
        companyDomain: fromWebsite || domainsBySlug[slug] || "",
        companyLocation: location,
        companyWebsite: website,
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
    if (!existing.companyLocation && location) existing.companyLocation = location;
    if (!existing.companyWebsite && website) {
      existing.companyWebsite = website;
      if (fromWebsite) existing.companyDomain = fromWebsite;
    }
    if (!existing.companyDomain) {
      existing.companyDomain = fromWebsite || domainsBySlug[slug] || "";
    }
  }
  return sortOpenCompanies(Array.from(bySlug.values()));
}

/**
 * Highest `referredCount` in a company, or null when nobody has referred anyone.
 *
 * The "Top referrer" badge is the one status signal in this product, and a
 * badge that shows up on a newcomer at zero referrals is worth nothing. The
 * threshold is deliberately the max rather than a fixed number: with a handful
 * of referrers per company, "the best of what is here" is the only ranking that
 * is true, and it stays true as more people join.
 */
export function topReferrerId(
  referrers: ReadonlyArray<Pick<CompanyReferrer, "id" | "referredCount">>,
): string | null {
  let bestId: string | null = null;
  let best = 0;
  for (const referrer of referrers) {
    const count = referrer.referredCount ?? 0;
    if (count > best) {
      best = count;
      bestId = referrer.id;
    }
  }
  return best > 0 ? bestId : null;
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
  companyLocation: string;
  companyWebsite: string;
  linkedin?: string;
  bio?: string;
  openToRefer?: boolean;
}): Promise<CompanyReferrer | null> {
  const displayName = clip(input.displayName, REFERRER_LIMITS.name);
  const company = clip(input.company, REFERRER_LIMITS.company);
  const title = clip(input.title, REFERRER_LIMITS.title);
  const companyLocation = clip(input.companyLocation, REFERRER_LIMITS.location);
  // ⚠️ `isUsableCompanyUrl` BEFORE `safeHttpUrl`, and it is a finding carried
  // across from the competing implementation this replaced. `safeHttpUrl` only
  // asks "does this parse as http(s)?", which let `mailto:hr@stripe.com` through
  // (prepending the scheme gives `https://mailto:hr@stripe.com`: userinfo
  // `mailto:hr`, host `stripe.com`), as well as `https://evil.com@stripe.com`,
  // a bare label like `localhost`, and a PERSONAL linkedin.com/in/ profile
  // pasted into the field above this one. This value is rendered as a clickable
  // link offered to candidates as the way to check the employer is real.
  const companyWebsite = isUsableCompanyUrl(input.companyWebsite ?? "") ? safeHttpUrl(input.companyWebsite) : null;
  if (!displayName || !company || !title || !companyLocation || !companyWebsite) return null;
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
      company_location: companyLocation,
      company_website: companyWebsite,
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
      REQUEST_SELECT_OUTCOME,
      REQUEST_SELECT,
      REQUEST_SELECT_OUTCOME_MISSING,
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
  resumePdfPath?: string | null;
  candidatePhone?: string;
  candidateYearsExperience?: string | number | null;
  candidateHeadline?: string;
  role: string;
  notes?: string;
  source?: "request" | "submitted";
}): Promise<ReferralWriteResult> {
  const candidateName = clip(input.candidateName, REFERRER_LIMITS.name);
  const candidateEmail = clip(input.candidateEmail ?? "", REFERRER_LIMITS.email);
  const role = clip(input.role, REFERRER_LIMITS.role);
  const notes = clip(input.notes ?? "", REFERRER_LIMITS.notes) || null;
  const resumePdfPath = clip(input.resumePdfPath ?? "", REFERRER_LIMITS.url) || null;
  const candidatePhone = clip(input.candidatePhone ?? "", REFERRER_LIMITS.phone) || null;
  const candidateYearsExperience = parseYearsExperience(input.candidateYearsExperience);
  const candidateHeadline = clip(input.candidateHeadline ?? "", REFERRER_LIMITS.headline) || null;
  const source = input.source ?? "request";
  const askError =
    "Could not send this request. Add your name, a valid email, the role you want, and a LinkedIn URL or resume PDF.";
  if (!input.referrerId || !candidateName || !role) {
    return {
      request: null,
      error: source === "submitted"
        ? "Could not log this referral. Add the candidate name and role."
        : askError,
    };
  }
  if (source !== "submitted" && !isUsableEmail(candidateEmail)) {
    return { request: null, error: askError };
  }
  const linkedinRaw = (input.candidateLinkedin ?? "").trim();
  const candidateLinkedin = linkedinRaw ? safeHttpUrl(linkedinRaw) : null;
  if (linkedinRaw && !candidateLinkedin) {
    return {
      request: null,
      error: "That LinkedIn URL does not look valid. Fix it or clear the field and upload a PDF instead.",
    };
  }
  if (source !== "submitted" && !candidateLinkedin && !resumePdfPath) {
    return { request: null, error: "Could not send this request. Add a LinkedIn URL or upload your resume." };
  }
  const yearsRaw = input.candidateYearsExperience;
  if (
    yearsRaw != null
    && String(yearsRaw).trim() !== ""
    && parseYearsExperience(yearsRaw) == null
  ) {
    return { request: null, error: "Years of experience must be a whole number from 0 to 50." };
  }
  const payload = {
    referrer_id: input.referrerId,
    candidate_name: candidateName,
    candidate_email: candidateEmail,
    candidate_linkedin: candidateLinkedin,
    resume_pdf_path: resumePdfPath,
    candidate_phone: candidatePhone,
    candidate_years_experience: candidateYearsExperience,
    candidate_headline: candidateHeadline,
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
        candidate_user_id: null,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_linkedin: payload.candidate_linkedin,
        resume_pdf_path: payload.resume_pdf_path,
        candidate_phone: payload.candidate_phone,
        candidate_years_experience: payload.candidate_years_experience,
        candidate_headline: payload.candidate_headline,
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

/** Load one request the signed-in user may read (referrer or candidate). */
export async function fetchReferralRequestById(id: string): Promise<LoadResult<CompanyReferralRequest | null>> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: true, data: null };
  try {
    const { data, error } = await selectWithFallback(
      REQUEST_SELECT_OUTCOME,
      REQUEST_SELECT,
      REQUEST_SELECT_OUTCOME_MISSING,
      (columns) => getSupabaseClient()
        .from("company_referral_requests")
        .select(columns)
        .eq("id", trimmed)
        .maybeSingle(),
    );
    if (error) {
      console.warn("[company_referral_requests] fetch by id:", error.message);
      return { ok: false, error: "Could not load this candidate profile. Try again." };
    }
    return { ok: true, data: data ? mapRequestRow(data as RequestRow) : null };
  } catch (err) {
    console.warn("[company_referral_requests] fetch by id:", err);
    return { ok: false, error: "Could not load this candidate profile. Try again." };
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
      REQUEST_SELECT_OUTCOME,
      REQUEST_SELECT,
      REQUEST_SELECT_OUTCOME_MISSING,
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
