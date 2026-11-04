import { beforeEach, describe, expect, it, vi } from "vitest";

// A signed-out client, not a throwing one: the save path swallows I/O errors
// into null either way, so what separates "refused by the guard" from "got as
// far as asking for a session" is only whether this was ever called.
const getSupabaseClient = vi.hoisted(() => vi.fn(() => ({
  auth: { getSession: async () => ({ data: { session: null } }) },
})));
vi.mock("@/lib/supabase", () => ({ getSupabaseClient }));

import { isUsableCompanyUrl, upsertMyReferrerProfile } from "@/lib/companyReferrers";

/**
 * The company website on a referrer desk.
 *
 * Main's `company_website` field replaced this branch's own `company_url`, and
 * this file keeps the guard that field was missing: `safeHttpUrl` only asks
 * whether a value parses as http(s).
 *
 * ⚠️ WHY THIS IS NOT A PLAIN URL CHECK. `company` is free text — anyone can
 * publish a desk claiming any employer. This field is the one thing a candidate
 * can click to check that claim before sending a stranger their résumé and
 * phone number. The field DIRECTLY ABOVE it in the form is the referrer's own
 * `linkedin.com/in/…` profile, so pasting that here is the mistake everyone
 * will make — and it would satisfy any generic validator while verifying
 * nothing about the company.
 */
describe("isUsableCompanyUrl", () => {
  it("accepts a LinkedIn company page", () => {
    expect(isUsableCompanyUrl("https://www.linkedin.com/company/stripe")).toBe(true);
    expect(isUsableCompanyUrl("https://linkedin.com/company/stripe/")).toBe(true);
    expect(isUsableCompanyUrl("https://uk.linkedin.com/company/monzo")).toBe(true);
  });

  it("accepts a LinkedIn school page, because universities refer too", () => {
    expect(isUsableCompanyUrl("https://www.linkedin.com/school/umbc/")).toBe(true);
  });

  it("accepts a plain company website, with or without a scheme", () => {
    expect(isUsableCompanyUrl("https://stripe.com")).toBe(true);
    expect(isUsableCompanyUrl("stripe.com")).toBe(true);
    expect(isUsableCompanyUrl("https://careers.eccalon.com/about")).toBe(true);
  });

  it("⚠️ REJECTS a personal LinkedIn — the mistake the form's own layout invites", () => {
    expect(isUsableCompanyUrl("https://www.linkedin.com/in/parthbhodia")).toBe(false);
    expect(isUsableCompanyUrl("linkedin.com/in/jordan-lee")).toBe(false);
    expect(isUsableCompanyUrl("https://linkedin.com/pub/someone/1/2/3")).toBe(false);
  });

  it("rejects a bare host that names nothing checkable", () => {
    expect(isUsableCompanyUrl("localhost")).toBe(false);
    expect(isUsableCompanyUrl("http://intranet")).toBe(false);
    expect(isUsableCompanyUrl("stripe.")).toBe(false);
  });

  it("rejects empty, whitespace and non-http schemes", () => {
    expect(isUsableCompanyUrl("")).toBe(false);
    expect(isUsableCompanyUrl("   ")).toBe(false);
    // ⚠️ javascript: must never survive — this value is rendered as an href.
    expect(isUsableCompanyUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableCompanyUrl("mailto:hr@stripe.com")).toBe(false);
  });

  it("⚠️ rejects userinfo, which disguises the real host", () => {
    // This is the bug the mailto: case exposed. Prepending https:// to a value
    // carrying a scheme produced "https://mailto:hr@stripe.com" — userinfo
    // "mailto:hr", host "stripe.com" — so it passed. Same shape as the classic
    // phishing link below, and this value is shown to candidates AS proof the
    // company is real.
    expect(isUsableCompanyUrl("https://evil.example.com@stripe.com")).toBe(false);
    expect(isUsableCompanyUrl("https://user:pass@stripe.com")).toBe(false);
  });
});

describe("saving a desk applies that guard", () => {
  beforeEach(() => getSupabaseClient.mockClear());

  const desk = {
    displayName: "Jordan Lee",
    company: "Stripe",
    title: "Software Engineer",
    companyLocation: "San Francisco, CA",
  };

  // ⚠️ A rejected save and a failed save both return null, so the return value
  // cannot tell the guard from a missing session. Whether the save got as far
  // as asking for a client can: the guard runs before any I/O.
  it.each([
    ["a personal LinkedIn profile", "https://www.linkedin.com/in/jordan-lee"],
    ["a mailto: that parses as userinfo once the scheme is prepended", "mailto:hr@stripe.com"],
    ["userinfo disguising the host", "https://evil.example.com@stripe.com"],
    ["a bare host", "localhost"],
  ])("refuses %s before touching the database", async (_label, companyWebsite) => {
    expect(await upsertMyReferrerProfile({ ...desk, companyWebsite })).toBeNull();
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });

  it("lets a real company site through to the database", async () => {
    await upsertMyReferrerProfile({ ...desk, companyWebsite: "stripe.com" });
    expect(getSupabaseClient).toHaveBeenCalled();
  });
});
