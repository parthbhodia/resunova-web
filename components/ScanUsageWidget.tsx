"use client";

import { useEffect, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import type { ThemeMode } from "@/components/mui/theme";
import { hubCardSx } from "@/components/profile/profileMui";
import { apiFetch } from "@/lib/apiClient";
import { FS, FW, LH } from "@/lib/typography";

type ScanUsageStatus = {
  enforced: boolean;
  unlimited?: boolean;
  /** "pro" | "institution" for unlimited tiers; absent on the metered tier. */
  plan?: string | null;
  allowed?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
};

export function ScanUsageWidget({ mode }: { mode?: ThemeMode } = {}) {
  const [resumeStatus, setResumeStatus] = useState<ScanUsageStatus | null>(null);
  const [prepStatus, setPrepStatus] = useState<ScanUsageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [respResume, respPrep] = await Promise.all([
          apiFetch("/api/scan-limit-status"),
          apiFetch("/api/interview-prep/limit-status"),
        ]);

        const [dataResume, dataPrep] = await Promise.all([
          respResume.json() as Promise<ScanUsageStatus>,
          respPrep.json() as Promise<ScanUsageStatus>
        ]);

        if (!cancelled) {
          setResumeStatus(dataResume);
          setPrepStatus(dataPrep);
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <MuiThemeRegistry mode={mode}>
        <UsageCard>
          <Typography sx={{ fontSize: FS.small, color: "text.secondary" }}>
            Checking your usage quotas…
          </Typography>
        </UsageCard>
      </MuiThemeRegistry>
    );
  }

  const badge =
    resumeStatus?.plan === "pro" || prepStatus?.plan === "pro"
      ? "Pro"
      : resumeStatus?.plan === "admin" || prepStatus?.plan === "admin"
        ? "Admin"
        : resumeStatus?.plan === "institution" || prepStatus?.plan === "institution"
          ? "University"
          : resumeStatus?.unlimited || prepStatus?.unlimited
            ? "Unlimited"
            : "Free";

  return (
    <MuiThemeRegistry mode={mode}>
      <UsageCard badge={badge}>
        <Box sx={{ mb: 2.5 }}>
          <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: FW.semibold, color: "text.primary", mb: 1 }}>
            Résumé Scans
          </Typography>
          {renderUsageBar(resumeStatus, "résumé scans")}
        </Box>
        <Box>
          <Typography component="h3" sx={{ fontSize: FS.body, fontWeight: FW.semibold, color: "text.primary", mb: 1 }}>
            Interview Prep
          </Typography>
          {renderUsageBar(prepStatus, "interview prep parses")}
        </Box>
      </UsageCard>
    </MuiThemeRegistry>
  );
}

function UsageCard({ badge, children }: { badge?: string; children: ReactNode }) {
  return (
    <Card elevation={0} sx={hubCardSx(true)}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", justifyContent: "space-between", px: 3, pt: 3 }}
      >
        <Typography component="h2" sx={{ m: 0, fontSize: FS.bodyLg, fontWeight: FW.bold, letterSpacing: "-0.02em" }}>
          Plan & usage
        </Typography>
        {badge ? (
          <Chip
            label={badge}
            size="small"
            sx={{
              fontWeight: FW.bold,
              fontSize: FS.micro,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              height: 24,
              bgcolor: "var(--amber-bg)",
              color: "var(--amber-ink, var(--amber))",
            }}
          />
        ) : null}
      </Stack>
      <CardContent sx={{ pt: 2 }}>{children}</CardContent>
    </Card>
  );
}

function renderUsageBar(status: ScanUsageStatus | null, label: string) {
  if (!status || !status.enforced) {
    return (
      <Typography sx={{ fontSize: FS.small, color: "text.secondary", lineHeight: LH.normal }}>
        Unlimited {label}
      </Typography>
    );
  }

  if (status.unlimited) {
    return (
      <Typography sx={{ fontSize: FS.small, color: "text.secondary", lineHeight: LH.normal }}>
        {status.plan === "pro"
          ? `Unlimited ${label}: included with Pro.`
          : status.plan === "institution"
            ? `Unlimited ${label}: included with your university account.`
            : status.plan === "admin"
              ? `Unlimited ${label}: admin pass.`
              : `Unlimited ${label} on your current plan.`}
      </Typography>
    );
  }

  const limit = status.limit ?? 3;
  const used = status.used ?? 0;
  const remaining = status.remaining ?? Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <>
      <Box
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-label={`${used} of ${limit} scans used today`}
      >
        <LinearProgress
          variant="determinate"
          value={pct}
          color={remaining === 0 ? "error" : "primary"}
          aria-hidden
          sx={{ height: 6, borderRadius: 99, mb: 1 }}
        />
      </Box>
      <Typography sx={{ fontSize: FS.caption, color: "text.secondary" }}>
        {remaining === 0
          ? `0 of ${limit} ${label} remaining today`
          : `${remaining} of ${limit} ${label} remaining today`}
        {" · "}Resets at midnight UTC
      </Typography>
    </>
  );
}
