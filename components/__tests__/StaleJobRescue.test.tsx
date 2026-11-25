/**
 * The 404 page for a retired public job link. jsdom + a mocked API.
 *
 * The behaviours that matter: an open job gets a way to its live posting, a
 * closed one gets an honest "no longer listed", a failed lookup is NOT reported
 * as closed, and any other 404 keeps the generic message and never calls the
 * API.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchJobDetail = vi.fn();
vi.mock("@/lib/jobsApi", () => ({
  fetchJobDetail: (id: string) => fetchJobDetail(id),
}));
// jsdom cannot navigate, so the redirect goes through a seam the test can watch.
const goTo = vi.fn();
vi.mock("@/lib/navigate", () => ({
  goTo: (href: string) => goTo(href),
}));

import StaleJobRescue, { MESSAGE_REDIRECT_MS } from "@/components/seo/StaleJobRescue";

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
  vi.useRealTimers();
  fetchJobDetail.mockReset();
  goTo.mockReset();
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

describe("StaleJobRescue redirects", () => {
  const OPEN = { isActive: true, title: "Backend Engineer", company: "Stripe", location: "New York, NY" };
  const CLOSED = { isActive: false, title: "Old role", company: "Acme", location: "" };

  it("sends a still-open job straight to its posting in the app", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue(OPEN);
    mount();

    await waitFor(() => expect(goTo).toHaveBeenCalledTimes(1));
    expect(goTo).toHaveBeenCalledWith(`/?view=jobs&job=${ID}`);
  });

  it("does not redirect before the lookup has answered", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockReturnValue(new Promise(() => {})); // never resolves
    mount();

    await new Promise((r) => setTimeout(r, 0));
    expect(goTo).not.toHaveBeenCalled();
  });

  it("shows the closed message first, then takes the visitor to the job search", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue(CLOSED);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mount();

    // let the resolved lookup flush without advancing the redirect timer
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: /no longer listed/i })).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(MESSAGE_REDIRECT_MS - 1);
    });
    expect(goTo).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith("/?view=jobs");
  });

  it("takes a failed lookup to the job search too, and still never calls it closed", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockRejectedValue(new Error("HTTP 503"));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mount();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: /couldn't find this job/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /no longer listed/i })).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(MESSAGE_REDIRECT_MS);
    });
    expect(goTo).toHaveBeenCalledWith("/?view=jobs");
  });

  it("cancels the pending redirect when the page is left", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue(CLOSED);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const view = mount();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    view.unmount();
    await act(async () => {
      vi.advanceTimersByTime(MESSAGE_REDIRECT_MS * 2);
    });
    expect(goTo).not.toHaveBeenCalled();
  });

  it("never redirects any other 404", async () => {
    visit("/some/old/page/");
    mount();

    await new Promise((r) => setTimeout(r, 0));
    expect(goTo).not.toHaveBeenCalled();
  });

  it("keeps working links on screen in case the redirect is blocked", async () => {
    visit(`/jobs/${ID}/`);
    fetchJobDetail.mockResolvedValue(OPEN);
    mount();

    expect((await screen.findByRole("link", { name: /view this job/i })).getAttribute("href")).toBe(`/?view=jobs&job=${ID}`);
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

  it("navigates through the lib/navigate seam", () => {
    const component = readFileSync(join(__dirname, "..", "seo", "StaleJobRescue.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(component).toMatch(/import \{ goTo \} from "@\/lib\/navigate"/);
    expect(component).not.toMatch(/window\.location\.(replace|assign|href\s*=)/);
  });
});
