"use client";

/** Shared MUI pieces for the public referral page. Screens compose these; they do not restyle them. */

import type { ReactNode } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { accentLinkSx, fieldSx, mutedTextSx, surfaceCardSx } from "@/components/mui/cssVars";
import { referrerInitials } from "@/lib/companyReferrers";
import { FS, FW, LH } from "@/lib/typography";

export function ReferTitle({ component = "h1", children }: { component?: "h1" | "h2"; children: ReactNode }) {
  return (
    <Typography
      component={component}
      sx={{
        m: 0,
        fontSize: component === "h1" ? FS.display : FS.h2,
        fontWeight: FW.bold,
        letterSpacing: "-0.03em",
        lineHeight: LH.tight,
        color: "var(--text)",
      }}
    >
      {children}
    </Typography>
  );
}

export function ReferLede({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ mt: 1.5, maxWidth: 560, color: "var(--muted)", fontSize: FS.subhead, lineHeight: LH.normal }}>
      {children}
    </Typography>
  );
}

export function ReferNote({ children }: { children: ReactNode }) {
  return <Typography sx={mutedTextSx}>{children}</Typography>;
}

export function ReferAlert({ children }: { children: ReactNode }) {
  return (
    <Typography role="alert" sx={{ m: 0, color: "var(--red)", fontSize: FS.body }}>
      {children}
    </Typography>
  );
}

export function AccentLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <Link href={href} color="inherit" target="_blank" rel="noreferrer" underline="hover" sx={accentLinkSx}>
        {children}
      </Link>
    );
  }
  return (
    <Link component={NextLink} href={href} color="inherit" underline="hover" sx={accentLinkSx}>
      {children}
    </Link>
  );
}

export function ReferField({
  label,
  value,
  onChange,
  maxLength,
  type,
  placeholder,
  multiline = false,
  sx,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <TextField
      label={label}
      value={value}
      type={type}
      placeholder={placeholder}
      fullWidth
      multiline={multiline}
      minRows={multiline ? 4 : undefined}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        inputLabel: placeholder ? { shrink: true } : undefined,
        htmlInput: { maxLength },
      }}
      sx={[fieldSx, ...(sx ? [sx] : [])] as SxProps<Theme>}
    />
  );
}

export function OpenChip() {
  return (
    <Chip
      label="Open"
      size="small"
      sx={{
        height: 22,
        bgcolor: "var(--green-bg)",
        color: "var(--green-ink)",
        fontWeight: FW.bold,
        fontSize: FS.caption,
      }}
    />
  );
}

export function ReferrerCard({
  name,
  count,
  href,
  ariaLabel,
  avatarSize = 44,
  badge,
  children,
}: {
  name: string;
  count: number;
  href?: string;
  ariaLabel?: string;
  avatarSize?: number;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const body = (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", p: avatarSize > 48 ? 3 : 2 }}>
      <Avatar
        aria-hidden
        sx={{
          width: avatarSize,
          height: avatarSize,
          bgcolor: "var(--surface2)",
          color: "var(--text)",
          fontWeight: FW.bold,
          fontSize: avatarSize > 48 ? FS.h2 : FS.bodyLg,
        }}
      >
        {referrerInitials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography
            component="span"
            sx={{ fontWeight: FW.bold, fontSize: avatarSize > 48 ? FS.title : FS.subhead, color: "var(--text)" }}
          >
            <ReferrerName name={name} count={count} />
          </Typography>
          {badge}
        </Stack>
        {children}
      </Box>
    </Stack>
  );

  if (!href) {
    return (
      <Card elevation={0} sx={surfaceCardSx}>
        {body}
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={surfaceCardSx}>
      <CardActionArea component={NextLink} href={href} aria-label={ariaLabel} sx={{ color: "inherit" }}>
        {body}
      </CardActionArea>
    </Card>
  );
}
