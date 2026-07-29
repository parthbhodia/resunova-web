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
import { Card } from "@/components/profileSettingsUi";
import { Button } from "@/components/ui/button";
import {
  createCheckoutSession,
  createPortalSession,
  describeBillingStatus,
  fetchBillingStatus,
  type BillingStatus,
} from "@/lib/billingApi";

export default function PlanBillingCard() {
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
      setError("Couldn't start checkout — please try again in a moment.");
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
      setError("Couldn't open the billing portal — please try again in a moment.");
    } finally {
      setBusy(null);
    }
  }, []);

  const isPro = status?.plan === "pro";
  const label = describeBillingStatus(status);

  return (
    <Card title="Plan & billing" badge={isPro ? "Pro" : "Free"}>
      {!loaded ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading plan…</p>
      ) : (
        <>
          <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
            {isPro
              ? "30 résumé scans, job matches, and interview-prep runs per day. Manage your payment method, invoices, or cancellation through the secure Stripe portal."
              : "You're on the free tier — daily scan caps apply. Pro raises them to 30/day."}
          </p>
          {error ? (
            <p role="alert" style={{ fontSize: 13, color: "var(--red-ink, #dc2626)", marginBottom: 10 }}>{error}</p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isPro || status?.portalAvailable ? (
              <Button variant="outline" size="sm" onClick={onManage} disabled={busy !== null}>
                {busy === "portal" ? "Opening portal…" : "Manage billing"}
              </Button>
            ) : null}
            {!isPro ? (
              <Button size="sm" onClick={onUpgrade} disabled={busy !== null}>
                {busy === "checkout" ? "Opening checkout…" : "Upgrade to Pro"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
