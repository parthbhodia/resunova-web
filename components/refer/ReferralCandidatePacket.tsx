"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { makeTheme } from "@/components/mui/theme";
import { AccentLink, ReferAlert, ReferLede, ReferNote, ReferTitle } from "@/components/refer/referUi";
import { filledButtonSx, mutedTextSx, surfaceCardSx } from "@/components/mui/cssVars";
import {
  REFERRAL_REQUEST_STATUS_LABELS,
  fetchReferralRequestById,
  safeHttpUrl,
  signedReferralResumeUrl,
  type CompanyReferralRequest,
} from "@/lib/companyReferrers";
import { getSupabaseClient } from "@/lib/supabase";
import { FS, FW, LH } from "@/lib/typography";

const packetTheme = makeTheme("light");

type LoadState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; request: CompanyReferralRequest };

function PacketRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography sx={{ fontSize: FS.caption, fontWeight: FW.semibold, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: FS.bodyLg, color: "var(--text)", lineHeight: LH.normal }}>{value}</Typography>
    </Stack>
  );
}

export default function ReferralCandidatePacket() {
  const searchParams = useSearchParams();
  const requestId = (searchParams?.get("r") || "").trim();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!requestId) {
        setState({ status: "missing" });
        return;
      }
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        if (cancelled) return;
        if (!data.session?.user) {
          setState({ status: "signed_out" });
          return;
        }
        const loaded = await fetchReferralRequestById(requestId);
        if (cancelled) return;
        if (!loaded.ok) {
          setState({ status: "error", message: loaded.error });
          return;
        }
        if (!loaded.data) {
          setState({ status: "missing" });
          return;
        }
        setState({ status: "ready", request: loaded.data });
      } catch {
        if (!cancelled) setState({ status: "error", message: "Could not load this candidate profile. Try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const openResume = async (path: string) => {
    const url = await signedReferralResumeUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const body = (() => {
    if (state.status === "loading") {
      return <ReferNote>Loading candidate profile…</ReferNote>;
    }
    if (state.status === "signed_out") {
      return (
        <Stack spacing={2}>
          <ReferTitle>Sign in to view this profile</ReferTitle>
          <ReferLede>Only the referrer who received this ask, or the candidate who sent it, can open the packet.</ReferLede>
          <AccentLink href="/refer/">Back to referrals</AccentLink>
        </Stack>
      );
    }
    if (state.status === "missing") {
      return (
        <Stack spacing={2}>
          <ReferTitle>Profile not found</ReferTitle>
          <ReferLede>This request may have been removed, or you do not have access.</ReferLede>
          <AccentLink href="/profile?tab=referrals">Back to your inbox</AccentLink>
        </Stack>
      );
    }
    if (state.status === "error") {
      return (
        <Stack spacing={2}>
          <ReferTitle>Could not load profile</ReferTitle>
          <ReferAlert>{state.message}</ReferAlert>
          <AccentLink href="/profile?tab=referrals">Back to your inbox</AccentLink>
        </Stack>
      );
    }

    const row = state.request;
    const linkedinHref = safeHttpUrl(row.candidateLinkedin);
    return (
      <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
        <AccentLink href="/profile?tab=referrals">Back to inbox</AccentLink>
        <BoxHeader name={row.candidateName} status={REFERRAL_REQUEST_STATUS_LABELS[row.status]} />
        <Card elevation={0} sx={{ ...surfaceCardSx, p: 3 }}>
          <Stack spacing={2}>
            {row.candidateHeadline ? <PacketRow label="Headline" value={row.candidateHeadline} /> : null}
            <PacketRow label="Role they want" value={row.role || "—"} />
            <PacketRow label="Email" value={row.candidateEmail || "—"} />
            {row.candidatePhone ? <PacketRow label="Phone" value={row.candidatePhone} /> : null}
            {row.candidateYearsExperience != null ? (
              <PacketRow
                label="Experience"
                value={`${row.candidateYearsExperience} year${row.candidateYearsExperience === 1 ? "" : "s"}`}
              />
            ) : null}
            {row.notes ? <PacketRow label="Note" value={row.notes} /> : null}
            <Stack direction="row" spacing={1.5} sx={{ pt: 0.5, flexWrap: "wrap" }}>
              {linkedinHref ? (
                <Button component="a" href={linkedinHref} target="_blank" rel="noreferrer" variant="outlined" sx={{ textTransform: "none" }}>
                  LinkedIn
                </Button>
              ) : null}
              {row.resumePdfPath ? (
                <Button type="button" variant="contained" sx={filledButtonSx} onClick={() => void openResume(row.resumePdfPath!)}>
                  Open resume PDF
                </Button>
              ) : null}
            </Stack>
            <Typography sx={{ ...mutedTextSx, fontSize: FS.small }}>
              Snapshot from when they asked. This is not a live read of their full Resunova account.
            </Typography>
          </Stack>
        </Card>
      </Stack>
    );
  })();

  return (
    <ThemeProvider theme={packetTheme}>
      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>{body}</Box>
    </ThemeProvider>
  );
}

function BoxHeader({ name, status }: { name: string; status: string }) {
  return (
    <Stack spacing={0.75}>
      <ReferTitle>{name}</ReferTitle>
      <Typography sx={{ fontSize: FS.body, color: "var(--muted)" }}>
        Candidate profile · {status}
      </Typography>
    </Stack>
  );
}
