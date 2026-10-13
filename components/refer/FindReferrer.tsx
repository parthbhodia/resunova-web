"use client";

import { AccentLink, ReferAlert, ReferField, ReferLede, ReferNote, ReferTitle, ReferrerCard } from "@/components/refer/referUi";
import { REFERRER_LIMITS } from "@/lib/companyReferrers";
import { useReferrerSearch } from "@/hooks/usePublicReferral";
import { FS, LH } from "@/lib/typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export function FindReferrer({ heading = "h1" }: { heading?: "h1" | "h2" }) {
  const search = useReferrerSearch();

  return (
    <Stack spacing={2.5} sx={{ mt: heading === "h2" ? 4.5 : 0 }}>
      <Box>
        <ReferTitle component={heading}>Ask an employee for a referral</ReferTitle>
        <ReferLede>
          Search a company to find people who have signed up to refer candidates. If you work somewhere, publish your own profile from{" "}
          <AccentLink href="/profile?tab=referrals">Profile</AccentLink>.
        </ReferLede>
      </Box>
      <ReferField
        label="Company name"
        placeholder="e.g. Stripe"
        value={search.query}
        maxLength={REFERRER_LIMITS.company}
        onChange={search.setQuery}
        sx={{ maxWidth: 420 }}
      />
      <Stack spacing={1.5}>
        {search.status === "loading" ? <ReferNote>Searching...</ReferNote> : null}
        {search.status === "empty" ? <ReferNote>No open referrers for that company yet.</ReferNote> : null}
        {search.status === "error" && search.error ? <ReferAlert>{search.error}</ReferAlert> : null}
        {search.results.map((row) => (
          <ReferrerCard
            key={row.id}
            name={row.displayName}
            count={row.referredCount ?? 0}
            href={`/refer/?s=${encodeURIComponent(row.slug)}`}
            ariaLabel={`Ask ${row.displayName} at ${row.company} for a referral`}
          >
            <Typography sx={{ display: "block", mt: 0.25, fontSize: FS.bodyLg, color: "var(--muted)", lineHeight: LH.normal }}>
              {row.title} at {row.company}{row.bio ? `. ${row.bio}` : ""}
            </Typography>
          </ReferrerCard>
        ))}
      </Stack>
    </Stack>
  );
}
