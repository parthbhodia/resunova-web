import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The referrer surfaces must follow the theme.
 *
 * ⚠️ WHAT THIS CAUGHT. All four files shipped with 110 hardcoded colour values
 * and ZERO design tokens, so they rendered byte-identically in light and dark.
 * Measured in a browser rather than inferred: with the app set to dark, the
 * /refer wrapper painted `rgb(248,250,252)` and its h1 `rgb(17,24,39)` — the
 * same pixels as light mode. A dark-mode visitor got a white page, and two of
 * these components are mounted INSIDE the themed profile hub, so they were
 * light-mode cards dropped onto a dark page.
 *
 * ⚠️ A CONTRAST CHECK COULD NOT SEE IT. The page was internally consistent, so
 * the AA walk returned zero failures over a page that was wrong. Legible and
 * correct are different questions.
 *
 * ⚠️ AND THE FILLED CONTROLS WERE A GRADIENT, which a DOM contrast walk is
 * blind to by construction — a `linear-gradient` has no `backgroundColor` to
 * read. White on the light end (`#3b82f6`) gives about 3.7:1, under AA for the
 * 14px/800 label that sat on it. They use `--accent` + `--on-fill` now, which
 * is tuned per theme and passes by construction.
 */

const FILES = [
  "components/refer/ReferPublicPage.tsx",
  "components/refer/ReferrerName.tsx",
  "components/profile/CompanyReferrerPanel.tsx",
  "components/profile/SentReferralsCard.tsx",
];

/** Comments stripped: a docstring that QUOTES a hex is not a hardcoded hex. */
function codeOnly(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("the referrer surfaces are theme-aware", () => {
  it.each(FILES)("%s hardcodes no colour", (file) => {
    const src = codeOnly(file);
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    // The shipped borders and shadows were raw slate alphas.
    expect(src.match(/rgba\(\s*(?:15|230)\s*,/g) ?? []).toEqual([]);
  });

  it.each(FILES)("%s reads from the token set", (file) => {
    expect(codeOnly(file)).toMatch(/var\(--/);
  });

  /**
   * ⚠️ DESIGN.md invariant 7, and the gradient is the harder half: no check
   * that walks the DOM can read a gradient's contrast, so a filled control
   * must use a token pair rather than one.
   */
  it.each(FILES)("%s puts no text on a gradient fill", (file) => {
    expect(codeOnly(file)).not.toMatch(/linear-gradient/);
  });

  /** 100vh jumps on iOS Safari when the toolbar collapses. */
  it("the public page sizes with 100dvh, not 100vh", () => {
    const src = codeOnly("components/refer/ReferPublicPage.tsx");
    expect(src).not.toMatch(/\b100vh\b/);
    expect(src).toContain("100dvh");
  });
});
