/**
 * The public job page, rendered from a posting the API holds right now.
 *
 * Three outcomes matter and they must stay three: an open posting renders; a
 * closed or unknown one is a real 404; an API that cannot answer is an error,
 * not a 404 (a 404 would be cached and would tell search the job is gone).
 */
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JOB_REVALIDATE_SECONDS, PublicJobsUnavailableError, type PublicJob } from "@/lib/publicJobs";

const fetchPublicJob = vi.fn();
const fetchPublicJobIndex = vi.fn();
vi.mock("@/lib/publicJobs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/publicJobs")>()),
  fetchPublicJob: (id: string) => fetchPublicJob(id),
  fetchPublicJobIndex: () => fetchPublicJobIndex(),
}));

// The signed-in redirect has its own tests (openJobInApp.test.tsx); here it
// would only add a session lookup that has nothing to do with what is rendered.
vi.mock("@/components/seo/OpenJobInApp", () => ({ default: () => null }));

import JobsIndexPage from "@/app/(marketing)/jobs/page";
import PublicJobPage, { generateMetadata, generateStaticParams } from "@/app/(marketing)/jobs/[id]/page";

const ID = "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f";
const job = (over: Partial<PublicJob> = {}): PublicJob => ({
  id: ID,
  title: "Backend Engineer",
  company: "Stripe",
  companySlug: "stripe",
  companyDomain: "stripe.com",
  url: "https://stripe.com/jobs/1",
  location: "New York, NY",
  postedAt: "2026-11-20T00:00:00+00:00",
  description: "Build payment systems at scale.",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  workModel: "hybrid",
  employmentType: "full_time",
  industry: "Fintech",
  country: null,
  ...over,
});
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const ldBlocks = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent || "{}"));

afterEach(() => {
  cleanup();
  fetchPublicJob.mockReset();
  fetchPublicJobIndex.mockReset();
});

describe("public job page: an open posting", () => {
  it("renders the posting and its JobPosting structured data", async () => {
    fetchPublicJob.mockResolvedValue(job());
    const { container } = render(await PublicJobPage(params()));
    expect(container.querySelector("h1")?.textContent).toBe("Backend Engineer");
    expect(container.textContent).toContain("Stripe");
    expect(container.textContent).toContain("Build payment systems at scale.");
    expect(container.querySelector('a[href="https://stripe.com/jobs/1"]')).toBeTruthy();
    const [ld] = ldBlocks(container);
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.title).toBe("Backend Engineer");
    expect(ld.url).toBe(`https://www.resunova.io/jobs/${ID}/`);
    expect(fetchPublicJob).toHaveBeenCalledWith(ID);
  });

  it("is offered to search, with its own canonical address", async () => {
    fetchPublicJob.mockResolvedValue(job());
    const meta = await generateMetadata(params());
    expect(meta.title).toBe("Backend Engineer at Stripe");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe(`https://www.resunova.io/jobs/${ID}/`);
  });
});

describe("public job page: laid out like the job inside the app", () => {
  const rendered = async (over: Partial<PublicJob> = {}) => {
    fetchPublicJob.mockResolvedValue(job(over));
    return render(await PublicJobPage(params())).container;
  };
  const factLabels = (c: HTMLElement) =>
    Array.from(c.querySelectorAll("h2"))
      .find((h) => h.textContent === "Job details")
      ?.parentElement?.textContent ?? "";

  it("shows only the facts the posting states, labelled the way the app labels them", async () => {
    const c = await rendered({
      salaryMin: 120000, salaryMax: 150000, salaryCurrency: "USD", salaryPeriod: "year", salarySource: "jd",
      employmentType: "full_time", workModel: "hybrid", seniority: "senior", industry: "Fintech",
    });
    const facts = factLabels(c);
    expect(facts).toContain("$120,000 - $150,000 a year");
    expect(facts).toContain("Estimated from the job description");
    expect(facts).toContain("Full-time");
    expect(facts).toContain("Hybrid");
    expect(facts).toContain("Senior");
    expect(facts).toContain("Fintech");
  });

  it("never invents a job type or level the posting did not state", async () => {
    const c = await rendered({ employmentType: null, seniority: null });
    expect(factLabels(c)).not.toContain("Job type");
    expect(factLabels(c)).not.toContain("Level");
    expect(c.textContent).not.toContain("Full-time");
  });

  it("renders the description as headings and lists, all of it in the HTML", async () => {
    const c = await rendered({
      description: "About the role\n\nWe build payments.\n\nRequirements:\n- 5 years of Go\n- Postgres",
    });
    expect(Array.from(c.querySelectorAll("h3")).map((h) => h.textContent)).toEqual(["About the role", "Requirements:"]);
    expect(Array.from(c.querySelectorAll("li")).map((li) => li.textContent)).toEqual(["5 years of Go", "Postgres"]);
  });

  it("offers Apply in the header and the rail, and a way into the app's match", async () => {
    const c = await rendered();
    expect(c.querySelectorAll('a[href="https://stripe.com/jobs/1"]').length).toBe(2);
    // By attribute, not a selector: jsdom's engine misreads "?" and "&" inside one.
    const link = (href: string) => Array.from(c.querySelectorAll("a")).find((a) => a.getAttribute("href") === href);
    expect(link(`/?view=jobs&job=${ID}`)?.textContent).toBe("Match your résumé");
    expect(link("/?view=analyze")?.textContent).toBe("Upload your résumé");
  });

  it("names the extracted requirement count when there is one, and does not claim one when there is not", async () => {
    expect((await rendered({ totalRequirements: 13 })).textContent).toContain("13 requirements extracted from this posting");
    cleanup();
    expect((await rendered({ totalRequirements: 0 })).textContent).not.toContain("requirements extracted");
  });
});

