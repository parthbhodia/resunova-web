/**
 * MUI theme mapped onto the app's existing design tokens.
 *
 * The app themes itself with CSS custom properties switched by a
 * `[data-theme]` attribute on <html> (see AppShell). MUI cannot consume those
 * directly: it does real colour maths internally — hover, focus, ripple,
 * disabled and outline states are all derived with alpha()/lighten() — and
 * those parsers need a literal colour, not `var(--accent)`. A palette built
 * from CSS variables renders, then produces black hover states the first time
 * MUI tries to lighten one.
 *
 * So the literal values are duplicated here, per mode, and kept in sync with
 * globals.css by the test in components/mui/__tests__/theme.test.ts — which
 * reads globals.css and fails if a token drifts. Duplication with a test
 * beats a var() indirection that silently degrades.
 *
 * Shape/typography come from the app's own ladders (lib/typography.ts and the
 * --radius tokens) so an MUI control sits next to a shadcn one without
 * announcing itself.
 */
import { createTheme, type Theme } from "@mui/material/styles";
import { FS, FW } from "@/lib/typography";

export type ThemeMode = "light" | "dark";

/** Literal mirrors of globals.css. Pinned by theme.test.ts. */
export const TOKENS = {
  dark: {
    bg: "#0d1117",
    surface: "#161b22",
    surface2: "#1e2329",
    text: "#f0f6fc",
    muted: "rgba(240,246,252,0.74)",
    border: "rgba(230,237,243,0.12)",
    accent: "#58a6ff",
    accentHover: "#79c0ff",
  },
  light: {
    bg: "#f7f9fc",
    surface: "#ffffff",
    surface2: "#eef3f8",
    text: "#0f172a",
    muted: "#475569",
    border: "rgba(15,23,42,0.14)",
    accent: "#0969da",
    accentHover: "#0559c7",
  },
} as const;

/** Matches --radius / --radius-lg in globals.css. */
const RADIUS = 8;

/**
 * The one number that decides whether a phone gets the phone layout. MUI's
 * default `sm` is 600, which lands between a large phone (430) and a small
 * tablet (768) and would put both on the same side of the breakpoint — the
 * exact "one threshold for not-desktop" mistake this work exists to fix.
 */
export const PHONE_BREAKPOINT = 640;

export function makeTheme(mode: ThemeMode): Theme {
  const t = TOKENS[mode];

  return createTheme({
    breakpoints: {
      values: { xs: 0, sm: PHONE_BREAKPOINT, md: 1024, lg: 1280, xl: 1536 },
    },
    palette: {
      mode,
      // contrastText is per-mode because the accent flips lightness: #0969da
      // in light takes white (5.19:1), but dark's #58a6ff is a LIGHT blue and
      // white on it measures 2.53:1 — a WCAG AA failure on every contained
      // Button in dark mode. Dark ink on it is ~8:1. Pinned by theme.test.ts.
      primary: {
        main: t.accent,
        dark: t.accentHover,
        contrastText: mode === "dark" ? t.bg : "#ffffff",
      },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
    },
    shape: { borderRadius: RADIUS },
    typography: {
      // Inherit the app's self-hosted font stack rather than pulling Roboto,
      // which MUI defaults to and which is not loaded here.
      fontFamily: "var(--font-sans), system-ui, sans-serif",
      button: { textTransform: "none", fontWeight: FW.semibold, fontSize: FS.body },
      body1: { fontSize: FS.body },
      body2: { fontSize: FS.small },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            // 44px is the tap-target floor (dimension 17). MUI's default
            // "medium" button is ~36px, which is a mouse target.
            minHeight: 44,
            paddingInline: 14,
          },
          // Icon-only buttons must be square at the same floor.
          sizeSmall: { minHeight: 44, paddingInline: 10 },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
      },
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 48, textTransform: "none", fontWeight: FW.semibold },
        },
      },
      MuiMenuItem: { styleOverrides: { root: { minHeight: 44 } } },
      MuiTooltip: {
        defaultProps: { enterDelay: 200, enterTouchDelay: 0 },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "transparent" },
        styleOverrides: {
          root: {
            background: t.surface,
            borderBottom: `1px solid ${t.border}`,
            backgroundImage: "none",
          },
        },
      },
    },
  });
}
