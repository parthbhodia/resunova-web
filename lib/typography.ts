/**
 * The type scale — one ladder, one source of truth.
 *
 * Most of this app styles text with inline `fontSize:` numbers rather than
 * Tailwind classes, which is how the codebase drifted to ~30 distinct sizes
 * (including half-pixel steps like 12.5 and 13.5 that no design intends).
 * A tight, named ladder is what makes an interface read as deliberate.
 *
 * RULES
 *  1. New UI picks a step from `FS` — never a raw number, never a fraction.
 *  2. Pair it with a weight from `FW` and, for multi-line text, `LH`.
 *  3. The one exception is the résumé paper (`lib/resumeLayout.ts`): those
 *     sizes are print metrics that drive Chromium PDF pagination, so they are
 *     owned there and must NOT be snapped to this ladder.
 *
 * The same steps exist as CSS custom properties in `globals.css`
 * (`--font-size-*`) for stylesheet call sites.
 */

export const FS = {
  /** 10 — dense badges, chips, table meta. Smallest size we ship. */
  micro: 10,
  /** 11 — secondary meta, captions, sidebar labels. */
  caption: 11,
  /** 12 — dense UI text, compact controls. */
  small: 12,
  /** 13 — default body text in app chrome. */
  body: 13,
  /** 14 — comfortable body, form inputs, primary buttons. */
  bodyLg: 14,
  /** 16 — card titles, section subheads. */
  subhead: 16,
  /** 18 — panel titles. */
  title: 18,
  /** 20 — page section headings. */
  h3: 20,
  /** 24 — page headings. */
  h2: 24,
  /** 30 — view headlines. */
  h1: 30,
  /** 36 — marketing display. */
  display: 36,
  /** 48 — hero display. */
  displayLg: 48,
} as const;

export type FontSizeToken = keyof typeof FS;

export const FW = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const LH = {
  tight: 1.2,
  snug: 1.4,
  normal: 1.6,
  relaxed: 1.8,
} as const;

/** Every step, ascending — used by `snapFontSize` and by tests. */
export const FONT_SIZE_STEPS: readonly number[] = Object.values(FS).sort((a, b) => a - b);

/**
 * Nearest step on the ladder. Ties round up, so a half-pixel size never
 * shrinks (12.5 → 13). Exported so a lint/codemod can verify the snap rather
 * than trusting a one-off sed.
 */
export function snapFontSize(px: number): number {
  let best = FONT_SIZE_STEPS[0];
  let bestDelta = Infinity;
  for (const step of FONT_SIZE_STEPS) {
    const delta = Math.abs(step - px);
    // `<` keeps the first (smaller) step on an exact tie; `step > px` breaks
    // ties upward, which is what we want for half-pixel sizes.
    if (delta < bestDelta || (delta === bestDelta && step > px)) {
      best = step;
      bestDelta = delta;
    }
  }
  return best;
}
