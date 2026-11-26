import { describe, expect, it } from "vitest";
import type { PublicJob } from "@/lib/publicJobs";
import {
  displayJobLocation,
  filterPublicJobs,
  formatPublicSalary,
  preparePublicJobs,
  EMPTY_BOARD_FILTERS,
} from "@/lib/publicJobDisplay";

function job(over: Partial<PublicJob> = {}): PublicJob {
  return {
    id: "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f",
    title: "Backend Engineer",
    company: "Stripe",
    companySlug: "stripe",
    companyDomain: "stripe.com",
    url: "https://stripe.com/jobs/1",
    location: "New York, NY",
    postedAt: "2026-11-20T00:00:00+00:00",
    description: "Build payment systems.",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    workModel: null,
    employmentType: null,
    industry: null,
    ...over,
  };
}

describe("preparePublicJobs", () => {
  it("drops a repeated company, title, and place", () => {
    const rows = preparePublicJobs([
      job({ id: "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f", title: "Propulsion Engineer", company: "SpaceX" }),
      job({ id: "8a47d1e9-c550-4a1b-2c3d-4e5f6a7b8c9d", title: "Propulsion Engineer", company: "SpaceX" }),
    ]);
    expect(rows).toHaveLength(1);
  });

  it("strips a copied title and repairs the recurring name typos", () => {
    const [row] = preparePublicJobs([
      job({
        title: "Copy of Head of North Amercia",
        company: "Schrdinger",
      }),
    ]);
    expect(row.title).toBe("Head of North America");
    expect(row.company).toBe("Schrödinger");
  });

  it("does not print raw coordinates as a city", () => {
    expect(displayJobLocation("39.154775745 | -75.516464902", null)).toBe("United States");
    expect(displayJobLocation("39.154775745 | -75.516464902", "remote")).toBe("Remote");
    const [row] = preparePublicJobs([
      job({ location: "39.15 | -75.51", workModel: null }),
    ]);
    expect(row.location).toBe("United States");
  });
});

describe("formatPublicSalary", () => {
  it("renders a yearly range and hides a missing one", () => {
    expect(formatPublicSalary(job({ salaryMin: 120000, salaryMax: 150000, salaryPeriod: "year" }))).toBe(
      "$120k–$150k/yr",
    );
    expect(formatPublicSalary(job())).toBeNull();
  });
});

describe("filterPublicJobs", () => {
  const rows = preparePublicJobs([
    job({ title: "Senior Backend Engineer", workModel: "remote", description: "We offer visa sponsorship." }),
    job({
      id: "11111111-2222-4333-8444-555555555555",
      title: "Product Designer",
      company: "Figma",
      location: "San Francisco, CA",
      workModel: "hybrid",
      description: "Design systems.",
    }),
  ]);

  it("keeps a remote engineering role that sponsors", () => {
    const matched = filterPublicJobs(rows, {
      ...EMPTY_BOARD_FILTERS,
      fn: "engineering",
      level: "senior",
      place: "remote",
      sponsor: "yes",
    });
    expect(matched.map((r) => r.title)).toEqual(["Senior Backend Engineer"]);
  });

  it("matches a search against company and title", () => {
    const matched = filterPublicJobs(rows, { ...EMPTY_BOARD_FILTERS, search: "figma" });
    expect(matched).toHaveLength(1);
    expect(matched[0].title).toBe("Product Designer");
  });
});
