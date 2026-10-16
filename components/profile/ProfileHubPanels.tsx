"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { EmailPreferencesCard, TailoringModeCard } from "@/components/accountSettingsCards";
import { fieldSx, filledButtonSx, outlineButtonSx } from "@/components/mui/cssVars";
import { HubCard, ProfileGrid, SectionHeader, StatusChip } from "@/components/profile/profileMui";
import { fetchJobFilters, type SavedFilter } from "@/lib/jobFiltersApi";
import { signInWithGoogle } from "@/lib/anonScan";
import { getSupabaseClient } from "@/lib/supabase";
import type { ExtractedProfileState } from "@/lib/resumeExtractorService";
import type { ProfileFormState } from "@/lib/profileStorage";
import { CompanyReferrerPanel } from "@/components/profile/CompanyReferrerPanel";
import { FS, FW, LH } from "@/lib/typography";

function QuietButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="outlined" onClick={onClick} disabled={disabled} sx={outlineButtonSx}>
      {children}
    </Button>
  );
}

export function ReferralsPanel({
  displayName = "",
  title = "",
  linkedin = "",
}: {
  displayName?: string;
  title?: string;
  linkedin?: string;
}) {
  return <CompanyReferrerPanel displayName={displayName} title={title} linkedin={linkedin} />;
}

function describeSavedFilter(filter: SavedFilter): string {
  const parts = [
    filter.filters.search,
    filter.filters.locationText,
    filter.filters.workModels?.join(", "),
    filter.filters.seniorities?.join(", "),
    filter.filters.empType && filter.filters.empType !== "any" ? filter.filters.empType : "",
  ].filter(Boolean);
  return parts.join(" · ") || "Saved Jobs filter set";
}

export function JobAlertsPanel({
  roles,
  locations,
  onEditTargets,
}: {
  roles: string;
  locations: string;
  onEditTargets: () => void;
}) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchJobFilters()
      .then((next) => { if (!cancelled) setFilters(next); })
      .catch(() => { if (!cancelled) setFilters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Stack spacing={2.25}>
      <ProfileGrid>
        <HubCard>
          <SectionHeader
            title="Saved Jobs filters"
            subtitle="These are the same filter sets you save on the Jobs board."
            action={
              <Button component={Link} href="/?view=jobs" variant="contained" sx={filledButtonSx}>
                Open Jobs
              </Button>
            }
          />
          <Stack spacing={1.25} sx={{ p: 2.5 }}>
            {loading ? (
              <Typography sx={{ m: 0, fontSize: FS.bodyLg, color: "text.secondary" }}>Loading saved filters...</Typography>
            ) : filters.length === 0 ? (
              <Typography sx={{ m: 0, fontSize: FS.bodyLg, color: "text.secondary", lineHeight: LH.normal }}>
                No saved filters yet. Set work model, location, and seniority on Jobs, then save the set to reuse it here.
              </Typography>
            ) : (
              filters.map((filter) => (
                <CardActionArea
                  key={filter.id}
                  component={Link}
                  href="/?view=jobs"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "var(--md-shape-md)",
                    p: 2,
                    bgcolor: "action.hover",
                    textAlign: "left",
                  }}
                >
                  <Typography sx={{ fontSize: FS.subhead, fontWeight: FW.extrabold }}>{filter.name}</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: FS.body, color: "text.secondary" }}>{describeSavedFilter(filter)}</Typography>
                </CardActionArea>
              ))
            )}
          </Stack>
        </HubCard>

        <HubCard>
          <SectionHeader
            title="Match preferences"
            subtitle="Jobs ranks against these roles and locations."
          />
          <Stack sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: FS.body, fontWeight: FW.extrabold, color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Target roles
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: FS.subhead, color: "text.primary", lineHeight: LH.snug }}>
              {roles || "No target roles set, so Jobs ranks every role in the corpus."}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: FS.body, fontWeight: FW.extrabold, color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Locations
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: FS.subhead, color: "text.primary", lineHeight: LH.snug }}>
              {locations || "No preferred locations saved."}
            </Typography>
            <Button type="button" variant="text" onClick={onEditTargets} sx={{ mt: 2, alignSelf: "flex-start", fontWeight: FW.bold }}>
              Edit target roles
            </Button>
          </Stack>
        </HubCard>
      </ProfileGrid>

      <EmailPreferencesCard />
    </Stack>
  );
}

function identityProviders(user: { identities?: Array<{ provider?: string }>; app_metadata?: { provider?: string; providers?: string[] } } | null): string[] {
  const fromIdentities = (user?.identities ?? []).map((item) => item.provider).filter(Boolean) as string[];
  const fromMeta = [
    user?.app_metadata?.provider,
    ...(user?.app_metadata?.providers ?? []),
  ].filter(Boolean) as string[];
  return Array.from(new Set([...fromIdentities, ...fromMeta]));
}

export type IntegrationLinks = {
  linkedin: string;
  github: string;
  portfolio: string;
};

