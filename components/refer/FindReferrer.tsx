"use client";

import { useState } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import {
  AccentLink,
  OpenChip,
  ReferAlert,
  ReferField,
  ReferLede,
  ReferNote,
  ReferTitle,
  ReferrerCard,
} from "@/components/refer/referUi";
import { surfaceCardSx } from "@/components/mui/cssVars";
import { REFERRER_LIMITS, referrerPublicPath, type OpenReferralCompany } from "@/lib/companyReferrers";
import { useCompanyOpenReferrers, useOpenReferralCompanies } from "@/hooks/usePublicReferral";
import { FS, FW, LH } from "@/lib/typography";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

/**
 * The directory is public. Anonymous visitors browse companies and the people
 * open to refer; the sign-in ask lives on the action (publishing a profile or
 * sending a request), not on the page.
 */
export function FindReferrer({ heading = "h1" }: { heading?: "h1" | "h2" }) {
  return <CompanyDirectory heading={heading} />;
}

function CompanyDirectory({ heading }: { heading: "h1" | "h2" }) {
  const directory = useOpenReferralCompanies(true);
  const [selectedCompany, setSelectedCompany] = useState<OpenReferralCompany | null>(null);
  const people = useCompanyOpenReferrers(selectedCompany?.companySlug ?? null);
  const showFilter = directory.status === "loading"
    || directory.status === "ready"
    || directory.status === "error"
    || directory.companies.length > 0
    || directory.query.trim().length > 0;

  return (
    <Stack spacing={2.5} sx={{ mt: heading === "h2" ? 4.5 : 0 }}>
      <Box>
        {selectedCompany ? (
          <>
            <Button type="button" onClick={() => setSelectedCompany(null)} sx={{ mb: 1, px: 0, minWidth: 0 }}>
              ← All companies
            </Button>
            <ReferTitle component={heading}>People who can refer you at {selectedCompany.company}</ReferTitle>
            <ReferLede>Choose someone to ask. They decide whether they can submit a referral for you.</ReferLede>
          </>
        ) : (
          <>
            <ReferTitle component={heading}>Ask an employee for a referral</ReferTitle>
            <ReferLede>
              Find an open referrer by company, or <AccentLink href="/profile?tab=referrals">publish your profile</AccentLink>.
            </ReferLede>
          </>
        )}
      </Box>

      {!selectedCompany && showFilter ? (
        <ReferField
          label="Filter companies"
          placeholder="e.g. Stripe"
          value={directory.query}
          maxLength={REFERRER_LIMITS.company}
          onChange={directory.setQuery}
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      {!selectedCompany && directory.status === "loading" ? <ReferNote>Loading companies...</ReferNote> : null}
      {!selectedCompany && directory.status === "error" && directory.error ? <ReferAlert>{directory.error}</ReferAlert> : null}

      {!selectedCompany && directory.status === "empty" && directory.companies.length === 0 ? <BeTheFirst /> : null}

      {!selectedCompany && directory.status === "empty" && directory.companies.length > 0 ? (
        <ReferNote>No companies match that filter.</ReferNote>
      ) : null}

      {!selectedCompany && directory.filtered.length > 0 ? (
        <Box
          component="ul"
          aria-label="Companies with open referrers"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          {directory.filtered.map((company) => (
            <Box component="li" key={company.companySlug} sx={{ minWidth: 0 }}>
              <CompanyTile company={company} onSelect={() => setSelectedCompany(company)} />
            </Box>
          ))}
        </Box>
      ) : null}

      {selectedCompany && people.status === "loading" ? <ReferNote>Loading referrers...</ReferNote> : null}
      {selectedCompany && people.status === "error" && people.error ? <ReferAlert>{people.error}</ReferAlert> : null}
      {selectedCompany && people.status === "empty" ? (
        <ReferNote>No open referral profiles at this company right now. Browse companies or try again later.</ReferNote>
      ) : null}
      {selectedCompany && people.status === "ready" ? (
        <Stack component="ul" aria-label={`Open referrers at ${selectedCompany.company}`} spacing={1.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {people.referrers.map((referrer) => (
            <Box component="li" key={referrer.id}>
              <ReferrerCard
                name={referrer.displayName}
                count={referrer.referredCount ?? 0}
                href={referrerPublicPath(referrer.slug)}
                ariaLabel={`Ask ${referrer.displayName} for a referral at ${referrer.company}`}
                badge={<OpenChip />}
              >
                <Typography sx={{ mt: 0.5, fontSize: FS.body, color: "var(--muted)" }}>
                  {referrer.title}{referrer.bio ? ` · ${referrer.bio}` : ""}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: FS.small, fontWeight: FW.semibold, color: "var(--accent)" }}>
                  Ask for a referral →
                </Typography>
              </ReferrerCard>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

function BeTheFirst() {
  return (
    <Card elevation={0} sx={{ ...surfaceCardSx, p: 3 }}>
      <Typography component="h2" sx={{ m: 0, fontSize: FS.title, fontWeight: FW.bold, color: "var(--text)" }}>
        Be the first
      </Typography>
      <Typography sx={{ mt: 1, fontSize: FS.bodyLg, color: "var(--muted)", lineHeight: LH.normal, maxWidth: "65ch" }}>
        No one has published an open referrer profile yet. If you can refer candidates at your company, sign up from Profile and your company will show up here.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <AccentLink href="/profile?tab=referrals">Publish your referrer profile</AccentLink>
      </Box>
    </Card>
  );
}

function CompanyTile({ company, onSelect }: { company: OpenReferralCompany; onSelect: () => void }) {
  const openLabel = company.openCount === 1 ? "1 open referrer" : `${company.openCount} open referrers`;
  const referredLabel = company.referredCount === 1 ? "1 referred" : `${company.referredCount} referred`;

  return (
    <Card
      elevation={0}
      sx={{
        ...surfaceCardSx,
        height: "100%",
        transition: "box-shadow var(--md-duration-medium) var(--md-easing-standard), transform var(--md-duration-medium) var(--md-easing-standard)",
        "@media (prefers-reduced-motion: no-preference)": {
          "&:hover": {
            boxShadow: "var(--md-elevation-3)",
            transform: "translateY(-2px)",
          },
        },
      }}
    >
      <Button
        type="button"
        onClick={onSelect}
        aria-label={`View ${company.openCount} open referrers at ${company.company}`}
        sx={{ width: "100%", justifyContent: "flex-start", textAlign: "left", color: "inherit", p: 0, borderRadius: "inherit" }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", p: 2, width: "100%" }}>
          <CompanyLogo
            company={company.company}
            companyDomain={company.companyDomain}
            slug={company.companySlug}
            size={48}
            radius={12}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="h2"
              sx={{
                m: 0,
                fontSize: FS.subhead,
                fontWeight: FW.bold,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {company.company}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: FS.small, color: "var(--muted)", lineHeight: LH.snug }}>
              {openLabel}
              {" · "}
              {referredLabel}
            </Typography>
          </Box>
          <Typography aria-hidden sx={{ fontSize: FS.title, color: "var(--accent)" }}>→</Typography>
        </Stack>
      </Button>
    </Card>
  );
}
