import { describe, it, expect } from "vitest";
import { isUSLocation, isClearlyInternational, locationMatchesState } from "@/lib/jobsLocation";

// "Shown under the US-only feed scope" = NOT clearly international.
const shownUnderUS = (loc: string) => !isClearlyInternational(loc);

describe("isUSLocation", () => {
  it("matches US state abbreviations and names", () => {
    for (const loc of ["Austin, TX", "San Francisco, CA", "New York, NY", "California", "Atlanta, GA", "Washington, DC", "Costa Mesa, California, United States"]) {
      expect(isUSLocation(loc)).toBe(true);
    }
  });
  it("matches explicit US country tokens (all real prod forms)", () => {
    for (const loc of ["United States", "Remote - US", "US Remote", "Remote, USA", "US - Remote", "United States of America", "US-CA-Menlo Park", "US > Arizona > Phoenix", "Cambridge, MA USA", "United States | Remote"]) {
      expect(isUSLocation(loc)).toBe(true);
    }
  });
  it("matches major US metros that appear without a state", () => {
    for (const loc of ["San Francisco", "New York City", "Los Angeles", "Chicago", "Boston", "Seattle", "Austin", "San Jose", "Palo Alto", "Brooklyn, NY", "San Francisco Bay Area"]) {
      expect(isUSLocation(loc)).toBe(true);
    }
  });
  it("does not positively flag foreign or ambiguous strings", () => {
    for (const loc of ["Manila, Philippines", "Remote", "", "Toronto, Canada", "London"]) {
      expect(isUSLocation(loc)).toBe(false);
    }
  });
});

describe("isClearlyInternational — hides real foreign prod locations", () => {
  const FOREIGN = [
    "London", "London, United Kingdom", "London, UK", "London, England, United Kingdom",
    "Paris", "Paris, France", "Berlin", "Berlin, Germany", "Munich", "Amsterdam",
    "Dublin, Ireland", "Madrid", "Barcelona", "Lisbon", "Toronto", "Toronto, Canada",
    "Toronto, Ontario", "Vancouver, BC", "Montreal", "São Paulo", "Sao Paulo, Brazil",
    "Brasil", "Rio De Janeiro, Rio De Janeiro, Brasil", "Mexico City", "Buenos Aires",
    "Bengaluru", "Bengaluru, India", "Bangalore", "Hyderabad", "Mumbai, India",
    "Pune, India", "Gurugram", "Noida, Uttar Pradesh", "Manila", "Manila, Philippines",
    "Seoul", "Seoul, South Korea", "Pangyo (Software Dream Center), South Korea",
    "Tokyo", "Tokyo, Japan", "Shanghai, China", "Taipei, Taiwan", "Singapore",
    "Hong Kong", "Kuala Lumpur, Malaysia", "Bangkok, Thailand", "Ho Chi Minh City, Vietnam",
    "Sydney", "Sydney, Australia", "Melbourne", "Auckland", "Kyiv", "Warsaw", "Prague",
    "Budapest, Hungary", "Vilnius", "Zurich", "Stockholm", "Milan", "Tel Aviv, Israel",
    "Cape Town", "Hamburg", "Brazil", "Canada", "India", "Germany", "Mexico",
    "United Kingdom", "Australia", "Argentina", "Colombia", "Malaysia", "Philippines",
    "South Korea", "France", "Spain", "Portugal", "Italy", "Netherlands", "Poland",
    "Ukraine", "Europe", "LATAM", "Latin America", "Remoto", "India (Remote)",
    "Remote - India", "Remote - Canada", "Deutschland, remote",
  ];
  it.each(FOREIGN)("hides %s", (loc) => {
    expect(isClearlyInternational(loc)).toBe(true);
  });
});

describe("isClearlyInternational — keeps real US/ambiguous prod locations", () => {
  const KEPT = [
    "San Francisco", "San Francisco, CA", "San Francisco, California, United States",
    "New York", "New York, NY", "New York City", "New York, New York, United States",
    "Los Angeles", "Los Angeles, California, United States", "Chicago", "Chicago, IL",
    "Boston", "Boston, MA", "Seattle", "Seattle, WA", "Austin", "Austin, TX",
    "Dallas, TX", "Denver, CO", "Atlanta, GA", "Washington, DC", "Washington DC",
    "Arlington, VA", "Houston, TX", "Miami, FL", "Phoenix, AZ", "Salt Lake City, UT",
    "United States", "Remote - United States", "Remote - US", "US Remote", "Remote, US",
    "USA - Remote", "United States (Remote)", "US-CA-Menlo Park", "US > Arizona > Phoenix",
    "Costa Mesa, California, United States", "Cambridge, MA USA", "South San Francisco, California, USA",
    // collision guards: a US signal must win over an embedded foreign token
    "Indianapolis, IN", "Indianapolis, Indiana, United States", "Vancouver, WA",
    "Cambridge, MA", "Columbia, MO (Headquarters)",
    // genuinely ambiguous — keep (might be US)
    "Remote", "Hybrid", "Statistician Network", "North America", "Federal Services Division",
  ];
  it.each(KEPT)("keeps %s", (loc) => {
    expect(isClearlyInternational(loc)).toBe(false);
  });
});

describe("locationMatchesState", () => {
  it("matches by name and boundary-delimited abbr, not loose substring", () => {
    expect(locationMatchesState("Austin, TX", "TX")).toBe(true);
    expect(locationMatchesState("Portland, OR", "OR")).toBe(true);
    expect(locationMatchesState("Remote in the region", "OR")).toBe(false);
    expect(locationMatchesState("New York, NY", "CA")).toBe(false);
  });
});

// Sanity: a representative high-volume prod slice — the US-only scope should keep
// US + ambiguous and drop the clearly-foreign ones.
describe("US-only scope on a real prod slice", () => {
  it("keeps US, drops foreign", () => {
    expect(shownUnderUS("San Francisco")).toBe(true);
    expect(shownUnderUS("London")).toBe(false);
    expect(shownUnderUS("Remote")).toBe(true);
    expect(shownUnderUS("Bengaluru")).toBe(false);
    expect(shownUnderUS("New York, NY")).toBe(true);
    expect(shownUnderUS("Seoul, South Korea")).toBe(false);
  });
});
