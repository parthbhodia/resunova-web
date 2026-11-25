/**
 * The sitemap lists the postings the API holds today.
 *
 * It used to list a snapshot committed in July, so search was being pointed at
 * roles that had since closed. An API that cannot answer must fail the sitemap
 * (the last good copy keeps serving) rather than produce one with no jobs in
 * it, which would tell search the postings were gone.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PublicJob } from "@/lib/publicJobs";

const fetchPublicJobIndex = vi.fn();
vi.mock("@/lib/publicJobs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/publicJobs")>()),
  fetchPublicJobIndex: () => fetchPublicJobIndex(),
}));

import sitemap from "@/app/sitemap";

const job = (id: string, postedAt: string | null): PublicJob => ({
  id,
  title: "Engineer",
  company: "Acme",
  companySlug: "acme",
  companyDomain: "acme.com",
  url: "https://acme.com/j",
  location: "Austin, TX",
  postedAt,
  description: "Do the work.",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  workModel: null,
  employmentType: null,
  industry: null,
});

afterEach(() => fetchPublicJobIndex.mockReset());

describe("sitemap job entries", () => {
  it("lists every posting the API returned, with the trailing slash every indexed URL has", async () => {
    fetchPublicJobIndex.mockResolvedValue({
      jobs: [job("aaa-111", "2026-11-20T00:00:00+00:00"), job("bbb-222", "2026-11-21T00:00:00+00:00")],
      generatedAt: "2026-11-24T10:00:00+00:00",
    });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://www.resunova.io/jobs/aaa-111/");
    expect(urls).toContain("https://www.resunova.io/jobs/bbb-222/");
  });

  it("dates a posting by when it was posted and falls back to when the list was generated", async () => {
    fetchPublicJobIndex.mockResolvedValue({
      jobs: [job("dated", "2026-11-20T00:00:00+00:00"), job("undated", null)],
      generatedAt: "2026-11-24T10:00:00+00:00",
    });
    const entries = await sitemap();
    const byId = (id: string) => entries.find((e) => e.url.endsWith(`/jobs/${id}/`));
    expect(new Date(byId("dated")!.lastModified as Date).toISOString()).toBe("2026-11-20T00:00:00.000Z");
    expect(new Date(byId("undated")!.lastModified as Date).toISOString()).toBe("2026-11-24T10:00:00.000Z");
  });

  it("dates the /jobs/ listing by when the API generated the list", async () => {
    fetchPublicJobIndex.mockResolvedValue({ jobs: [], generatedAt: "2026-11-24T10:00:00+00:00" });
    const listing = (await sitemap()).find((e) => e.url === "https://www.resunova.io/jobs/");
    expect(new Date(listing!.lastModified as Date).toISOString()).toBe("2026-11-24T10:00:00.000Z");
  });

  it("keeps every other page when there are no postings", async () => {
    fetchPublicJobIndex.mockResolvedValue({ jobs: [], generatedAt: null });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://www.resunova.io/");
    expect(urls).toContain("https://www.resunova.io/blog/");
    expect(urls.filter((u) => /\/jobs\/[^/]+\/$/.test(u))).toEqual([]);
  });

  it("fails instead of returning a sitemap with no jobs when the API cannot answer", async () => {
    fetchPublicJobIndex.mockRejectedValue(new Error("Public jobs unavailable: HTTP 502"));
    await expect(sitemap()).rejects.toThrow(/unavailable/);
  });
});

describe("sitemap route config", () => {
  const src = readFileSync(join(__dirname, "..", "..", "app", "sitemap.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders per request so a build never needs the API and the jobs are never a build-time snapshot", () => {
    expect(src).toMatch(/export const dynamic = "force-dynamic"/);
    expect(src).not.toMatch(/force-static/);
  });
});