describe("public job page: an open posting too thin to index", () => {
  const thin = () => job({ postedAt: null, location: "12 locations" });

  it("still renders for the person holding the link, with no JobPosting markup", async () => {
    fetchPublicJob.mockResolvedValue(thin());
    const { container } = render(await PublicJobPage(params()));
    expect(container.querySelector("h1")?.textContent).toBe("Backend Engineer");
    expect(ldBlocks(container)).toEqual([]);
  });

  it("is kept out of the index", async () => {
    fetchPublicJob.mockResolvedValue(thin());
    expect((await generateMetadata(params())).robots).toEqual({ index: false, follow: true });
  });

  it("a posting outside the US is kept out of the index too", async () => {
    fetchPublicJob.mockResolvedValue(job({ country: "GB" }));
    expect((await generateMetadata(params())).robots).toEqual({ index: false, follow: true });
  });
});

describe("public job page: a posting that is gone", () => {
  it("is a real 404, not a rendered page", async () => {
    fetchPublicJob.mockResolvedValue(null);
    await expect(PublicJobPage(params())).rejects.toMatchObject({
      digest: expect.stringMatching(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/),
    });
  });

  it("is kept out of the index and does not describe a job", async () => {
    fetchPublicJob.mockResolvedValue(null);
    const meta = await generateMetadata(params());
    expect(meta.title).toBe("Job not found");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe("public job page: an API that cannot answer", () => {
  it("errors the page instead of 404ing it, so it is not cached as 'gone'", async () => {
    fetchPublicJob.mockRejectedValue(new PublicJobsUnavailableError("HTTP 503"));
    const failure = await PublicJobPage(params()).then(
      () => null,
      (e: unknown) => e,
    );
    expect(failure).toBeInstanceOf(PublicJobsUnavailableError);
    expect((failure as { digest?: string }).digest ?? "").not.toMatch(/404|NOT_FOUND/);
  });

  it("errors the metadata too", async () => {
    fetchPublicJob.mockRejectedValue(new PublicJobsUnavailableError("HTTP 503"));
    await expect(generateMetadata(params())).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });
});

describe("jobs listing", () => {
  it("lists the postings the API returned, each linking to its own page", async () => {
    fetchPublicJobIndex.mockResolvedValue({
      jobs: [job({ id: "aaa-111", title: "Platform Engineer" }), job({ id: "bbb-222", title: "Data Analyst", company: "Acme" })],
      generatedAt: "2026-11-24T10:00:00+00:00",
    });
    const { container } = render(await JobsIndexPage());
    expect(container.querySelector('a[href="/jobs/aaa-111"]')?.textContent).toBe("Platform Engineer");
    expect(container.querySelector('a[href="/jobs/bbb-222"]')?.textContent).toBe("Data Analyst");
    expect(container.textContent).toContain("Updated November 24, 2026");
  });

  it("says the board is being refreshed when a healthy API returns no postings", async () => {
    fetchPublicJobIndex.mockResolvedValue({ jobs: [], generatedAt: null });
    const { container } = render(await JobsIndexPage());
    expect(container.textContent).toContain("being refreshed");
  });

  it("errors on an API outage instead of drawing an empty board", async () => {
    fetchPublicJobIndex.mockRejectedValue(new PublicJobsUnavailableError("HTTP 502"));
    await expect(JobsIndexPage()).rejects.toBeInstanceOf(PublicJobsUnavailableError);
  });
});

describe("public job page route config", () => {
  const src = readFileSync(join(__dirname, "..", "..", "app", "(marketing)", "jobs", "[id]", "page.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders any open posting on demand, not only those that existed at the last deploy", () => {
    expect(src).toMatch(/export const dynamicParams = true/);
    expect(src).not.toMatch(/dynamicParams = false/);
    expect(src).not.toMatch(/force-static/);
  });

  it("generates nothing at build time, so a build never depends on the API", () => {
    expect(generateStaticParams()).toEqual([]);
  });

  it("caches a rendered posting for exactly the window the data layer declares", () => {
    const literal = /export const revalidate = (\d+);/.exec(src);
    expect(literal).not.toBeNull();
    expect(Number(literal![1])).toBe(JOB_REVALIDATE_SECONDS);
  });

  it("no longer reads a committed list of postings", () => {
    expect(src).not.toMatch(/jobsSeoData|PUBLIC_JOBS|getPublicJob/);
    expect(src).toMatch(/from "@\/lib\/publicJobs"/);
  });
});

describe("jobs listing route config", () => {
  const src = readFileSync(join(__dirname, "..", "..", "app", "(marketing)", "jobs", "page.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders per request and reads the live index", () => {
    expect(src).toMatch(/export const dynamic = "force-dynamic"/);
    expect(src).not.toMatch(/force-static|jobsSeoData|PUBLIC_JOBS/);
    expect(src).toMatch(/fetchPublicJobIndex/);
  });
});
