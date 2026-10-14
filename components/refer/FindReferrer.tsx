"use client";

import CompanyLogo from "@/components/CompanyLogo";
import {
  AccentLink,
  ReferAlert,
  ReferField,
  ReferGoogleGate,
  ReferLede,
  ReferNote,
  ReferTitle,
} from "@/components/refer/referUi";
import { surfaceCardSx } from "@/components/mui/cssVars";
import { REFERRER_LIMITS, type OpenReferralCompany } from "@/lib/companyReferrers";
import { useOpenReferralCompanies, useReferSession } from "@/hooks/usePublicReferral";
import { FS, FW, LH } from "@/lib/typography";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function FindReferrer({ heading = "h1" }: { heading?: "h1" | "h2" }) {
  const session = useReferSession();

  if (session.status === "loading") {
    return <ReferNote>Loading...</ReferNote>;
  }

  if (session.status === "signed_out") {
    return <ReferGoogleGate heading={heading} />;
  }

  return <SignedInCompanyDirectory heading={heading} />;
}

function SignedInCompanyDirectory({ heading }: { heading: "h1" | "h2" }) {
  const directory = useOpenReferralCompanies(true);
  const showFilter = directory.status === "loading"
    || directory.status === "ready"
    || directory.status === "error"
    || directory.companies.length > 0
    || directory.query.trim().length > 0;

  return (
    <Stack spacing={2.5} sx={{ mt: heading === "h2" ? 4.5 : 0 }}>
      <Box>
        <ReferTitle component={heading}>Ask an employee for a referral</ReferTitle>
        <ReferLede>
          Publish <AccentLink href="/profile?tab=referrals">now</AccentLink>.
        </ReferLede>
      </Box>

      {showFilter ? (
        <ReferField
          label="Filter companies"
          placeholder="e.g. Stripe"
          value={directory.query}
          maxLength={REFERRER_LIMITS.company}
          onChange={directory.setQuery}
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      {directory.status === "loading" ? <ReferNote>Loading companies...</ReferNote> : null}
      {directory.status === "error" && directory.error ? <ReferAlert>{directory.error}</ReferAlert> : null}

      {directory.status === "empty" && directory.companies.length === 0 ? <BeTheFirst /> : null}

      {directory.status === "empty" && directory.companies.length > 0 ? (
        <ReferNote>No companies match that filter.</ReferNote>
      ) : null}

      {directory.filtered.length > 0 ? (
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
              <CompanyTile company={company} />
            </Box>
          ))}
        </Box>
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

function CompanyTile({ company }: { company: OpenReferralCompany }) {
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
      <Stack direction="row" spacing={1.75} sx={{ alignItems: "center", p: 2 }}>
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
      </Stack>
    </Card>
  );
}
