/**
 * Material Design 3 tokens.
 *
 * The app builds on shadcn/base-ui primitives, not MUI. Running two component
 * libraries side by side would mean two theme systems, two sets of primitives
 * and a permanent seam between old and new screens — so Material is applied as
 * a token layer over the primitives we already have, and every component keeps
 * its current API.
 *
 * What Material actually specifies, and what this file encodes:
 *   - elevation as six defined levels, not ad-hoc box-shadows
 *   - a state layer (a translucent overlay of the foreground colour) for
 *     hover / focus / pressed, rather than swapping the background colour
 *   - a shape scale
 *   - emphasised easing and a duration scale for motion
 *
 * OFF LIMITS: the résumé paper and anything on the PDF export path
 * (lib/resumeLayout.ts, AnnotatedResumePanel, AnalyzeLiveResumeBody,
 * ResumeEditor, TemplateBuilder/*, CoverLetterPreview). Those sizes and
 * shadows are print metrics that drive Chromium pagination — Material's
 * elevation would render as grey boxes in an exported PDF. See the exemption
 * list in lib/__tests__/typography.test.ts.
 */

/**
 * Elevation. Material expresses depth in dp; on the web that is a two-part
 * shadow (a tight key light and a wider ambient one).
 */
export const ELEVATION = {
  /** Flat against the surface: text fields, filled buttons at rest. */
  0: "none",
  /** Resting cards, the app bar when the page is scrolled to the top. */
  1: "0 1px 2px 0 rgb(0 0 0 / 0.30), 0 1px 3px 1px rgb(0 0 0 / 0.15)",
  /** Hovered card, elevated button. */
  2: "0 1px 2px 0 rgb(0 0 0 / 0.30), 0 2px 6px 2px rgb(0 0 0 / 0.15)",
  /** Menus, raised chips, the FAB at rest. */
  3: "0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px 0 rgb(0 0 0 / 0.30)",
  /** Navigation drawer, hovered FAB. */
  4: "0 6px 10px 4px rgb(0 0 0 / 0.15), 0 2px 3px 0 rgb(0 0 0 / 0.30)",
  /** Modal surfaces that float above everything. */
  5: "0 8px 12px 6px rgb(0 0 0 / 0.15), 0 4px 4px 0 rgb(0 0 0 / 0.30)",
} as const;

export type ElevationLevel = keyof typeof ELEVATION;

/**
 * State layer opacities.
 *
 * Material tints a component by overlaying its FOREGROUND colour at a fixed
 * opacity, instead of defining a separate hover background per variant. One
 * rule covers every colour, including ones added later.
 */
export const STATE_LAYER = {
  hover: 0.08,
  focus: 0.10,
  pressed: 0.10,
  dragged: 0.16,
  /** Disabled content keeps its colour and drops opacity. */
  disabledContent: 0.38,
  disabledContainer: 0.12,
} as const;

/** Shape scale, in px. */
export const SHAPE = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const;

/**
 * Motion. Emphasised easing is the Material default for anything the user
 * initiated; standard easing is for incidental movement.
 */
export const EASING = {
  /** Most transitions: quick out, settle in. */
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  /** Elements entering the screen. */
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  /** Elements leaving the screen. */
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
  /** Large, expressive movement (bottom sheets, full-screen dialogs). */
  emphasised: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

/** Duration scale, in ms. Pick by how far the thing travels. */
export const DURATION = {
  /** Icon state flips, ripples, selection ticks. */
  short: 100,
  /** Hover and focus feedback. Default for small components. */
  medium: 200,
  /** Expanding a panel, opening a menu. */
  long: 300,
  /** Full-screen transitions. */
  extraLong: 500,
} as const;

/** `transition` value for a component's interactive states. */
export function stateTransition(properties: string[] = ["background-color", "box-shadow", "border-color"]): string {
  return properties
    .map((p) => `${p} ${DURATION.medium}ms ${EASING.standard}`)
    .join(", ");
}

/**
 * CSS custom properties for the tokens above.
 *
 * Emitted into globals.css so Tailwind utilities and inline styles read the
 * same values, the way lib/typography.ts pairs with its `--fs-*` vars.
 */
export const MATERIAL_CSS_VARS: Record<string, string> = {
  "--md-elevation-0": ELEVATION[0],
  "--md-elevation-1": ELEVATION[1],
  "--md-elevation-2": ELEVATION[2],
  "--md-elevation-3": ELEVATION[3],
  "--md-elevation-4": ELEVATION[4],
  "--md-elevation-5": ELEVATION[5],
  "--md-state-hover": String(STATE_LAYER.hover),
  "--md-state-focus": String(STATE_LAYER.focus),
  "--md-state-pressed": String(STATE_LAYER.pressed),
  "--md-shape-xs": `${SHAPE.extraSmall}px`,
  "--md-shape-sm": `${SHAPE.small}px`,
  "--md-shape-md": `${SHAPE.medium}px`,
  "--md-shape-lg": `${SHAPE.large}px`,
  "--md-shape-xl": `${SHAPE.extraLarge}px`,
  "--md-easing-standard": EASING.standard,
  "--md-easing-decelerate": EASING.decelerate,
  "--md-easing-accelerate": EASING.accelerate,
  "--md-duration-short": `${DURATION.short}ms`,
  "--md-duration-medium": `${DURATION.medium}ms`,
  "--md-duration-long": `${DURATION.long}ms`,
};
