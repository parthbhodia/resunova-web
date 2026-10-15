/**
 * Referral ask / inbox / candidate-packet edge cases.
 * Validators keep the form, DB constraints, and UI copy aligned.
 */
import {
  REFERRAL_RESUME_MAX_BYTES,
  REFERRER_LIMITS,
  isReferralResumeFile,
  isUsableEmail,
  parseYearsExperience,
  safeHttpUrl,
} from "@/lib/companyReferrers";

/** Catalog of product edge cases. Tests assert this list stays complete. */
export const REFERRAL_EDGE_CASES = [
  "candidate_not_signed_in",
  "missing_name",
  "missing_email",
  "invalid_email",
  "missing_role",
  "missing_linkedin_and_resume",
  "invalid_linkedin_when_provided",
  "invalid_years_when_provided",
  "resume_not_pdf",
  "resume_too_large",
  "resume_empty_file",
  "referrer_paused_or_missing",
  "referrer_inbox_full",
  "duplicate_open_request",
  "optional_phone_headline_omitted",
  "legacy_request_without_packet_fields",
  "packet_signed_out",
  "packet_missing_or_forbidden",
  "packet_load_error",
  "resume_signed_url_failed",
  "linkedin_only_no_pdf",
  "pdf_only_no_linkedin",
  "status_reviewing_notifies_candidate",
  "status_referred_or_declined_notifies_candidate",
  "remove_request",
  "nudge_cooldown_and_limit",
  "same_user_is_referrer_and_candidate",
] as const;

export type ReferralEdgeCaseId = (typeof REFERRAL_EDGE_CASES)[number];

export type ReferralAskInput = {
  name: string;
  email: string;
  role: string;
  linkedin: string;
  years: string;
  phone: string;
  headline: string;
  resumeFile: File | null;
};

export type ReferralAskIssue =
  | "sign_in"
  | "name"
  | "email"
  | "role"
  | "linkedin_or_resume"
  | "linkedin_invalid"
  | "years_invalid"
  | "resume_type"
  | "resume_size";

export const REFERRAL_ASK_MESSAGES: Record<ReferralAskIssue, string> = {
  sign_in: "Sign in to ask for a referral.",
  name: "Add your name.",
  email: "Add a valid email.",
  role: "Add the role you want.",
  linkedin_or_resume: "Add a LinkedIn URL or upload your resume.",
  linkedin_invalid: "That LinkedIn URL does not look valid. Fix it or clear the field and upload a PDF instead.",
  years_invalid: "Years of experience must be a whole number from 0 to 50.",
  resume_type: "Upload a PDF résumé.",
  resume_size: "Resume must be a PDF under 5 MB.",
};

export const RESUME_OPEN_FAILED =
  "Could not open that resume. Try again in a moment.";

/** Empty optional packet fields shown so the referrer knows they were omitted. */
export const PACKET_NOT_PROVIDED = "Not provided";

/**
 * Client-side ask validation before upload / insert.
 * Returns the first blocking issue, or null when the payload can proceed.
 */
export function validateReferralAsk(
  input: ReferralAskInput,
  opts: { signedIn: boolean },
): ReferralAskIssue | null {
  if (!opts.signedIn) return "sign_in";
  if (!input.name.trim()) return "name";
  if (!isUsableEmail(input.email)) return "email";
  if (!input.role.trim()) return "role";

  const linkedinRaw = input.linkedin.trim();
  const hasResume = !!input.resumeFile;
  if (!linkedinRaw && !hasResume) return "linkedin_or_resume";
  if (linkedinRaw && !safeHttpUrl(linkedinRaw)) return "linkedin_invalid";

  const yearsRaw = input.years.trim();
  if (yearsRaw && parseYearsExperience(yearsRaw) == null) return "years_invalid";

  if (input.resumeFile) {
    if (!isReferralResumeFile(input.resumeFile)) return "resume_type";
    if (input.resumeFile.size <= 0 || input.resumeFile.size > REFERRAL_RESUME_MAX_BYTES) {
      return "resume_size";
    }
  }
  return null;
}

export function packetFieldOrFallback(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || PACKET_NOT_PROVIDED;
}

export function packetYearsLabel(years: number | null | undefined): string {
  if (years == null || !Number.isFinite(years)) return PACKET_NOT_PROVIDED;
  const n = Math.round(years);
  return `${n} year${n === 1 ? "" : "s"}`;
}

/** Soft phone cleanup: keep digits and common phone punctuation, then clip. */
export function normalizeReferralPhone(value: string): string {
  const cleaned = value.replace(/[^\d+().\-\s]/g, "").trim();
  return cleaned.slice(0, REFERRER_LIMITS.phone);
}
