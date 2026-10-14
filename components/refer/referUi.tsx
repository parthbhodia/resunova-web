"use client";

/** Shared MUI pieces for the public referral page. Screens compose these; they do not restyle them. */

import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { ReferrerName } from "@/components/refer/ReferrerName";
import { accentLinkSx, fieldSx, filledButtonSx, mutedTextSx, surfaceCardSx } from "@/components/mui/cssVars";
import { signInWithGoogle } from "@/lib/anonScan";
import { referrerInitials } from "@/lib/companyReferrers";
import { FS, FW, LH } from "@/lib/typography";

function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.3C41.4 36.2 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/**
 * Unsigned /refer surface. Does not list companies or people. The only action
 * is Continue with Google so the directory stays behind auth.
 */
export function ReferGoogleGate({
  heading = "h1",
  title = "Get employee referrals",
  lede = "Sign in with Google to browse companies where someone is open to refer. We never show who is ready until you are signed in.",
}: {
  heading?: "h1" | "h2";
  title?: string;
  lede?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ mt: heading === "h2" ? 4.5 : 0 }}>
      <Box>
        <ReferTitle component={heading}>{title}</ReferTitle>
        <ReferLede>{lede}</ReferLede>
      </Box>
      <Card elevation={0} sx={{ ...surfaceCardSx, p: 3, maxWidth: 480 }}>
        <Stack spacing={1.5}>
          <Typography sx={{ m: 0, fontSize: FS.bodyLg, color: "var(--muted)", lineHeight: LH.normal }}>
            Continue with Google to unlock the referral directory and ask for a referral.
          </Typography>
          <Button
            type="button"
            variant="contained"
            disabled={busy}
            onClick={() => void onGoogle()}
            startIcon={<GoogleGlyph />}
            sx={{ ...filledButtonSx, alignSelf: "flex-start", minWidth: 220 }}
          >
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
          {error ? <ReferAlert>{error}</ReferAlert> : null}
        </Stack>
      </Card>
    </Stack>
  );
}

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
