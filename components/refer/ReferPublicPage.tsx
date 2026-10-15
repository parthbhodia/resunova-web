"use client";

/**
 * Referral route. AuthGate protects the route; site chrome is
 * app/(marketing)/layout.tsx
 * (PublicSiteFrame). This file only chooses which screen to show. Search,
 * load, and submit state live in hooks/usePublicReferral.ts. Shared controls
 * live in referUi.tsx.
 *
 * Data reads also wait for a signed-in session, so an auth transition cannot
 * briefly expose company or referrer details before AuthGate updates.
 */

import { Suspense, useEffect } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material/styles";
import { makeTheme } from "@/components/mui/theme";
import { FindReferrer } from "@/components/refer/FindReferrer";
import { ReferrerRequestForm } from "@/components/refer/ReferrerRequestForm";
import { AccentLink, ReferAlert, ReferGoogleGate, ReferLede, ReferNote, ReferTitle } from "@/components/refer/referUi";
import { REFERRER_LINK_INACTIVE } from "@/lib/companyReferrers";
import { clearPostLoginDest } from "@/lib/oauthRedirect";
import { useReferSession, useReferrerLookup } from "@/hooks/usePublicReferral";
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
    <ThemeProvider theme={referralTheme}>
      <Suspense fallback={<Box sx={{ px: 3, py: 6 }}><ReferNote>Loading...</ReferNote></Box>}>
        <ReferRoute />
      </Suspense>
    </ThemeProvider>
  );
}

function ReferRoute() {
  const params = useSearchParams();
  const slug = (params?.get("s") ?? "").trim();
  return (
    <Box sx={{ maxWidth: 880, mx: "auto", px: 3, pt: 6, pb: 10 }}>
      <ReferSlugView key={slug || "directory"} slug={slug} />
    </Box>
  );
}

function ReferSlugView({ slug }: { slug: string }) {
  const session = useReferSession();
  const signedIn = session.status === "signed_in";
  const lookup = useReferrerLookup(slug, signedIn);

  // OAuth from this page stashes /refer/… for AppShell. If Supabase already
  // returned us here, drop the stash so the next home visit does not bounce back.
  useEffect(() => {
    if (signedIn) clearPostLoginDest();
  }, [signedIn]);

  if (!slug) {
    return <FindReferrer />;
  }

  if (session.status === "loading") return <ReferNote>Loading...</ReferNote>;

  if (session.status === "signed_out") {
    return (
      <ReferGoogleGate
        title="Someone shared a referral link with you"
        lede="Continue with Google to open it. We keep who is ready to refer private until you are signed in."
      />
    );
  }

  if (lookup.status === "loading" || lookup.status === "idle") return <ReferNote>Loading...</ReferNote>;
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
        <ReferLede>This link may have been paused or copied incorrectly. Ask the employee for an active link, or browse open referrers.</ReferLede>
        <AccentLink href="/refer/">Browse open referrers</AccentLink>
        <FindReferrer heading="h2" />
      </>
    );
  }
  return <ReferrerRequestForm referrer={lookup.referrer} />;
}
