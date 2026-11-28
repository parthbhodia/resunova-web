import { describe, expect, it } from "vitest";
import { employmentTypeLabel, formatSalaryFull } from "@/lib/jobFacts";

describe("employmentTypeLabel", () => {
  it("reads the spellings the sources use as one label", () => {
    for (const raw of ["full_time", "FULL_TIME", "Full time", "full-time"]) {
      expect(employmentTypeLabel(raw)).toBe("Full-time");
    }
    expect(employmentTypeLabel("part_time")).toBe("Part-time");
    expect(employmentTypeLabel("INTERN")).toBe("Internship");
  });

  it("shows an unknown value as written rather than guessing", () => {
    expect(employmentTypeLabel("seasonal_rotation")).toBe("seasonal rotation");
  });

  it("returns nothing for nothing, so no row claims a type the posting never stated", () => {
    expect(employmentTypeLabel(null)).toBeNull();
    expect(employmentTypeLabel("  ")).toBeNull();
  });
});

describe("formatSalaryFull", () => {
  it("formats a range and its period, in either case", () => {
    const pay = { salaryMin: 120000, salaryMax: 150000, salaryCurrency: "USD", salaryPeriod: "YEAR" };
    expect(formatSalaryFull(pay)).toBe("$120,000 - $150,000 a year");
    expect(formatSalaryFull({ ...pay, salaryMin: 42.5, salaryMax: 42.5, salaryPeriod: "hour" })).toBe("$42.5 an hour");
  });

  it("has nothing to say without a figure", () => {
    expect(formatSalaryFull({ salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null })).toBeNull();
  });
});
