import { describe, expect, it } from "vitest";
import {
  MAX_SHRINK_RATIO,
  MIN_JOBS,
  decideSnapshot,
  usableJobs,
} from "../../scripts/jobsSnapshotPolicy.mjs";

/**
 * The published jobs snapshot is a list of URLs, not just a list of jobs:
 * app/jobs/[id] generates one static page per entry with dynamicParams=false,
 * and the sitemap advertises every one. So a build that publishes a smaller
 * snapshot RETIRES indexed pages, and each retired URL serves the 404 page to
 * search traffic. Since the endpoint reads a rolling 30-day window, a stalled
 * discovery pipeline shrinks it on a timer — which is exactly when the build
 * must refuse rather than succeed quietly.
 */

const full = 992;

describe("decideSnapshot", () => {
  it("refuses a drained endpoint rather than deleting every page", () => {
    const v = decideSnapshot({ incomingCount: 0, previousCount: full });
    expect(v.accept).toBe(false);
    expect(v.reason).toMatch(/no usable jobs/i);
  });

  it("refuses a set below the absolute floor", () => {
    const v = decideSnapshot({ incomingCount: MIN_JOBS - 1, previousCount: full });
    expect(v.accept).toBe(false);
    expect(v.reason).toContain(String(MIN_JOBS));
  });

  it("refuses a refresh that would retire more than half the published pages", () => {
    // Comfortably above the floor, so this can only be the shrink rule.
    const v = decideSnapshot({ incomingCount: Math.floor(full * MAX_SHRINK_RATIO) - 1, previousCount: full });
    expect(v.accept).toBe(false);
    expect(v.reason).toMatch(/half/i);
  });

  it("accepts ordinary churn, because jobs do genuinely expire", () => {
    expect(decideSnapshot({ incomingCount: 900, previousCount: full }).accept).toBe(true);
    expect(decideSnapshot({ incomingCount: 1200, previousCount: full }).accept).toBe(true);
  });

  it("accepts the first snapshot, when there is nothing to protect", () => {
    expect(decideSnapshot({ incomingCount: 5, previousCount: 0 }).accept).toBe(true);
  });

  it("lets a deliberate reset through the guard", () => {
    const blocked = decideSnapshot({ incomingCount: 10, previousCount: full });
    expect(blocked.accept).toBe(false);
    expect(decideSnapshot({ incomingCount: 10, previousCount: full, force: true }).accept).toBe(true);
  });

  it("always explains itself, so a kept snapshot is never silent", () => {
    for (const c of [0, 10, 900]) {
      expect(decideSnapshot({ incomingCount: c, previousCount: full }).reason.trim()).not.toBe("");
    }
  });
});

describe("usableJobs", () => {
  it("drops rows that cannot render a page or link out", () => {
    const rows = [
      { id: "1", title: "T", company: "C", description: "D", url: "u" },
      { id: "2", title: "T", company: "C", description: "D" }, // no url
      { id: "3", title: "T", company: "C", url: "u" }, // no description
      { title: "T", company: "C", description: "D", url: "u" }, // no id
    ];
    expect(usableJobs(rows).map((j) => j.id)).toEqual(["1"]);
  });

  it("treats a malformed payload as empty instead of throwing", () => {
    expect(usableJobs(undefined)).toEqual([]);
    expect(usableJobs(null)).toEqual([]);
  });
});
