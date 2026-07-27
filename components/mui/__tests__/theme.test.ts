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
function tokensFromCss(mode: "light" | "dark"): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const block = css.match(new RegExp(`\\[data-theme="${mode}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!block) throw new Error(`no [data-theme="${mode}"] block in globals.css`);
  const out: Record<string, string> = {};
  for (const m of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
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
