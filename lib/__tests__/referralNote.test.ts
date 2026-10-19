import { describe, expect, it } from "vitest";
import {
  REFERRAL_NOTE_COPY_FAILED,
  REFERRAL_RESUME_HINT,
  buildReferralNote,
  hasReferralNoteBody,
  referralNoteSubject,
} from "@/lib/referralNote";
import type { CompanyReferralRequest } from "@/lib/companyReferrers";

const referrer = { displayName: "Jordan Lee", title: "Software Engineer", company: "Stripe" };

function request(partial: Partial<CompanyReferralRequest> = {}): CompanyReferralRequest {
  return {
    id: "q1",
    referrerId: "r1",
    candidateUserId: "u2",
    candidateName: "Alex Kim",
    candidateEmail: "alex@example.com",
    candidateLinkedin: "https://linkedin.com/in/alexkim",
    resumePdfPath: null,
    candidatePhone: null,
    candidateYearsExperience: 5,
    candidateHeadline: "Backend engineer, payments",
    candidateOutcome: null,
    candidateOutcomeAt: null,
    role: "Backend Engineer",
    notes: "I have been at Stripe four years and would vouch for Alex directly.",
    source: "request",
    status: "requested",
    createdAt: "2026-10-01T00:00:00Z",
    ...partial,
  };
}

describe("buildReferralNote", () => {
  it("assembles the facts the candidate supplied, with no invented claims", () => {
    const note = buildReferralNote(request(), referrer);
    expect(note).toContain("Alex Kim");
    expect(note).toContain("Backend Engineer");
    expect(note).toContain("Stripe");
    expect(note).toContain("alex@example.com");
    expect(note).toContain("https://linkedin.com/in/alexkim");
    expect(note).toContain("Backend engineer, payments");
    expect(note).toContain("5 years");
    expect(note).toContain("Jordan Lee");
    // The endorsement is a prompt. Only the referrer knows why they are vouching.
    expect(note).toMatch(/your own words/i);
    expect(note).not.toMatch(/I have worked with/i);
  });

  it("quotes the candidate's own note rather than paraphrasing it", () => {
    const note = buildReferralNote(request({ notes: "  I care about payments infra.  " }), referrer);
    expect(note).toContain("In their own words:");
    expect(note).toContain("I care about payments infra.");
  });

  it("omits blank optional fields instead of printing 'Not provided'", () => {
    const note = buildReferralNote(request({
      candidatePhone: null,
      candidateHeadline: null,
      candidateYearsExperience: null,
      notes: null,
    }), referrer);
    expect(note).not.toMatch(/Not provided/i);
    expect(note).not.toMatch(/Phone:/);
    expect(note).not.toMatch(/years/i);
    expect(note).not.toMatch(/In their own words/);
    expect(note).toContain("alex@example.com");
  });

  it("points at the résumé only when one is actually on file", () => {
    expect(buildReferralNote(request({ resumePdfPath: "u2/abc.pdf" }), referrer)).toContain(REFERRAL_RESUME_HINT);
    expect(buildReferralNote(request({ resumePdfPath: null }), referrer)).not.toContain(REFERRAL_RESUME_HINT);
  });

  it("drops a LinkedIn URL that is not http(s) instead of printing it", () => {
    const note = buildReferralNote(request({ candidateLinkedin: "javascript:alert(1)" }), referrer);
    expect(note).not.toContain("javascript:");
    expect(note).not.toMatch(/LinkedIn:/);
  });

  it("reads cleanly when name and role are missing", () => {
    const note = buildReferralNote(request({ candidateName: "", role: "" }), referrer);
    expect(note).not.toContain("undefined");
    expect(note).not.toContain("null");
    // Blank lines between blocks are intentional; repeated spaces are not.
    expect(note.split("\n").every((l) => !/ {2}/.test(l))).toBe(true);
    expect(note).toMatch(/the role you are hiring for/i);
    // The greeting must not dangle around the empty name.
    expect(note).toMatch(/^Hi, I am referring This candidate for/);
  });

  it("signs with the referrer's own name, title and company", () => {
    const note = buildReferralNote(request(), referrer);
    expect(note).toContain("Jordan Lee");
    expect(note).toContain("Software Engineer at Stripe");
    const signature = note.split("Jordan Lee").pop();
    expect(signature).toContain("Software Engineer at Stripe");
  });

  it("collapses whitespace so a pasted note is not ragged", () => {
    const note = buildReferralNote(request({ candidateName: "Alex   Kim" }), referrer);
    expect(note).toContain("Alex Kim");
    expect(note).not.toMatch(/Alex\s{2,}Kim/);
  });

  it("has no spaced em dash anywhere, per the UI copy rule", () => {
    const note = buildReferralNote(request(), referrer);
    expect(note).not.toMatch(/[^\s][ ][—–][ ][^\s]/);
  });
});

describe("referralNoteSubject", () => {
  it("names the role and the company", () => {
    expect(referralNoteSubject(request(), referrer)).toBe("Referral for Backend Engineer at Stripe");
  });

  it("still reads as a subject when the role is missing", () => {
    expect(referralNoteSubject({ role: "" }, referrer)).toBe("Referral for an open role at Stripe");
    expect(referralNoteSubject(request(), { ...referrer, company: "" }))
      .toBe("Referral for Backend Engineer");
  });
});

describe("hasReferralNoteBody", () => {
  it("needs a name, a role, and at least one way to reach the candidate", () => {
    expect(hasReferralNoteBody(request())).toBe(true);
    expect(hasReferralNoteBody(request({ candidateName: "" }))).toBe(false);
    expect(hasReferralNoteBody(request({ role: "" }))).toBe(false);
    // Email is not in the packet's contact list but the note includes it, so it counts.
    expect(hasReferralNoteBody(request({ candidateLinkedin: null, resumePdfPath: null }))).toBe(true);
    expect(hasReferralNoteBody(request({
      candidateLinkedin: null,
      resumePdfPath: null,
      candidateEmail: "",
    }))).toBe(false);
  });
});

describe("copy fallback copy", () => {
  it("tells the referrer what to do when the clipboard is refused", () => {
    expect(REFERRAL_NOTE_COPY_FAILED).toMatch(/copy it manually/i);
  });
});