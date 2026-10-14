"use client";

/**
 * PlanBillingCard — the "Plan & billing" section in Account settings.
 *
 * Reads the AUTHORITATIVE plan from GET /api/billing/status (never client
 * Supabase — the billing tables are service-only). Free → Upgrade opens Stripe
 * Checkout (falling back to /pricing when checkout isn't live); Pro → "Manage
 * billing" opens the Stripe Billing Portal. Sits alongside ScanUsageWidget,
 * which keeps showing live scan usage.
 */

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { filledButtonSx, outlineButtonSx } from "@/components/mui/cssVars";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import type { ThemeMode } from "@/components/mui/theme";
import { hubCardSx } from "@/components/profile/profileMui";
import {
  createCheckoutSession,
  createPortalSession,
  describeBillingStatus,
  fetchBillingStatus,
  type BillingStatus,
} from "@/lib/billingApi";
import { FS, FW, LH } from "@/lib/typography";

export default function PlanBillingCard({ mode }: { mode?: ThemeMode } = {}) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await fetchBillingStatus();
      if (!cancelled) {
        setStatus(s);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onUpgrade = useCallback(async () => {
    setBusy("checkout");
    setError(null);
    try {
      const result = await createCheckoutSession("pro_monthly");
      if ("url" in result) {
        window.location.assign(result.url);
        return;
      }
      if (result.error === "checkout_unavailable" || result.error === "signed_out") {
        // Plain navigation — this card renders inside jsdom-tested settings
        // trees with no app router mounted, so we avoid useRouter here.
        window.location.assign("/pricing/");
        return;
      }
      setError("Couldn't start checkout. Please try again in a moment.");
    } finally {
      setBusy(null);
    }
  }, []);

  const onManage = useCallback(async () => {
    setBusy("portal");
    setError(null);
    try {
      const url = await createPortalSession();
      if (url) {
        window.location.assign(url);
        return;
      }
      setError("Couldn't open the billing portal. Please try again in a moment.");
    } finally {
      setBusy(null);
    }
  }, []);

  const isPro = status?.plan === "pro";
  const label = describeBillingStatus(status);
  const badge = isPro ? "Pro" : "Free";

  return (
    <MuiThemeRegistry mode={mode}>
      <Card elevation={0} sx={hubCardSx(true)}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "space-between", px: 3, pt: 3 }}
        >
          <Typography component="h2" sx={{ m: 0, fontSize: FS.bodyLg, fontWeight: FW.bold, letterSpacing: "-0.02em" }}>
            Plan & billing
          </Typography>
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
        </Stack>
        <CardContent sx={{ pt: 2 }}>
          {!loaded ? (
            <Typography sx={{ fontSize: FS.body, color: "text.secondary" }}>Loading plan…</Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: FS.bodyLg, color: "text.primary", fontWeight: FW.semibold, mb: 0.5 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: FS.body, color: "text.secondary", lineHeight: LH.normal, mb: 1.75 }}>
                {isPro
                  ? "30 résumé scans, job matches, and interview-prep runs per day. Manage your payment method, invoices, or cancellation through the secure Stripe portal."
                  : "You're on the free tier. Daily scan caps apply. Pro raises them to 30/day."}
              </Typography>
              {error ? (
                <Typography role="alert" sx={{ fontSize: FS.body, color: "error.main", mb: 1.25 }}>
                  {error}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                {isPro || status?.portalAvailable ? (
                  <Button variant="outlined" onClick={onManage} disabled={busy !== null} sx={outlineButtonSx}>
                    {busy === "portal" ? "Opening portal…" : "Manage billing"}
                  </Button>
                ) : null}
                {!isPro ? (
                  <Button variant="contained" onClick={onUpgrade} disabled={busy !== null} sx={filledButtonSx}>
                    {busy === "checkout" ? "Opening checkout…" : "Upgrade to Pro"}
                  </Button>
                ) : null}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </MuiThemeRegistry>
  );
}
