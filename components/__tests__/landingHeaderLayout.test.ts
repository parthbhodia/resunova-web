import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The landing header collapsed into overlapping controls between roughly
 * 768px and 1024px: the centre nav was `position: absolute; left: 0; right: 0`,
 * so it left the flex row entirely and centred itself on the viewport while
 * the logo and the Log In / Create My Resume buttons laid out underneath it.
 * "ATS Checker" drew on top of "Log In", "Blog" on top of the CTA.
 *
 * jsdom has no layout engine, so the real proof is the browser sweep run
 * against the built export. These are the two source-level invariants that,
 * if either is broken again, reproduce the bug — cheap to check on every run.
 */

const SRC = readFileSync(join(process.cwd(), "components/LandingPage.tsx"), "utf8");

function navElement(): string {
  const start = SRC.indexOf('<nav className="lp-nav');
  expect(start, "the landing header nav should exist").toBeGreaterThan(-1);
  return SRC.slice(start, SRC.indexOf(">", start));
}

describe("landing header layout", () => {
  it("keeps the centre nav in flow", () => {
    const nav = navElement();
    // Out of flow = cannot negotiate width with its siblings = overlap.
    expect(nav).not.toMatch(/position:\s*["']absolute["']/);
    expect(nav).toMatch(/flex:\s*["']1 1 auto["']/);
  });

  it("hands off between the desktop nav and the burger without a gap or an overlap", () => {
    const showDesktop = SRC.match(/@media \(min-width: (\d+)px\) \{ \.md-flex/);
    const showBurger = SRC.match(/@media \(max-width: ([\d.]+)px\) \{\s*\.lp-nav-cta/);
    expect(showDesktop, "the .md-flex breakpoint should be declared").not.toBeNull();
    expect(showBurger, "the burger breakpoint should be declared").not.toBeNull();

    const desktopFrom = Number(showDesktop![1]);
    const burgerUntil = Number(showBurger![1]);

    // Strictly less: at `max-width: 768px` AND `min-width: 768px` both rules
    // match at exactly 768px, which rendered the full nav *and* the burger.
    expect(burgerUntil).toBeLessThan(desktopFrom);
    // And no dead zone between them where neither shows.
    expect(desktopFrom - burgerUntil).toBeLessThan(1.5);
  });

  it("gives the desktop nav enough room for its five items plus both buttons", () => {
    const showDesktop = Number(SRC.match(/@media \(min-width: (\d+)px\) \{ \.md-flex/)![1]);
    // Measured content need is ~1000px (logo ~150 + nav ~510 + actions ~340).
    // 768px was below that, which is why the row crammed before it overlapped.
    expect(showDesktop).toBeGreaterThanOrEqual(1024);
  });

  it("shows and hides the mobile menu on the same boundary as the burger", () => {
    // A mismatch here leaves the dropdown reachable while the burger is gone.
    const hideMenu = SRC.match(/@media \(min-width: (\d+)px\) \{ \.lp-nav-menu \{ display: none/);
    expect(hideMenu).not.toBeNull();
    const showDesktop = Number(SRC.match(/@media \(min-width: (\d+)px\) \{ \.md-flex/)![1]);
    expect(Number(hideMenu![1])).toBe(showDesktop);
  });
});
