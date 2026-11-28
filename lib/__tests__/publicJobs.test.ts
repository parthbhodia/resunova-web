/**
 * Public postings read live from the API.
 *
 * The behaviour that matters is the difference between "the API says this job
 * is gone" (null, so the page 404s) and "the API could not be reached" (throws,
 * so the page errors and is not cached). Turning an outage into a 404 would
 * retire every indexed job page while the API was down.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FETCH_TIMEOUT_MS,
  INDEX_REVALIDATE_SECONDS,
  JOB_REVALIDATE_SECONDS,
  PublicJobsUnavailableError,
  fetchPublicJob,
  fetchPublicJobIndex,
  isIndexablePosting,
  jobHref,
  type PublicJob,
} from "@/lib/publicJobs";

const ID = "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f";
const BASE = "https://api.example.test";

const detail = (over: Record<string, unknown> = {}) => ({
  id: ID,
  title: "Backend Engineer",
  company: "Stripe",
  companySlug: "stripe",
  companyDomain: "stripe.com",
  url: "https://stripe.com/jobs/1",
  location: "New York, NY",
  postedAt: "2026-11-20T00:00:00+00:00",
  isActive: true,
  jdText: "Build payment systems.",
  salaryMin: 150000,
  salaryMax: 200000,
  salaryCurrency: "USD",
  salaryPeriod: "year",
  workModel: "hybrid",
  employmentType: "full_time",
  industry: "Fintech",
  country: null,
  seniority: "senior",
  salarySource: "listing",
  totalRequirements: 13,
  // fields the public page must never depend on
  contacts: [],
  matched: [],
  ...over,
});

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchPublicJob: a job that is open", () => {
  it("maps the API detail onto the fields the page renders", async () => {
    fetchMock.mockReturnValue(respond(200, detail()));
    const job = await fetchPublicJob(ID);
    expect(job).toEqual({
      id: ID,
      title: "Backend Engineer",
      company: "Stripe",
      companySlug: "stripe",
      companyDomain: "stripe.com",
      url: "https://stripe.com/jobs/1",
      location: "New York, NY",
      postedAt: "2026-11-20T00:00:00+00:00",
      description: "Build payment systems.",
      salaryMin: 150000,
      salaryMax: 200000,
      salaryCurrency: "USD",
      salaryPeriod: "year",
      workModel: "hybrid",
      employmentType: "full_time",
      industry: "Fintech",
      country: null,
      seniority: "senior",
      salarySource: "listing",
      totalRequirements: 13,
    });
  });

  it("reads a missing level, pay source or requirement count as unknown, not as a fact", async () => {
    fetchMock.mockReturnValue(respond(200, detail({ seniority: undefined, salarySource: undefined, totalRequirements: undefined })));
    const job = await fetchPublicJob(ID);
    expect(job).toMatchObject({ seniority: null, salarySource: null, totalRequirements: 0 });
  });

  it("asks the API for exactly that id, anonymously, with a revalidate window and a timeout", async () => {
    fetchMock.mockReturnValue(respond(200, detail()));
    await fetchPublicJob(ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/jobs/${ID}`);
    expect(init.next).toEqual({ revalidate: JOB_REVALIDATE_SECONDS });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(FETCH_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
    // public data, no session on the server: no credentials of any kind
    expect(init.headers.authorization ?? init.headers.Authorization).toBeUndefined();
    expect(init.credentials).toBeUndefined();
  });

  it("tolerates a trailing slash on the configured base", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", `${BASE}///`);
    fetchMock.mockReturnValue(respond(200, detail()));
    await fetchPublicJob(ID);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/api/jobs/${ID}`);
  });

  it("takes the canonical id from the API, so an upper-case link canonicalises", async () => {
    fetchMock.mockReturnValue(respond(200, detail()));
    const job = await fetchPublicJob(ID.toUpperCase());
    expect(job?.id).toBe(ID);
  });

  it("uses null, not empty strings, for fields the API does not state", async () => {
    fetchMock.mockReturnValue(
      respond(200, detail({ postedAt: "", salaryMin: "n/a", workModel: null, industry: "  ", country: undefined })),
    );
    const job = await fetchPublicJob(ID);
    expect(job?.postedAt).toBeNull();
    expect(job?.salaryMin).toBeNull();
    expect(job?.workModel).toBeNull();
    expect(job?.industry).toBeNull();
    expect(job?.country).toBeNull();
  });
});

describe("fetchPublicJob: a job that is gone", () => {
  it("returns null for a posting the API reports inactive", async () => {
    fetchMock.mockReturnValue(respond(200, detail({ isActive: false })));
    expect(await fetchPublicJob(ID)).toBeNull();
  });

  it("returns null for an id the API does not hold", async () => {
    fetchMock.mockReturnValue(respond(404, { error: "not_found" }));
    expect(await fetchPublicJob(ID)).toBeNull();
  });

  it("returns null for an id the API calls malformed", async () => {
    fetchMock.mockReturnValue(respond(400, { error: "missing_posting_id" }));
    expect(await fetchPublicJob(ID)).toBeNull();
  });

  it("never calls the API for something that is not an id", async () => {
    for (const bad of ["../etc/passwd", "a/b", "sponsors", "Sponsors", "", "x".repeat(129), "<script>"]) {
      expect(await fetchPublicJob(bad)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchPublicJob: an API that cannot answer is NOT a closed job", () => {
  it("throws on a server error instead of returning null", async () => {
    fetchMock.mockReturnValue(respond(503, { error: "storage unavailable" }));
    await expect(fetchPublicJob(ID)).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });

  it("throws on a 500", async () => {
    fetchMock.mockReturnValue(respond(500, { error: "boom" }));
    await expect(fetchPublicJob(ID)).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });

  it("throws when the network fails or times out", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(fetchPublicJob(ID)).rejects.toThrow(/fetch failed/);
  });

  it("throws when the body is not JSON", async () => {
    fetchMock.mockReturnValue(respond(200, "<html>gateway error</html>"));
    await expect(fetchPublicJob(ID)).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });

  it("throws, rather than reading it as closed, when isActive is missing or not a boolean", async () => {
    const { isActive: _omit, ...withoutFlag } = detail();
    void _omit;
    fetchMock.mockReturnValue(respond(200, withoutFlag));
    await expect(fetchPublicJob(ID)).rejects.toThrow(/isActive/);
    fetchMock.mockReturnValue(respond(200, detail({ isActive: "true" })));
    await expect(fetchPublicJob(ID)).rejects.toThrow(/isActive/);
  });

  it("throws when the body is not an object", async () => {
    fetchMock.mockReturnValue(respond(200, "null"));
    await expect(fetchPublicJob(ID)).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });

  it("names the missing setting when the API address is not configured in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(fetchPublicJob(ID)).rejects.toThrow(/NEXT_PUBLIC_API_URL is not set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isIndexablePosting", () => {
  const full = (): PublicJob => ({
    id: ID,
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
    country: null,
  });

  it("accepts a complete US posting", () => {
    expect(isIndexablePosting(full())).toBe(true);
  });

  it.each(["title", "company", "description", "url", "location"] as const)("rejects a posting with no %s", (field) => {
    expect(isIndexablePosting({ ...full(), [field]: "" })).toBe(false);
  });

  it("rejects a posting with no date", () => {
    expect(isIndexablePosting({ ...full(), postedAt: null })).toBe(false);
  });

  it("rejects a location that is only a count of locations", () => {
    expect(isIndexablePosting({ ...full(), location: "12 locations" })).toBe(false);
    expect(isIndexablePosting({ ...full(), location: "1 Location" })).toBe(false);
    // a real place that merely contains a number stays in
    expect(isIndexablePosting({ ...full(), location: "Suite 12, Austin, TX" })).toBe(true);
  });

  it("rejects a posting outside the US", () => {
    expect(isIndexablePosting({ ...full(), country: "GB" })).toBe(false);
  });
});

describe("fetchPublicJobIndex", () => {
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    title: "Engineer",
    company: "Acme",
    companySlug: "acme",
    companyDomain: "acme.com",
    url: "https://acme.com/j",
    location: "Austin, TX",
    postedAt: "2026-11-21T00:00:00+00:00",
    description: "Do the work.",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    workModel: null,
    employmentType: null,
    industry: null,
    ...over,
  });

  it("returns the postings and when the API generated them", async () => {
    fetchMock.mockReturnValue(
      respond(200, { jobs: [row("aaa"), row("bbb")], generatedAt: "2026-11-24T10:00:00+00:00" }),
    );
    const index = await fetchPublicJobIndex();
    expect(index.jobs.map((j) => j.id)).toEqual(["aaa", "bbb"]);
    expect(index.generatedAt).toBe("2026-11-24T10:00:00+00:00");
  });

  it("asks for the same window the snapshot used, with a revalidate window", async () => {
    fetchMock.mockReturnValue(respond(200, { jobs: [] }));
    await fetchPublicJobIndex();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/seo/jobs?max_age_days=30&max_postings=1000`);
    expect(init.next).toEqual({ revalidate: INDEX_REVALIDATE_SECONDS });
  });

  it("drops rows that are not a usable id or not worth indexing", async () => {
    fetchMock.mockReturnValue(
      respond(200, {
        jobs: [
          row("good"),
          row("../bad"),
          row("thin", { description: "" }),
          row("many", { location: "9 locations" }),
          null,
          "string",
        ],
      }),
    );
    expect((await fetchPublicJobIndex()).jobs.map((j) => j.id)).toEqual(["good"]);
  });

  it("an empty list from a healthy API is an empty list, not an error", async () => {
    fetchMock.mockReturnValue(respond(200, { jobs: [] }));
    expect(await fetchPublicJobIndex()).toEqual({ jobs: [], generatedAt: null });
  });

  it("throws on a failed API instead of returning an empty list", async () => {
    fetchMock.mockReturnValue(respond(502, { jobs: [], error: "fetch_failed" }));
    await expect(fetchPublicJobIndex()).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });

  it("throws when the response has no jobs array", async () => {
    fetchMock.mockReturnValue(respond(200, { error: "unavailable" }));
    await expect(fetchPublicJobIndex()).rejects.toThrow(/no jobs array/);
  });

  it("throws when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    await expect(fetchPublicJobIndex()).rejects.toThrow(/ECONNRESET/);
  });
});

describe("jobHref", () => {
  it("builds the public path and encodes the id", () => {
    expect(jobHref(ID)).toBe(`/jobs/${ID}`);
    expect(jobHref("a b")).toBe("/jobs/a%20b");
  });
});
