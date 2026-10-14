"use client";

/**
 * Shared MUI chrome for the Profile hub.
 *
 * Cards paint from theme.palette.background.paper so a light ThemeProvider
 * keeps Plan & usage white next to Application profile. Hover raises elevation
 * (and lifts 2px unless the user prefers reduced motion). Press is MUI's
 * ripple on Buttons, Tabs, Accordion summaries, and CardActionArea.
 */
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { FS, FW, LH } from "@/lib/typography";

export const profilePageSx: SxProps<Theme> = {
  minHeight: "100vh",
  bgcolor: "background.default",
  color: "text.primary",
  colorScheme: "light",
  // Leftover settings cards (email prefs, tailoring mode) still read CSS vars.
  "--surface": "#ffffff",
  "--surface2": "#eef3f8",
  "--surface3": "#dbe4ee",
  "--border": "rgba(15,23,42,0.14)",
  "--text": "#0f172a",
  "--muted": "#475569",
  "--dim": "#64748b",
  "--amber": "#b45309",
  "--amber-bg": "rgba(180,83,9,0.12)",
  "--amber-ink": "#92400e",
  "--green-bg": "rgba(5,150,105,0.12)",
  "--green-ink": "#047857",
  "--accent": "#0969da",
  "--accent-h": "#0559c7",
  "--accent-bg": "rgba(9,105,218,0.11)",
  "--accent-ink": "#0559c7",
  "--on-fill": "#ffffff",
  "--card": "#ffffff",
  "--card-foreground": "#0f172a",
  "--foreground": "#0f172a",
  "--muted-foreground": "#475569",
};

export const hubCardSx = (interactive = true): SxProps<Theme> => ({
  height: "100%",
  bgcolor: "background.paper",
  color: "text.primary",
  backgroundImage: "none",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "var(--md-shape-lg)",
  boxShadow: "var(--md-elevation-1)",
  overflow: "hidden",
  transition: interactive
    ? "box-shadow var(--md-duration-medium) var(--md-easing-standard), transform var(--md-duration-medium) var(--md-easing-standard)"
    : undefined,
  "@media (prefers-reduced-motion: no-preference)": interactive
    ? {
        "&:hover": {
          boxShadow: "var(--md-elevation-3)",
          transform: "translateY(-2px)",
        },
        "&:active": { transform: "translateY(0)" },
      }
    : undefined,
  "@media (prefers-reduced-motion: reduce)": interactive
    ? {
        "&:hover": { boxShadow: "var(--md-elevation-2)" },
      }
    : undefined,
});

export function HubCard({
  children,
  interactive = true,
  sx,
}: {
  children: ReactNode;
  interactive?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Card elevation={0} sx={[hubCardSx(interactive), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Card>
  );
}

export function ProfileGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2.25,
        alignItems: "stretch",
        "& > *": { minWidth: 0 },
      }}
    >
      {children}
    </Box>
  );
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2.25, sm: 3 },
        pt: 3,
        pb: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", minWidth: 0 }}>
        {icon ? (
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: "var(--md-shape-md)",
              display: "grid",
              placeItems: "center",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ m: 0, fontSize: FS.title, fontWeight: FW.bold, letterSpacing: "-0.02em", color: "text.primary" }}>
            {title}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: FS.bodyLg, color: "text.secondary", lineHeight: LH.snug }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

const CHIP_TONE = {
  neutral: { bgcolor: "action.hover", color: "text.secondary" },
  green: { bgcolor: "var(--green-bg)", color: "var(--green-ink)" },
  amber: { bgcolor: "var(--amber-bg)", color: "var(--amber-ink, var(--amber))" },
  blue: { bgcolor: "var(--accent-bg)", color: "var(--accent-ink)" },
} as const;

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_TONE;
}) {
  return (
    <Chip
      size="small"
      label={children}
      sx={{
        ...CHIP_TONE[tone],
        fontWeight: FW.bold,
        fontSize: FS.caption,
        height: 24,
      }}
    />
  );
}