export function IntegrationsPanel({
  extracted,
  tailorDefaults,
  accountEmail,
  onChangeLinks,
  onOpenCareerProfile,
}: {
  extracted: ExtractedProfileState;
  tailorDefaults: ProfileFormState;
  accountEmail: string | null;
  onChangeLinks: (next: IntegrationLinks) => void;
  onOpenCareerProfile: () => void;
}) {
  const [providers, setProviders] = useState<string[]>([]);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().auth.getUser().then(({ data }) => {
      if (!cancelled) setProviders(identityProviders(data.user ?? null));
    }).catch(() => {
      if (!cancelled) setProviders([]);
    });
    return () => { cancelled = true; };
  }, []);

  const googleConnected = providers.includes("google");
  const linkedin = extracted.linkedin || tailorDefaults.linkedin;
  const github = extracted.github;
  const portfolio = extracted.portfolio || tailorDefaults.portfolio;
  const resumeConnected = !!(extracted.name || extracted.experience?.length || extracted.skills?.length);

  const patchLink = (key: keyof IntegrationLinks, value: string) => {
    onChangeLinks({ linkedin, github, portfolio, [key]: value });
  };

  return (
    <Stack spacing={2.25}>
      <ProfileGrid>
        <HubCard>
          <SectionHeader
            title="Connected accounts"
            subtitle="Sign-in and profile links Resunova can reuse. Links save with your Career Memory."
          />
          <Stack spacing={1.75} sx={{ p: 2.5 }}>
            <IntegrationRow
              title="Google"
              detail={googleConnected ? `Connected${accountEmail ? ` as ${accountEmail}` : ""}` : "Not connected"}
              connected={googleConnected}
              action={googleConnected ? null : (
                <QuietButton
                  disabled={googleBusy}
                  onClick={() => {
                    setGoogleBusy(true);
                    setGoogleError(null);
                    void signInWithGoogle().then((err) => {
                      setGoogleBusy(false);
                      if (err) setGoogleError(err);
                    });
                  }}
                >
                  {googleBusy ? "Opening Google..." : "Connect Google"}
                </QuietButton>
              )}
            />
            <IntegrationLinkField
              label="LinkedIn"
              value={linkedin}
              placeholder="https://linkedin.com/in/your-name"
              connected={!!linkedin.trim()}
              onChange={(v) => patchLink("linkedin", v)}
            />
            <IntegrationLinkField
              label="GitHub"
              value={github}
              placeholder="https://github.com/your-name"
              connected={!!github.trim()}
              onChange={(v) => patchLink("github", v)}
            />
            <IntegrationLinkField
              label="Portfolio"
              value={portfolio}
              placeholder="https://your-site.com"
              connected={!!portfolio.trim()}
              onChange={(v) => patchLink("portfolio", v)}
            />
            {googleError ? (
              <Typography role="alert" sx={{ m: 0, fontSize: FS.body, color: "error.main" }}>{googleError}</Typography>
            ) : null}
          </Stack>
        </HubCard>

        <HubCard>
          <SectionHeader
            title="Resume source"
            subtitle="Career Memory is the data Jobs, Tailor, and applications reuse."
          />
          <Stack sx={{ p: 2.5 }}>
            <IntegrationRow
              title="Career Memory"
              detail={resumeConnected ? "Resume facts saved to your account" : "Upload a resume to fill contact, experience, and skills"}
              connected={resumeConnected}
              action={
                <QuietButton onClick={onOpenCareerProfile}>
                  {resumeConnected ? "Open Career profile" : "Upload resume"}
                </QuietButton>
              }
            />
            <Typography sx={{ mt: 2, fontSize: FS.body, lineHeight: LH.normal, color: "text.secondary" }}>
              There is no separate LinkedIn scrape or Gmail sync yet. Google sign-in, the URLs on your profile, and the resume you approve are the live integrations.
            </Typography>
          </Stack>
        </HubCard>
      </ProfileGrid>
      <TailoringModeCard />
    </Stack>
  );
}

function IntegrationLinkField({
  label,
  value,
  placeholder,
  connected,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  connected: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: FS.subhead, fontWeight: FW.extrabold }}>{label}</Typography>
        <StatusChip tone={connected ? "green" : "neutral"}>
          {connected ? "Connected" : "Not connected"}
        </StatusChip>
      </Stack>
      <TextField
        fullWidth
        size="small"
        type="url"
        label={`${label} URL`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { maxLength: 300, "aria-label": `${label} URL` },
        }}
        sx={fieldSx}
      />
    </Stack>
  );
}

function IntegrationRow({
  title,
  detail,
  connected,
  action,
}: {
  title: string;
  detail: string;
  connected: boolean;
  action: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: FS.subhead, fontWeight: FW.extrabold }}>{title}</Typography>
          <StatusChip tone={connected ? "green" : "neutral"}>
            {connected ? "Connected" : "Not connected"}
          </StatusChip>
        </Stack>
        <Typography sx={{ mt: 0.5, fontSize: FS.body, color: "text.secondary", wordBreak: "break-word" }}>{detail}</Typography>
      </Box>
      {action}
    </Stack>
  );
}
