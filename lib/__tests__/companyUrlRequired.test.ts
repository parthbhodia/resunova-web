import { describe, expect, it } from "vitest";
import { isUsableCompanyUrl, normalizeCompanyUrl } from "@/lib/companyReferrers";

/**
 * The company URL on a referrer desk.
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

describe("normalizeCompanyUrl", () => {
  it("adds the scheme people leave off", () => {
    expect(normalizeCompanyUrl("stripe.com")).toBe("https://stripe.com");
  });

  it("drops a trailing slash so two spellings store identically", () => {
    expect(normalizeCompanyUrl("https://linkedin.com/company/stripe/"))
      .toBe(normalizeCompanyUrl("https://linkedin.com/company/stripe"));
  });

  it("keeps a path and query, which can carry the real company page", () => {
    expect(normalizeCompanyUrl("https://jobs.example.com/about?team=eng"))
      .toBe("https://jobs.example.com/about?team=eng");
  });

  it("returns empty for junk rather than a half-formed href", () => {
    expect(normalizeCompanyUrl("")).toBe("");
    expect(normalizeCompanyUrl("   ")).toBe("");
  });

  it("⚠️ normalizing does not launder a personal profile into a valid one", () => {
    const normalized = normalizeCompanyUrl("linkedin.com/in/parthbhodia");
    expect(isUsableCompanyUrl(normalized)).toBe(false);
  });
});
