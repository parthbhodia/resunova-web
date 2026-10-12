import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The referrer surfaces must follow the theme.
 *
 * ⚠️ WHAT THIS CAUGHT ORIGINALLY. All four files of the shipped feature
 * carried 110 hardcoded colour values and ZERO design tokens, so they rendered
 * byte-identically in light and dark. Measured in a browser rather than
 * inferred: with the app set to dark, the /refer wrapper painted
 * `rgb(248,250,252)` and its h1 `rgb(17,24,39)` — the same pixels as light
 * mode. A dark-mode visitor got a white page, and two of these components
 * mount INSIDE the themed profile hub, so they were light-mode cards dropped
 * onto a dark page.
 *
 * ⚠️ A CONTRAST CHECK COULD NOT SEE IT. The page was internally consistent, so
 * the AA walk returned zero failures over a page that was wrong. Legible and
 * correct are different questions.
 *
 * ⚠️ AND THE FILLED CONTROLS WERE A GRADIENT, which a DOM contrast walk is
 * blind to by construction — a `linear-gradient` has no `backgroundColor` to
 * read. White on the light end (`#3b82f6`) gives about 3.7:1, under AA for the
 * 14px/800 label that sat on it.
 *
 * ⚠️ THE FILE LIST IS AIMED AT MAIN'S REWRITE, NOT THE ORIGINAL. The public
 * referral page was rebuilt onto MUI behind `PublicSiteFrame` + `referUi`
 * while this was open, which tokenized it independently; that version is the
 * one that ships. The invariant outlived the implementation, so this follows
 * the new module set rather than asserting a component tree that is gone.
 *
 * ⚠️ AND IT IMMEDIATELY EARNED ITS KEEP: the viewport case below failed
 * against the rewrite because the shared `pageColumnSx` had reintroduced
 * `100vh`. That is a regression the rewrite could not see, and because the sx
 * is shared chrome it decided the unit for every public surface mounting the
 * frame, not just /refer.
 */

/** Every file that paints any part of the referrer feature. */
const ALL_FILES = [
  "components/refer/ReferPublicPage.tsx",
  "components/refer/FindReferrer.tsx",
  "components/refer/ReferrerRequestForm.tsx",
  "components/refer/referUi.tsx",
  "components/refer/ReferrerName.tsx",
  "components/site/PublicSiteFrame.tsx",
  "components/mui/cssVars.ts",
  "components/profile/CompanyReferrerPanel.tsx",
  "components/profile/SentReferralsCard.tsx",
];

/**
 * The subset that actually carries style. `ReferPublicPage.tsx` is a router
 * now — it chooses a view and holds no colour of its own — so requiring a
 * token of it would be requiring decoration of a file whose job is routing.
 */
const STYLED_FILES = ALL_FILES.filter((f) => f !== "components/refer/ReferPublicPage.tsx");

/** Comments stripped: a docstring that QUOTES a hex is not a hardcoded hex. */
function codeOnly(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("the referrer surfaces are theme-aware", () => {
  it.each(ALL_FILES)("%s hardcodes no colour", (file) => {
    const src = codeOnly(file);
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    // The shipped borders and shadows were raw slate alphas.
    expect(src.match(/rgba\(\s*(?:15|230)\s*,/g) ?? []).toEqual([]);
  });

  it.each(STYLED_FILES)("%s reads from the token set", (file) => {
    expect(codeOnly(file)).toMatch(/var\(--/);
  });

  /**
   * ⚠️ DESIGN.md invariant 7, and the gradient is the harder half: no check
   * that walks the DOM can read a gradient's contrast, so a filled control
   * must use a token pair rather than one.
   */
  it.each(ALL_FILES)("%s puts no text on a gradient fill", (file) => {
    expect(codeOnly(file)).not.toMatch(/linear-gradient/);
  });

  /**
   * `100vh` counts the retracting mobile URL bar, so a full-height column
   * overflows by that bar and the page scrolls with nothing to scroll. Asserted
   * on the shared sx because that is where the unit lives after the rewrite.
   */
  it("the public page shell sizes with 100dvh, not 100vh", () => {
    const src = codeOnly("components/mui/cssVars.ts");
    expect(src).not.toMatch(/\b100vh\b/);
    expect(src).toContain("100dvh");
  });
});
