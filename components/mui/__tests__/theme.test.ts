import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOKENS, makeTheme, PHONE_BREAKPOINT } from "../theme";

/**
 * The MUI palette duplicates literal colours out of globals.css, because MUI
 * derives hover/focus/disabled states with colour maths that cannot parse
 * `var(--accent)`. Duplication is the right call there, but only if it cannot
 * drift — so this reads globals.css and fails when it does.
 */
/**
 * Resolves a token the way the cascade does: every block that applies to the
 * mode, in source order, later declarations winning.
 *
 * The previous version took the FIRST block whose selector contained
 * `[data-theme="<mode>"]` and read only that. That was two assumptions — that
 * exactly one block matters, and that it is the first — and both were wrong:
 * the shared `:root, [data-theme="dark"], [data-theme="light"]` block matches
 * the same substring, so once the duplicated palette was removed the parser
 * silently started reading a block with no colours in it and compared the MUI
 * palette against `undefined`. A drift guard that reads the wrong block is a
 * guard that cannot see.
 */
function tokensFromCss(mode: "light" | "dark"): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const out: Record<string, string> = {};
  let depth = 0;
  let selStart = 0;
  let bodyStart = 0;
  let applies = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "{") {
      if (depth === 0) {
        const sel = css.slice(selStart, i).replace(/\/\*[\s\S]*?\*\//g, " ");
        // `:root` also paints the mode the app defaults to when nothing is set.
        applies = sel.includes(`[data-theme="${mode}"]`);
        bodyStart = i + 1;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        if (applies) {
          for (const m of css.slice(bodyStart, i).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
            out[m[1]] = m[2].trim();
          }
        }
        selStart = i + 1;
      }
    }
  }
  if (!Object.keys(out).length) throw new Error(`no [data-theme="${mode}"] declarations found`);
  return out;
}

describe("MUI theme tokens track globals.css", () => {
  for (const mode of ["light", "dark"] as const) {
    it(`${mode} palette matches the CSS custom properties`, () => {
      const css = tokensFromCss(mode);
      const t = TOKENS[mode];
      expect(t.bg).toBe(css["bg"]);
      expect(t.surface).toBe(css["surface"]);
      expect(t.surface2).toBe(css["surface2"]);
      expect(t.text).toBe(css["text"]);
      expect(t.muted).toBe(css["muted"]);
      expect(t.border).toBe(css["border"]);
      expect(t.accent).toBe(css["accent"]);
      expect(t.accentHover).toBe(css["accent-h"]);
      // The label on a filled control. MUI needs a literal for the same reason
      // the rest of this palette is duplicated, so it is pinned to the CSS.
      expect(t.onFill).toBe(css["on-fill"]);
    });

    it(`${mode} contrastText is the on-fill colour, not a hardcoded white`, () => {
      // White is 5.19:1 on the light accent and 2.53:1 on the dark one, so a
      // fixed contrastText is readable in exactly one theme.
      expect(makeTheme(mode).palette.primary.contrastText).toBe(TOKENS[mode].onFill);
    });
  }
});

describe("MUI theme encodes the polish invariants", () => {
  it("separates phone from tablet rather than using one not-desktop breakpoint", () => {
    // MUI's default sm is 600, which lands between a 430px phone and a 768px
    // tablet and would put both on the same side of the switch.
    const theme = makeTheme("dark");
    expect(PHONE_BREAKPOINT).toBe(640);
    expect(theme.breakpoints.values.sm).toBe(PHONE_BREAKPOINT);
    expect(theme.breakpoints.values.md).toBeGreaterThan(PHONE_BREAKPOINT);
  });

  it("floors interactive controls at the 44px tap target", () => {
    const theme = makeTheme("dark");
    const button = theme.components?.MuiButton?.styleOverrides?.root as { minHeight?: number };
    const iconButton = theme.components?.MuiIconButton?.styleOverrides?.root as { minHeight?: number; minWidth?: number };
    const menuItem = theme.components?.MuiMenuItem?.styleOverrides?.root as { minHeight?: number };
    expect(button.minHeight).toBeGreaterThanOrEqual(44);
    expect(iconButton.minHeight).toBeGreaterThanOrEqual(44);
    expect(iconButton.minWidth).toBeGreaterThanOrEqual(44);
    expect(menuItem.minHeight).toBeGreaterThanOrEqual(44);
  });

  it("does not pull Roboto, which this app does not load", () => {
    expect(makeTheme("dark").typography.fontFamily).not.toMatch(/Roboto/i);
  });
});

/**
 * A contained Button paints palette.primary.contrastText on primary.main. The
 * accent flips lightness between modes, so a single contrastText cannot serve
 * both: white on dark-mode #58a6ff measured 2.53:1 in a browser, on every MUI
 * button in the app. This asserts the pair, not the literal value, so a future
 * accent change is caught by the same test.
 */
describe("primary contrast", () => {
  const srgb = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = (hex: string) => {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  for (const mode of ["light", "dark"] as const) {
    it(`${mode} button label meets WCAG AA on the primary fill`, () => {
      const theme = makeTheme(mode);
      const fg = theme.palette.primary.contrastText;
      const bg = theme.palette.primary.main;
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
