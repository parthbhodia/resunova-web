import { describe, expect, it } from "vitest";
import {
  PACKET_NOT_PROVIDED,
  REFERRAL_ASK_MESSAGES,
  REFERRAL_EDGE_CASES,
  normalizeReferralPhone,
  packetFieldOrFallback,
  packetYearsLabel,
  validateReferralAsk,
  type ReferralAskInput,
} from "@/lib/referralEdgeCases";
import { REFERRAL_RESUME_MAX_BYTES } from "@/lib/companyReferrers";

function ask(partial: Partial<ReferralAskInput> = {}): ReferralAskInput {
  return {
    name: "Alex Kim",
    email: "alex@example.com",
    role: "Backend Engineer",
    linkedin: "https://linkedin.com/in/alex",
    years: "4",
    phone: "+1 555 0100",
    headline: "Backend",
    resumeFile: null,
    ...partial,
  };
}

function pdf(size = 1024, name = "resume.pdf", type = "application/pdf"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("referral edge-case catalog", () => {
  it("lists every product edge case we support", () => {
    expect(REFERRAL_EDGE_CASES).toEqual([
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
    ]);
  });
});

describe("validateReferralAsk", () => {
  it("requires sign-in", () => {
    expect(validateReferralAsk(ask(), { signedIn: false })).toBe("sign_in");
    expect(REFERRAL_ASK_MESSAGES.sign_in).toMatch(/sign in/i);
  });

  it("requires name, email, and role", () => {
    expect(validateReferralAsk(ask({ name: "  " }), { signedIn: true })).toBe("name");
    expect(validateReferralAsk(ask({ email: "not-an-email" }), { signedIn: true })).toBe("email");
    expect(validateReferralAsk(ask({ email: "" }), { signedIn: true })).toBe("email");
    expect(validateReferralAsk(ask({ role: "" }), { signedIn: true })).toBe("role");
  });

  it("requires LinkedIn or a resume PDF", () => {
    expect(validateReferralAsk(ask({ linkedin: "", resumeFile: null }), { signedIn: true })).toBe(
      "linkedin_or_resume",
    );
  });

  it("rejects an invalid LinkedIn URL when the field is filled", () => {
    expect(validateReferralAsk(ask({ linkedin: "javascript:alert(1)" }), { signedIn: true })).toBe(
      "linkedin_invalid",
    );
    expect(validateReferralAsk(ask({ linkedin: "not a url", resumeFile: pdf() }), { signedIn: true })).toBe(
      "linkedin_invalid",
    );
  });

  it("allows LinkedIn only or PDF only", () => {
    expect(validateReferralAsk(ask({ linkedin: "linkedin.com/in/alex", resumeFile: null }), { signedIn: true })).toBeNull();
    expect(validateReferralAsk(ask({ linkedin: "", resumeFile: pdf() }), { signedIn: true })).toBeNull();
  });

  it("rejects invalid years when provided, but allows blank years", () => {
    expect(validateReferralAsk(ask({ years: "" }), { signedIn: true })).toBeNull();
    expect(validateReferralAsk(ask({ years: "4" }), { signedIn: true })).toBeNull();
    expect(validateReferralAsk(ask({ years: "99" }), { signedIn: true })).toBe("years_invalid");
    expect(validateReferralAsk(ask({ years: "abc" }), { signedIn: true })).toBe("years_invalid");
  });

  it("rejects non-PDF and oversized resumes", () => {
    expect(validateReferralAsk(ask({ linkedin: "", resumeFile: pdf(10, "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") }), { signedIn: true })).toBe("resume_type");
    expect(validateReferralAsk(ask({ linkedin: "", resumeFile: pdf(0) }), { signedIn: true })).toBe("resume_size");
    expect(
      validateReferralAsk(
        ask({ linkedin: "", resumeFile: pdf(REFERRAL_RESUME_MAX_BYTES + 1) }),
        { signedIn: true },
      ),
    ).toBe("resume_size");
  });

  it("allows omitted optional phone and headline", () => {
    expect(validateReferralAsk(ask({ phone: "", headline: "" }), { signedIn: true })).toBeNull();
  });
});

describe("packet display helpers", () => {
  it("shows Not provided for legacy / omitted packet fields", () => {
    expect(packetFieldOrFallback(null)).toBe(PACKET_NOT_PROVIDED);
    expect(packetFieldOrFallback("")).toBe(PACKET_NOT_PROVIDED);
    expect(packetFieldOrFallback("  Backend  ")).toBe("Backend");
    expect(packetYearsLabel(null)).toBe(PACKET_NOT_PROVIDED);
    expect(packetYearsLabel(1)).toBe("1 year");
    expect(packetYearsLabel(4)).toBe("4 years");
  });

  it("normalizes phone input", () => {
    expect(normalizeReferralPhone("555.0100 ext!!")).toBe("555.0100");
    expect(normalizeReferralPhone("+1 (555) 010-0200")).toBe("+1 (555) 010-0200");
  });
});
