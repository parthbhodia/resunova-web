/**
 * The landing template gallery has to describe the templates that exist.
 *
 * Two failures were live before this file. The gallery showed four cards while
 * the builder shipped five presets, so a visitor undercounted the set by one
 * and `Classic` — the only serif, i.e. the most genuinely different look on
 * offer — was invisible from the marketing page. And the section copy invited
 * people to "pick a technical, creative, or CV layout" when no CV layout has
 * ever existed.
 *
 * Both are the same shape: the gallery is maintained by hand and drifts from
 * the preset list silently, because a missing card looks exactly like a set
 * with one fewer template in it. This is the ratchet.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";

const SRC = readFileSync("components/LandingPage.tsx", "utf8");

/** The gallery block, isolated so a `?preset=` elsewhere on the page can't count. */
const GALLERY = SRC.slice(
  SRC.indexOf("const RESUME_TEMPLATES"),
  SRC.indexOf("\n];", SRC.indexOf("const RESUME_TEMPLATES")),
);

const linked = [...GALLERY.matchAll(/\/template-builder\/\?preset=([a-z-]+)/g)].map((m) => m[1]);

describe("the landing template gallery", () => {
  it("finds the gallery block", () => {
    // Guard against the slice silently returning nothing, which would make
    // every assertion below vacuous.
    expect(GALLERY.length).toBeGreaterThan(500);
    expect(linked.length).toBeGreaterThan(0);
  });

  const shipped: string[] = RESUME_STYLE_PRESETS.map((p) => p.id);

  it("shows a card for every template the builder ships", () => {
    expect(shipped.filter((id) => !linked.includes(id))).toEqual([]);
  });

  it("does not advertise a template that does not exist", () => {
    expect(linked.filter((id) => !shipped.includes(id))).toEqual([]);
  });

  it("names each card once", () => {
    expect(new Set(linked).size).toBe(linked.length);
  });

  it("only claims the categories the presets actually have", () => {
    // The copy read "technical, creative, or CV layout". There is no CV
    // preset, no CV layout, and no CV category — `TBLayout` is
    // single | twoColumn | rightSidebar | topBannerRightSidebar.
    const categories = new Set(RESUME_STYLE_PRESETS.map((p) => p.category));
    const copy = SRC.slice(SRC.indexOf('id="templates"'), SRC.indexOf('id="templates"') + 2500);
    const promised = copy.match(/Pick a[^.]+layout/)?.[0] ?? "";
    expect(promised).toBeTruthy();
    for (const word of ["CV", "academic", "federal"]) {
      if (!categories.has(word.toLowerCase() as never)) {
        expect(promised).not.toContain(word);
      }
    }
  });
});
