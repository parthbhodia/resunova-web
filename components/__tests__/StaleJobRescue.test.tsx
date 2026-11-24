/**
 * The 404 page for a retired public job link. jsdom + a mocked API.
 *
 * The behaviours that matter: an open job gets a way to its live posting, a
 * closed one gets an honest "no longer listed", a failed lookup is NOT reported
 * as closed, and any other 404 keeps the generic message and never calls the
 * API.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchJobDetail = vi.fn();
vi.mock("@/lib/jobsApi", () => ({
  fetchJobDetail: (id: string) => fetchJobDetail(id),
}));

import StaleJobRescue from "@/components/seo/StaleJobRescue";

const ID = "3f2b1c9e-8a47-4d1e-9c55-0a1b2c3d4e5f";
// next/link drops the trailing slash in jsdom (trailingSlash is a next.config
// setting, not applied under vitest); production renders "/jobs/".
const JOBS_LIST = /^\/jobs\/?$/;

function visit(path: string) {
  window.history.pushState({}, "", path);
}

function mount() {
  return render(
    <StaleJobRescue>
      <p>Page not found. The page you requested does not exist.</p>
    </StaleJobRescue>,
  );
}

afterEach(() => {
  cleanup();
  fetchJobDetail.mockReset();
  visit("/");
});

describe("StaleJobRescue", () => {
  it("offers the live posting when the job is still open", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue({
      isActive: true,
      title: "Backend Engineer",
      company: "Stripe",
      location: "New York, NY",
    });
    mount();

    expect(screen.getByRole("heading", { name: /looking for this job/i })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: /still open/i })).toBeTruthy();
    expect(screen.getByText("Backend Engineer")).toBeTruthy();
    expect(screen.getByText("Stripe · New York, NY")).toBeTruthy();
    expect(screen.getByRole("link", { name: /view this job/i }).getAttribute("href")).toBe(`/?view=jobs&job=${ID}`);
    expect(screen.getByRole("link", { name: /browse current jobs/i }).getAttribute("href")).toMatch(JOBS_LIST);
    expect(fetchJobDetail).toHaveBeenCalledWith(ID);
    // the generic dead end is gone
    expect(screen.queryByText(/does not exist/i)).toBeNull();
  });

  it("says the job is no longer listed when the API reports it inactive", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue({ isActive: false, title: "Old role", company: "Acme", location: "" });
    mount();

    expect(await screen.findByRole("heading", { name: /no longer listed/i })).toBeTruthy();
    // a closed role is not offered as open
    expect(screen.queryByRole("link", { name: /view this job/i })).toBeNull();
    expect(screen.getByRole("link", { name: /browse current jobs/i }).getAttribute("href")).toMatch(JOBS_LIST);
    expect(screen.getByRole("link", { name: /search all jobs/i }).getAttribute("href")).toBe("/?view=jobs");
  });

  it("does not call a failed lookup a closed job", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockRejectedValue(new Error("HTTP 503"));
    mount();

    expect(await screen.findByRole("heading", { name: /couldn't find this job/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /no longer listed/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /view this job/i })).toBeNull();
    expect(screen.getByRole("link", { name: /browse current jobs/i })).toBeTruthy();
  });

  it("leaves every other 404 alone and never calls the API", async () => {
    visit("/some/old/page/");
    mount();

    expect(screen.getByText(/does not exist/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /looking for this job/i })).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchJobDetail).not.toHaveBeenCalled();
  });

  it("does not treat /jobs/sponsors as a posting", async () => {
    visit("/jobs/sponsors/");
    mount();

    expect(screen.getByText(/does not exist/i)).toBeTruthy();
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchJobDetail).not.toHaveBeenCalled();
  });

  it("looks up exactly the id in the address", async () => {
    visit("/jobs/abc-123");
    fetchJobDetail.mockResolvedValue({ isActive: true, title: "T", company: "C", location: "" });
    mount();

    await waitFor(() => expect(fetchJobDetail).toHaveBeenCalledTimes(1));
    expect(fetchJobDetail).toHaveBeenCalledWith("abc-123");
  });
});

describe("not-found wiring", () => {
  // `app/not-found.tsx` is a route file, not something a unit test can mount.
  // This pin is what holds the one call that connects the component to the
  // page: remove it and the 404 goes back to a dead end with every test above
  // still green.
  const source = readFileSync(join(__dirname, "..", "..", "app", "not-found.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders the rescue around the generic message", () => {
    expect(source).toMatch(/import StaleJobRescue from "@\/components\/seo\/StaleJobRescue"/);
    expect(source).toMatch(/<StaleJobRescue>[\s\S]*Page not found[\s\S]*<\/StaleJobRescue>/);
  });

  it("keeps the page out of the index", () => {
    expect(source).toMatch(/index:\s*false/);
  });
});
