import { describe, expect, it } from "vitest";
import { OnceGuard, formatWage, postedAgoLabel, sponsorBadgeLabel } from "@/lib/sponsorJobs";

describe("sponsorBadgeLabel", () => {
  it("states employer-level filings honestly", () => {
    expect(sponsorBadgeLabel(47, 128000)).toBe("Filed 47 H-1B LCAs · median $128k");
  });
  it("singularizes one filing", () => {
    expect(sponsorBadgeLabel(1, null)).toBe("Filed 1 H-1B LCA");
  });
  it("falls back when the count is missing", () => {
    expect(sponsorBadgeLabel(null, 90000)).toBe("H-1B sponsor history · median $90k");
    expect(sponsorBadgeLabel(0, null)).toBe("H-1B sponsor history");
  });
  it('never claims "will sponsor" phrasing', () => {
    expect(sponsorBadgeLabel(47, 128000).toLowerCase()).not.toContain("will sponsor");
  });
});

describe("formatWage", () => {
  it("compacts thousands", () => {
    expect(formatWage(128000)).toBe("$128k");
    expect(formatWage(87500)).toBe("$88k");
  });
  it("keeps sub-1k literal and drops invalid", () => {
    expect(formatWage(950)).toBe("$950");
    expect(formatWage(null)).toBe("");
    expect(formatWage(0)).toBe("");
    expect(formatWage(Number.NaN)).toBe("");
  });
});

describe("postedAgoLabel", () => {
  it("labels recent and old postings", () => {
    const day = 86_400_000;
    expect(postedAgoLabel(new Date(Date.now() - 3 * day).toISOString())).toBe("3 days ago");
    expect(postedAgoLabel(new Date(Date.now() - 1 * day).toISOString())).toBe("yesterday");
    expect(postedAgoLabel(new Date().toISOString())).toBe("today");
    expect(postedAgoLabel(new Date(Date.now() - 65 * day).toISOString())).toBe("2 months ago");
  });
  it("returns empty on unknown", () => {
    expect(postedAgoLabel(null)).toBe("");
    expect(postedAgoLabel("garbage")).toBe("");
  });
});

describe("OnceGuard", () => {
  it("fires exactly once per key (double-click dedup)", () => {
    const g = new OnceGuard();
    expect(g.fire("paywall:p1")).toBe(true);
    expect(g.fire("paywall:p1")).toBe(false);
    expect(g.fire("paywall:p1")).toBe(false);
    expect(g.fire("paywall:p2")).toBe(true);
  });
});
