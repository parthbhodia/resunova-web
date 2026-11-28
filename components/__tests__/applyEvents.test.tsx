import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import ApplyOutLink from "@/components/seo/ApplyOutLink";
import { trackApply } from "@/lib/analytics";

declare global {
  interface Window { gtag?: unknown }
}

/** Source with comments removed, so a docstring that quotes a call cannot satisfy a pin. */
function code(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

afterEach(() => { delete window.gtag; });

describe("apply events", () => {
  it("sends the place, the posting and the company, and drops a missing company", () => {
    const spy = vi.fn();
    window.gtag = spy;
    trackApply("apply_click", "feed", { id: "p1", company: "Rvohealth" });
    expect(spy).toHaveBeenLastCalledWith("event", "apply_click", { place: "feed", posting_id: "p1", company: "Rvohealth" });
    trackApply("apply_gated", "job_detail", { id: "p2", company: null });
    const sent = spy.mock.calls[1][2] as Record<string, unknown>;
    expect(Object.keys(sent)).toEqual(["place", "posting_id"]);
  });

  it("the public job page's link reports the click and still goes to the employer", () => {
    const spy = vi.fn();
    window.gtag = spy;
    render(<ApplyOutLink job={{ id: "p9", company: "Acme" }} href="https://boards.example.com/p9">Apply on company site</ApplyOutLink>);
    const link = screen.getByRole("link", { name: "Apply on company site" });
    expect(link.getAttribute("href")).toBe("https://boards.example.com/p9");
    expect(link.getAttribute("rel")).toBe("nofollow noopener");
    link.addEventListener("click", (e) => e.preventDefault()); // jsdom cannot navigate
    fireEvent.click(link);
    expect(spy).toHaveBeenCalledWith("event", "apply_click", { place: "job_page", posting_id: "p9", company: "Acme" });
  });

  it("the public job page uses that link and has no bare Apply anchor left", () => {
    const src = code("app/(marketing)/jobs/[id]/page.tsx");
    expect(src).toContain("<ApplyOutLink");
    expect(src).not.toMatch(/<a\s+href=\{job\.url\}/);
  });

  it("a signed-out visitor stopped at the wall is reported before the sign-in opens, and a click-through is reported once", () => {
    const src = code("components/JobDetail.tsx");
    const gatedAt = src.indexOf('trackApply("apply_gated", "job_detail"');
    const signInAt = src.indexOf('openSignIn({ ask: "apply" })');
    const clickAt = src.indexOf('trackApply("apply_click", "job_detail"');
    expect(gatedAt).toBeGreaterThan(-1);
    expect(gatedAt).toBeLessThan(signInAt);
    expect(clickAt).toBeGreaterThan(signInAt);
    expect(src.match(/trackApply\("apply_click"/g)?.length).toBe(1);
  });

  it("the feed card and the Home list report their own place", () => {
    expect(code("components/JobsFeed.tsx")).toContain('trackApply("apply_click", "feed", job)');
    expect(code("components/HomeDashboard.tsx")).toContain('trackApply("apply_click", "home", job)');
  });
});
