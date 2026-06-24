import { describe, it, expect } from "vitest";
import { isUSLocation, isClearlyInternational, locationMatchesState } from "@/lib/jobsLocation";

describe("isUSLocation", () => {
  it("matches US state abbreviations and names", () => {
    expect(isUSLocation("Austin, TX")).toBe(true);
    expect(isUSLocation("San Francisco, CA")).toBe(true);
    expect(isUSLocation("New York, NY")).toBe(true);
    expect(isUSLocation("California")).toBe(true);
    expect(isUSLocation("Atlanta, GA")).toBe(true); // Georgia the US state
  });

  it("matches explicit US country tokens", () => {
    expect(isUSLocation("United States")).toBe(true);
    expect(isUSLocation("Remote (US)")).toBe(true);
    expect(isUSLocation("Remote - United States")).toBe(true);
    expect(isUSLocation("Chicago, IL, USA")).toBe(true);
  });

  it("does not positively flag foreign or ambiguous strings", () => {
    expect(isUSLocation("Manila, Philippines")).toBe(false);
    expect(isUSLocation("Remote")).toBe(false);
    expect(isUSLocation("")).toBe(false);
    expect(isUSLocation("Toronto, Canada")).toBe(false);
  });

  it("does not false-match the 'US' token inside ordinary words", () => {
    // "Houston" / "campus" contain 'us' but not as a boundary token
    expect(isUSLocation("Houston")).toBe(false); // (would still be US via ', TX' if present)
    expect(isUSLocation("Aarhus, Denmark")).toBe(false);
  });
});

describe("isClearlyInternational", () => {
  it("flags postings that name a foreign country", () => {
    expect(isClearlyInternational("Manila, Philippines")).toBe(true);
    expect(isClearlyInternational("Seoul, South Korea")).toBe(true);
    expect(isClearlyInternational("Beijing, China")).toBe(true);
    expect(isClearlyInternational("Bengaluru, India")).toBe(true);
    expect(isClearlyInternational("Toronto, Canada")).toBe(true);
    expect(isClearlyInternational("London, United Kingdom")).toBe(true);
    expect(isClearlyInternational("London, UK")).toBe(true);
  });

  it("flags well-known foreign cities even without the country", () => {
    expect(isClearlyInternational("Hyderabad")).toBe(true);
    expect(isClearlyInternational("Manila")).toBe(true);
    expect(isClearlyInternational("Seoul")).toBe(true);
  });

  it("never flags US postings (positive US signal wins)", () => {
    expect(isClearlyInternational("Austin, TX")).toBe(false);
    expect(isClearlyInternational("San Francisco, CA")).toBe(false);
    expect(isClearlyInternational("Atlanta, GA")).toBe(false); // Georgia state, not country
    expect(isClearlyInternational("Remote (US)")).toBe(false);
  });

  it("does not false-match a country name embedded in a US place name", () => {
    expect(isClearlyInternational("Indianapolis, IN")).toBe(false); // 'india' inside 'Indianapolis'
    expect(isClearlyInternational("Indiana")).toBe(false);
    expect(isClearlyInternational("Milwaukee, WI")).toBe(false); // 'uk' inside 'Milwaukee'
    expect(isClearlyInternational("Turkey, TX")).toBe(false); // 'turkey' but US via ', TX'
  });

  it("leaves ambiguous strings visible (not flagged)", () => {
    expect(isClearlyInternational("Remote")).toBe(false);
    expect(isClearlyInternational("")).toBe(false);
    expect(isClearlyInternational("Springfield")).toBe(false); // bare ambiguous US-ish city
  });
});

describe("locationMatchesState", () => {
  it("matches by name and boundary-delimited abbr, not loose substring", () => {
    expect(locationMatchesState("Austin, TX", "TX")).toBe(true);
    expect(locationMatchesState("Portland, OR", "OR")).toBe(true);
    expect(locationMatchesState("Remote in the region", "OR")).toBe(false); // 'or' in prose
    expect(locationMatchesState("New York, NY", "CA")).toBe(false);
  });
});
