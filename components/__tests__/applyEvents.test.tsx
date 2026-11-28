/**
 * Apply on a job: never a sign-in wall, always one click from the employer.
 *
 * Founder-directed (2026-11-27): "when i click apply it should show something
 * like a pop up with option to go to the job instead of forcing them to sign
 * in". A signed-out visitor gets an offer (check your résumé first) and a real
 * link past it; everyone else goes straight through.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";

const scan = vi.hoisted(() => ({ stash: vi.fn(), go: vi.fn() }));
vi.mock("@/lib/anonScan", () => ({ stashAnalyzeJd: scan.stash, goToFreeScan: scan.go }));

import JobApplyLink from "@/components/jobs/JobApplyLink";
import { trackApply } from "@/lib/analytics";
import { FREE_SCAN_DAILY_LIMIT } from "@/lib/planLimits";

declare global {
  interface Window { gtag?: unknown }
}

/** Source with comments removed, so a docstring that quotes a call cannot satisfy a pin. */
function code(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const JOB = { id: "p9", company: "Acme", url: "https://boards.example.com/p9", jd: "Build payment systems." };
let gtag: ReturnType<typeof vi.fn>;

beforeEach(() => {
  gtag = vi.fn();
  window.gtag = gtag;
  scan.stash.mockReset();
  scan.go.mockReset();
});
afterEach(() => {
  cleanup();
  delete window.gtag;
});

/** Click the way a browser would, and report whether the navigation was cancelled. */
function click(el: HTMLElement): boolean {
  // Read it at the document, after React's own handler at the root has run.
  let prevented = false;
  const listener = (e: Event) => {
    if (e.target !== el) return;
    prevented = e.defaultPrevented;
    e.preventDefault(); // jsdom cannot navigate
  };
  document.addEventListener("click", listener);
  fireEvent.click(el);
  document.removeEventListener("click", listener);
  return prevented;
}

const events = () => gtag.mock.calls.map((c) => c[1]);

describe("apply events", () => {
  it("send the place, the posting and the company, and drop a missing company", () => {
    trackApply("apply_click", "feed", { id: "p1", company: "Rvohealth" });
    expect(gtag).toHaveBeenLastCalledWith("event", "apply_click", { place: "feed", posting_id: "p1", company: "Rvohealth" });
    trackApply("apply_prompt_shown", "job_detail", { id: "p2", company: null });
    expect(Object.keys(gtag.mock.calls[1][2] as object)).toEqual(["place", "posting_id"]);
  });
});

describe("Apply for a signed-out visitor", () => {
  it("opens the popup instead of leaving, and says so to analytics", () => {
    render(<JobApplyLink job={JOB} place="job_page" signedIn={false}>Apply</JobApplyLink>);
    expect(click(screen.getByRole("link", { name: "Apply" }))).toBe(true);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(events()).toEqual(["apply_prompt_shown"]);
  });

  it("offers a résumé check without leading with a sign-in, quoting the real allowance", () => {
    render(<JobApplyLink job={JOB} place="job_page" signedIn={false}>Apply</JobApplyLink>);
    click(screen.getByRole("link", { name: "Apply" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(`${FREE_SCAN_DAILY_LIMIT} scans a day`);
    expect(screen.getByRole("heading").textContent).not.toMatch(/^sign in/i);
  });

  it("is one click from the employer: a real link that opens their page", () => {
    const onFollow = vi.fn();
    render(<JobApplyLink job={JOB} place="job_detail" signedIn={false} onFollow={onFollow}>Apply</JobApplyLink>);
    click(screen.getByRole("link", { name: "Apply" }));
    const go = screen.getByRole("link", { name: "Continue to application" });
    expect(go.getAttribute("href")).toBe(JOB.url);
    expect(go.getAttribute("target")).toBe("_blank");
    expect(click(go)).toBe(false);
    expect(events()).toEqual(["apply_prompt_shown", "apply_click"]);
    expect(onFollow).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("taking the check carries this job's text to the scan", () => {
    render(<JobApplyLink job={JOB} place="job_page" signedIn={false}>Apply</JobApplyLink>);
    click(screen.getByRole("link", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload your résumé" }));
    expect(scan.stash).toHaveBeenCalledWith(JOB.jd);
    expect(scan.go).toHaveBeenCalledTimes(1);
    expect(events()).toEqual(["apply_prompt_shown", "apply_prompt_accepted"]);
  });
});

describe("Apply for everyone else goes straight through", () => {
  it.each([
    ["signed in", true],
    ["session not known yet", null],
  ] as const)("%s", (_label, signedIn) => {
    const onFollow = vi.fn();
    render(<JobApplyLink job={JOB} place="feed" signedIn={signedIn} onFollow={onFollow}>Apply</JobApplyLink>);
    expect(click(screen.getByRole("link", { name: "Apply" }))).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(events()).toEqual(["apply_click"]);
    expect(onFollow).toHaveBeenCalledTimes(1);
  });

  it("a posting with no link has no Apply at all", () => {
    const { container } = render(<JobApplyLink job={{ ...JOB, url: "" }} place="feed" signedIn={false}>Apply</JobApplyLink>);
    expect(container.innerHTML).toBe("");
  });
});

describe("where the Apply links live", () => {
  it("the in-app job pane uses the popup and no longer walls Apply behind sign-in", () => {
    const src = code("components/JobDetail.tsx");
    expect(src).toMatch(/<JobApplyLink[\s\S]{0,200}place="job_detail"/);
    expect(src).not.toContain('openSignIn({ ask: "apply" })');
  });

  it("the public job page uses it too, with no bare Apply anchor left", () => {
    const src = code("app/(marketing)/jobs/[id]/page.tsx");
    expect(src).toContain("<PublicApplyLink");
    expect(src).not.toMatch(/<a\s+href=\{job\.url\}/);
    expect(code("components/seo/PublicJobActions.tsx")).toMatch(/place="job_page"/);
  });

  it("the feed card and the Home list report their own place", () => {
    expect(code("components/JobsFeed.tsx")).toContain('trackApply("apply_click", "feed", job)');
    expect(code("components/HomeDashboard.tsx")).toContain('trackApply("apply_click", "home", job)');
  });
});
