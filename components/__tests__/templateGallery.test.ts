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
 *
 * The cards now name a preset and read their heading, role badge and href
 * back off RESUME_STYLE_PRESETS, so the only thing left hand-written per card
 * is its thumbnail. What a card CLAIMS can no longer drift from what picking
 * it produces; what remains checkable here is which presets appear at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";

const SRC = readFileSync("components/LandingPage.tsx", "utf8");

/** The gallery block, isolated so a `preset:` elsewhere on the page can't count. */
const GALLERY = SRC.slice(
  SRC.indexOf("const RESUME_TEMPLATES"),
  SRC.indexOf("\n];", SRC.indexOf("const RESUME_TEMPLATES")),
);

const linked = [...GALLERY.matchAll(/preset:\s*"([a-z-]+)"/g)].map((m) => m[1]);

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

  /**
   * The card heading, its role badge and its link used to be three hand-typed
   * strings sitting beside the preset id. That is the drift surface this file
   * exists to police, so close it rather than police it: a card carries the
   * preset and nothing else it could get wrong.
   */
  it("reads each card's heading and link off the presets", () => {
    expect(SRC).toContain("RESUME_STYLE_PRESETS");
    expect(GALLERY).not.toMatch(/\bname:\s*"/);
    expect(GALLERY).not.toMatch(/\bhref:\s*"/);
  });

  it("only claims the categories the presets actually have", () => {
    // The copy read "technical, creative, or CV layout". There is no CV
    // preset, no CV layout and no CV category — `TBLayout` is
    // single | twoColumn | rightSidebar | topBannerRightSidebar — and no
    // preset targets federal or academic-CV formatting either.
    const copy = SRC.slice(SRC.indexOf('id="templates"'), SRC.indexOf('id="templates"') + 2500);
    const promised = copy.match(/Start from[^.]+\./)?.[0] ?? "";
    expect(promised).toBeTruthy();
    for (const word of ["CV", "federal", "curriculum vitae"]) {
      expect(promised.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  /**
   * ⚠️ The badge names a role fit, which is only honest while the surface also
   * says the fit is not a restriction: the presets differ in typography and
   * layout, so nothing here stops a nurse picking Modern. Drop that sentence
   * and five labels start reading as five different products.
   */
  it("says a role fit does not lock anyone out", () => {
    const copy = SRC.slice(SRC.indexOf('id="templates"'), SRC.indexOf('id="templates"') + 2500);
    expect(copy).toMatch(/any template works for any role/i);
  });
});
