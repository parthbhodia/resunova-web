import { describe, expect, it } from "vitest";
import {
  aggregateOpenCompanies,
  filterOpenCompanies,
  approxYearsFromExperience,
  isUsableEmail,
  joinReferrerSentences,
  makeReferrerSlug,
  mapReferrerRow,
  mapRequestRow,
  nudgeAvailability,
  nudgeButtonLabel,
  openRequestCount,
  parseYearsExperience,
  referralCandidatePath,
  referralRequestPipeline,
  referralRequestsThisMonth,
  referralWriteError,
  referrerInitials,
  referrerPublicPath,
  safeHttpUrl,
  sanitizeSearchTerm,
  slugifyPart,
} from "@/lib/companyReferrers";

describe("companyReferrers helpers", () => {
  it("builds a stable public slug from name, company, and user id", () => {
    expect(slugifyPart("Acme Robotics")).toBe("acme-robotics");
    expect(makeReferrerSlug("Parth Bhodia", "Acme", "abcdef12-3456-7890-abcd-ef1234567890")).toBe(
      "parth-bhodia-at-acme-abcdef",
    );
  });

  it("keeps the public path on a query param for static export", () => {
    expect(referrerPublicPath("parth-at-acme")).toBe("/refer/?s=parth-at-acme");
  });

  it("maps DB rows and falls unknown statuses back to requested", () => {
    const referrer = mapReferrerRow({
      id: "r1",
      user_id: "u1",
      display_name: "Parth Bhodia",
      company: "Acme",
      company_slug: "acme",
      title: "Software Engineer",
      linkedin: null,
      slug: "parth-bhodia-at-acme-abcdef",
      bio: "Backend, intern",
      open_to_refer: true,
      referred_count: 4,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(referrer).toMatchObject({
      displayName: "Parth Bhodia",
      company: "Acme",
      openToRefer: true,
      referredCount: 4,
    });
    expect(mapRequestRow({
      id: "q1",
      referrer_id: "r1",
      candidate_name: "Alex Kim",
      candidate_email: "alex@example.com",
      candidate_linkedin: null,
      candidate_phone: "555-0100",
      candidate_years_experience: 4,
      candidate_headline: "Backend",
      role: "Backend Engineer",
      notes: null,
      source: "request",
      status: "mystery",
      created_at: "2026-01-03T00:00:00Z",
    })).toMatchObject({
      status: "requested",
      candidatePhone: "555-0100",
      candidateYearsExperience: 4,
      candidateHeadline: "Backend",
    });
    expect(parseYearsExperience("5 years")).toBe(5);
    expect(parseYearsExperience("99")).toBeNull();
    expect(approxYearsFromExperience([
      { dates: "2019 – 2021" },
      { dates: "2021 – Present" },
    ])).toBe(new Date().getFullYear() - 2019);
    expect(referralCandidatePath("abc")).toBe("/refer/candidate/?r=abc");
  });

  it("counts the inbox pipeline and this-month slice", () => {
    const emptyPacket = {
      candidateUserId: null as string | null,
      candidatePhone: null as string | null,
      candidateYearsExperience: null as number | null,
      candidateHeadline: null as string | null,
      resumePdfPath: null as string | null,
    };
    const rows = [
      { id: "1", referrerId: "r", candidateName: "A", candidateEmail: "", candidateLinkedin: null, ...emptyPacket, role: "SWE", notes: null, source: "request" as const, status: "requested" as const, createdAt: "2026-10-02T00:00:00Z" },
      { id: "2", referrerId: "r", candidateName: "B", candidateEmail: "", candidateLinkedin: null, ...emptyPacket, role: "SWE", notes: null, source: "request" as const, status: "reviewing" as const, createdAt: "2026-10-04T00:00:00Z" },
      { id: "3", referrerId: "r", candidateName: "C", candidateEmail: "", candidateLinkedin: null, ...emptyPacket, role: "SWE", notes: null, source: "submitted" as const, status: "referred" as const, createdAt: "2026-09-01T00:00:00Z" },
    ];
    expect(referralRequestPipeline(rows)).toEqual({
      requested: 1,
      reviewing: 1,
      referred: 1,
      declined: 0,
    });
    expect(openRequestCount(rows)).toBe(2);
    expect(referralRequestsThisMonth(rows, new Date("2026-10-12T12:00:00Z")).map((row) => row.id)).toEqual(["1", "2"]);
  });

  it("waits 3 days, then 7 days, and stops after 2 nudges", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const recent = { status: "requested" as const, createdAt: "2026-10-11T12:00:00Z", nudgeCount: 0, lastNudgedAt: null };
    const ready = { status: "requested" as const, createdAt: "2026-10-01T12:00:00Z", nudgeCount: 0, lastNudgedAt: null };
    const cooling = { ...ready, nudgeCount: 1, lastNudgedAt: "2026-10-10T12:00:00Z" };
    const capped = { ...ready, nudgeCount: 2, lastNudgedAt: "2026-09-01T12:00:00Z" };
    expect(nudgeAvailability(recent, now)).toBe("too_soon");
    expect(nudgeButtonLabel(recent, now)).toBe("Nudge in 2 days");
    expect(nudgeAvailability(ready, now)).toBe("ready");
    expect(nudgeButtonLabel(ready, now)).toBe("Nudge");
    expect(nudgeAvailability(cooling, now)).toBe("cooling_down");
    expect(nudgeButtonLabel(cooling, now)).toBe("Nudged");
    expect(nudgeAvailability(capped, now)).toBe("limit");
    expect(nudgeAvailability({ ...ready, status: "referred" }, now)).toBe("closed");
    expect(nudgeButtonLabel({ ...ready, status: "declined" }, now)).toBeNull();
  });

  it("validates emails and initials", () => {
    expect(isUsableEmail("alex@example.com")).toBe(true);
    expect(isUsableEmail("not-an-email")).toBe(false);
    expect(referrerInitials("Parth Bhodia")).toBe("PB");
    expect(referrerInitials("")).toBe("?");
  });

  it("strips LIKE wildcards, keeps http(s) URLs, and maps write errors", () => {
    expect(sanitizeSearchTerm("%Acme_")).toBe("Acme");
    expect(sanitizeSearchTerm("%")).toBe("");
    expect(safeHttpUrl("linkedin.com/in/parth")).toBe("https://linkedin.com/in/parth");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://linkedin.com/in/parth")).toBe("https://linkedin.com/in/parth");
    expect(referralWriteError({ code: "23505" })).toMatch(/already have an open request/i);
    expect(referralWriteError({ message: "referrer inbox is full" })).toMatch(/not accepting more requests/i);
    expect(referralWriteError({ message: "violates row-level security policy" })).toMatch(/not active/i);
  });

  it("maps public rows that omit user_id", () => {
    expect(mapReferrerRow({
      id: "r1",
      display_name: "Parth",
      company: "Acme",
      company_slug: "acme",
      title: "SWE",
      linkedin: null,
      slug: "parth-at-acme",
      bio: null,
      open_to_refer: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }).userId).toBe("");
  });

  it("aggregates open referrers into company tiles with domains", () => {
    const companies = aggregateOpenCompanies(
      [
        { company: "Stripe", companySlug: "stripe", referredCount: 2 },
        { company: "Stripe Inc", companySlug: "stripe", referredCount: 3 },
        { company: "Acme", companySlug: "acme", referredCount: 0 },
      ],
      { stripe: "stripe.com" },
    );
    expect(companies).toEqual([
      { company: "Stripe Inc", companySlug: "stripe", companyDomain: "stripe.com", openCount: 2, referredCount: 5 },
      { company: "Acme", companySlug: "acme", companyDomain: "", openCount: 1, referredCount: 0 },
    ]);
    expect(filterOpenCompanies(companies, "str")).toHaveLength(1);
    expect(filterOpenCompanies(companies, "zzz")).toHaveLength(0);
  });
});

/**
 * `company_referrers.title` is `text not null default ''` (migration 044), so a
 * row seeded outside the signup path carries an empty title. Every template
 * that interpolated it rendered an orphan leading period, or a dangling
 * " at Acme" with nothing in front of the "at".
 *
 * ⚠️ MAIN'S REWRITE REPRODUCED THIS, which is why the rule is one helper and
 * not a patch per call site: the defect survived a full rewrite of the feature
 * onto MUI because each template re-derived the join itself.
 */
describe("joinReferrerSentences", () => {
  it("drops an empty title rather than leading with its period", () => {
    expect(joinReferrerSentences("", "Backend, intern")).toBe("Backend, intern");
  });

  it("joins a real title and bio into two sentences", () => {
    expect(joinReferrerSentences("Software Engineer", "Backend, intern")).toBe(
      "Software Engineer. Backend, intern",
    );
  });

  it("keeps the title alone when there is no bio", () => {
    expect(joinReferrerSentences("Software Engineer", null)).toBe("Software Engineer");
  });

  it("returns nothing at all when the row carries neither", () => {
    expect(joinReferrerSentences("", undefined)).toBe("");
  });

  it("ignores whitespace-only values, which a text-not-null column allows", () => {
    expect(joinReferrerSentences("   ", "Backend")).toBe("Backend");
  });
});
