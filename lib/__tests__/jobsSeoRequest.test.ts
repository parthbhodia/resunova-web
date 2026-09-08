import { describe, expect, it } from "vitest";
import {
  SEO_JOBS_MAX_POSTINGS,
  SEO_JOBS_WINDOW_DAYS,
  jobsWindowDays,
  seoJobsUrl,
} from "../../scripts/jobsSeoRequest.mjs";

/**
 * The deployed `/api/seo/jobs` memoizes its answer in ONE module-level slot
 * keyed on `f"{max_age_days}:{max_postings}"`, with no timestamp and no TTL. So
 * a caller that sends the same two values every run can never miss it after the
 * first request of a process's life — measured in production, the daily refresh
 * fetched the endpoint eighteen minutes after a sweep that retired 86,151
 * postings, got the identical 983 jobs, and went green.
 *
 * These tests pin the only thing standing between us and that again: consecutive
 * daily requests must carry a different key, and varying it must not change
 * which jobs get published.
 */

const at = (iso: string) => new Date(`${iso}T09:30:00Z`);

describe("jobsWindowDays", () => {
  it("asks for a different window each UTC day, so the single cache slot misses", () => {
    const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"];
    const windows = days.map((d) => jobsWindowDays(at(d)));
    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i], `${days[i - 1]} -> ${days[i]}`).not.toBe(windows[i - 1]);
    }
  });

  it("keeps one answer per UTC day, so a rebuild republishes rather than thrashes", () => {
    // Deliberately including odd milliseconds: every whole second has an even
    // epoch-ms value, so sampling only on the second lets an implementation
    // keyed per-request pass this vacuously.
    const instants = [
      "2026-09-08T00:00:00.000Z",
      "2026-09-08T00:00:00.001Z",
      "2026-09-08T12:00:00.500Z",
      "2026-09-08T23:59:59.999Z",
    ];
    const windows = instants.map((iso) => jobsWindowDays(new Date(iso)));
    expect(new Set(windows).size, `varied within one day: ${windows.join(",")}`).toBe(1);
  });

  it("still alternates across a month and a year boundary", () => {
    // getUTCDate() % 2 repeats here (31 and 1 are both odd), which would hand
    // two consecutive days the same cache key and restore the bug for that day.
    expect(jobsWindowDays(at("2026-02-01"))).not.toBe(jobsWindowDays(at("2026-01-31")));
    expect(jobsWindowDays(at("2027-01-01"))).not.toBe(jobsWindowDays(at("2026-12-31")));
  });

  it("never narrows the window below the 30 days we already publish from", () => {
    // The endpoint takes the newest `max_postings` inside the window, so a WIDER
    // window is a superset returning the identical set while the corpus is
    // healthy, and merely an older tail if it ever drains. A narrower one would
    // publish strictly fewer pages on alternate days — churn we would be
    // causing ourselves.
    for (const days of SEO_JOBS_WINDOW_DAYS) expect(days).toBeGreaterThanOrEqual(30);
  });

  it("stays inside the range the endpoint accepts, or it clamps and stops alternating", () => {
    // `_int_param(request, "max_age_days", 30, 1, 90)` in resume_gui/routes/seo.py.
    for (const days of SEO_JOBS_WINDOW_DAYS) {
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(90);
    }
  });
});

describe("seoJobsUrl", () => {
  it("sends both halves of the cache key on the endpoint's own path", () => {
    const url = seoJobsUrl("https://api.resunova.io", at("2026-09-08"));
    expect(url).toContain("/api/seo/jobs?");
    expect(url).toContain(`max_age_days=${jobsWindowDays(at("2026-09-08"))}`);
    expect(url).toContain(`max_postings=${SEO_JOBS_MAX_POSTINGS}`);
  });

  it("carries the day's window into the URL rather than a fixed one", () => {
    const a = seoJobsUrl("https://api.resunova.io", at("2026-09-08"));
    const b = seoJobsUrl("https://api.resunova.io", at("2026-09-09"));
    expect(a).not.toBe(b);
  });

  it("does not double the slash on a base that ends in one", () => {
    expect(seoJobsUrl("https://api.resunova.io/", at("2026-09-08"))).toContain(
      "https://api.resunova.io/api/seo/jobs?",
    );
  });
});
