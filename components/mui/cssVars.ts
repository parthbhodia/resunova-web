/**
 * MUI `sx` that follows `data-theme` through CSS variables.
 *
 * The theme object is a dark snapshot during prerender (see MuiThemeRegistry).
 * Painting with palette literals makes the first frame dark on a light page.
 * These objects are the one place chrome reads --bg, --text, --accent, and
 * the Material shape and elevation tokens.
 */
import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import { FS, FW, LH } from "@/lib/typography";

type Sx = SystemStyleObject<Theme>;

export const pageColumnSx: Sx = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  bgcolor: "var(--bg)",
  color: "var(--text)",
};

export const barSx: Sx = {
  bgcolor: "var(--surface)",
  color: "var(--text)",
  backgroundImage: "none",
  borderBottom: "1px solid var(--border)",
};

export const surfaceCardSx: Sx = {
  bgcolor: "var(--surface)",
  color: "var(--text)",
  backgroundImage: "none",
  border: "1px solid var(--border)",
  borderRadius: "var(--md-shape-lg)",
  boxShadow: "var(--md-elevation-1)",
};

export const filledButtonSx: Sx = {
  bgcolor: "var(--accent)",
  color: "var(--on-fill)",
  "&:hover": { bgcolor: "var(--accent-h)" },
  "&.Mui-disabled": { bgcolor: "var(--accent)", color: "var(--on-fill)", opacity: 0.6 },
};

export const outlineButtonSx: Sx = {
  color: "var(--text)",
  border: "1px solid var(--border)",
};

export const accentLinkSx: Sx = {
  color: "var(--accent)",
  fontWeight: FW.semibold,
  fontSize: FS.bodyLg,
};

export const mutedTextSx: Sx = {
  m: 0,
  color: "var(--muted)",
  fontSize: FS.bodyLg,
  lineHeight: LH.normal,
};

export const fieldSx: Sx = {
  "& .MuiInputLabel-root": { color: "var(--muted)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--accent)" },
  "& .MuiOutlinedInput-root": {
    color: "var(--text)",
    bgcolor: "var(--surface)",
    borderRadius: "var(--md-shape-md)",
    fontSize: FS.bodyLg,
    minHeight: 44,
  },
  "& .MuiOutlinedInput-input": { color: "var(--text)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--text)" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "var(--accent)" },
};

export function navItemSx(current: boolean, idle: "muted" | "text" = "muted"): Sx {
  return {
    color: current ? "var(--accent)" : idle === "text" ? "var(--text)" : "var(--muted)",
    fontWeight: current ? FW.bold : FW.medium,
    whiteSpace: "nowrap",
  };
}
