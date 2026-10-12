"use client";

/**
 * Public referral route. Chrome is PublicSiteFrame. This file only chooses
 * which screen to show. Search, load, and submit state live in
 * hooks/usePublicReferral.ts. Shared controls live in referUi.tsx.
 */

import { Suspense } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material/styles";
import { makeTheme } from "@/components/mui/theme";
import { PublicSiteFrame } from "@/components/site/PublicSiteFrame";
import { FindReferrer } from "@/components/refer/FindReferrer";
import { ReferrerRequestForm } from "@/components/refer/ReferrerRequestForm";
import { ReferAlert, ReferLede, ReferNote, ReferTitle } from "@/components/refer/referUi";
import { REFERRER_LINK_INACTIVE } from "@/lib/companyReferrers";
import { useReferrerLookup } from "@/hooks/usePublicReferral";
import { useSearchParams } from "next/navigation";

/**
 * One theme object for server and client. The site registry's snapshot is
 * dark during prerender and light in the browser, which gives MUI two class
 * names for the same control and a hydration error. Colors still follow
 * data-theme through the CSS variables in cssVars.ts.
 */
const referralTheme = makeTheme("light");

export default function ReferPublicPage() {
  return (
    <PublicSiteFrame>
      <ThemeProvider theme={referralTheme}>
        <Suspense fallback={<Box sx={{ px: 3, py: 6 }}><ReferNote>Loading...</ReferNote></Box>}>
          <ReferRoute />
        </Suspense>
      </ThemeProvider>
    </PublicSiteFrame>
  );
}

function ReferRoute() {
  const params = useSearchParams();
  const slug = (params?.get("s") ?? "").trim();
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: 3, pt: 6, pb: 10 }}>
      <ReferSlugView key={slug || "directory"} slug={slug} />
    </Box>
  );
}

function ReferSlugView({ slug }: { slug: string }) {
  const lookup = useReferrerLookup(slug);

  if (lookup.status === "loading") return <ReferNote>Loading...</ReferNote>;
  if (lookup.status === "error") {
    return (
      <Stack spacing={2.5}>
        <ReferAlert>{lookup.message}</ReferAlert>
        <FindReferrer heading="h2" />
      </Stack>
    );
  }
  if (lookup.status === "missing") {
    return (
      <>
        <ReferTitle>{REFERRER_LINK_INACTIVE}</ReferTitle>
        <ReferLede>The employee may have turned off requests, or the link is wrong.</ReferLede>
        <FindReferrer heading="h2" />
      </>
    );
  }
  if (lookup.status === "ready") return <ReferrerRequestForm referrer={lookup.referrer} />;
  return <FindReferrer />;
}
