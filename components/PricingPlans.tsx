"use client";

/**
 * PricingPlans — the interactive plan cards on the public /pricing/ page.
 *
 * Signed-in + checkout live → the Pro CTAs open Stripe Checkout directly.
 * Signed out (or Supabase env unset on a local marketing build, or checkout
 * flag off) → the CTA routes into the app to sign in first. The page itself
 * stays fully renderable with zero auth configuration.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FREE_INTERVIEW_DAILY_LIMIT,
  FREE_SCAN_DAILY_LIMIT,
  PRO_INTERVIEW_DAILY_LIMIT,
  PRO_SCAN_DAILY_LIMIT,
} from "@/components/UpgradeDialog";
import {
  PLAN_PRICE_LABELS,
  createCheckoutSession,
  type BillingPriceKey,
} from "@/lib/billingApi";

const FREE_FEATURES = [
  `${FREE_SCAN_DAILY_LIMIT} résumé & ATS scans per day`,
  `${FREE_INTERVIEW_DAILY_LIMIT} interview-prep scans per day`,
  "Full job feed, match scores & application tracker",
  "AI rewrites & clean PDF export",
];

const PRO_FEATURES = [
  `${PRO_SCAN_DAILY_LIMIT} résumé & ATS checks + AI fixes per day`,
  `${PRO_SCAN_DAILY_LIMIT} job-match scores & tailored résumés per day`,
  `${PRO_INTERVIEW_DAILY_LIMIT} interview-prep scans per day`,
  "Clean PDF downloads included",
];

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((f) => (
        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, lineHeight: 1.5, color: "var(--text)" }}>
          <span style={{ color: "var(--green-ink)", marginTop: 2, flexShrink: 0 }}>{CheckIcon}</span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPlans() {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<BillingPriceKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Stripe cancel_url lands here with ?checkout=cancelled. Read from
  // window.location (not useSearchParams) so the static export needs no
  // Suspense boundary on this public page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("checkout") === "cancelled") {
      setNotice("Checkout was cancelled — no charge was made. You can upgrade any time.");
    }
  }, []);

  const startCheckout = useCallback(async (priceKey: BillingPriceKey) => {
    if (busyKey) return;
    setBusyKey(priceKey);
    setNotice(null);
    try {
      const result = await createCheckoutSession(priceKey);
      if ("url" in result) {
        window.location.assign(result.url);
        return;
      }
      if (result.error === "signed_out") {
        // Into the app to sign in; they can upgrade from the dialog after.
        router.push("/");
        return;
      }
      setNotice(
        result.error === "checkout_unavailable"
          ? "Checkout isn't open quite yet — it's launching shortly. Everything free stays free."
          : "Something went wrong starting checkout. Please try again in a moment.",
      );
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, router]);

  const cardStyle: React.CSSProperties = {
    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "var(--shadow-card)",
    padding: "26px 26px 24px",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div>
      {notice ? (
        <p role="status" style={{
          margin: "0 auto 24px", maxWidth: 560, textAlign: "center",
          fontSize: 13, lineHeight: 1.6, color: "var(--amber-ink)",
          background: "var(--amber-bg)", border: "1px solid var(--amber-bg)",
          borderRadius: 10, padding: "10px 14px",
        }}>
          {notice}
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        {/* Free */}
        <section style={cardStyle} aria-label="Free plan">
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>Free</h2>
          <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, margin: "0 0 2px" }}>$0</p>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 18px" }}>forever</p>
          <FeatureList items={FREE_FEATURES} />
          <Button variant="outline" className="w-full mt-auto" onClick={() => router.push("/")}>
            Start scanning free
          </Button>
        </section>

        {/* Pro monthly */}
        <section style={{ ...cardStyle, border: "1.5px solid var(--accent)" }} aria-label="Pro Monthly plan">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{PLAN_PRICE_LABELS.pro_monthly.title}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-foreground, #fff)", background: "var(--accent)", borderRadius: 999, padding: "3px 9px" }}>
              Popular
            </span>
          </div>
          <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, margin: "0 0 2px" }}>{PLAN_PRICE_LABELS.pro_monthly.price}</p>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 18px" }}>{PLAN_PRICE_LABELS.pro_monthly.cadence}</p>
          <FeatureList items={PRO_FEATURES} />
          <Button className="w-full mt-auto" onClick={() => startCheckout("pro_monthly")} disabled={busyKey !== null}>
            {busyKey === "pro_monthly" ? "Opening checkout…" : "Upgrade to Pro"}
          </Button>
        </section>

        {/* Pro quarterly */}
        <section style={cardStyle} aria-label="Pro Quarterly plan">
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>{PLAN_PRICE_LABELS.pro_quarterly.title}</h2>
          <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, margin: "0 0 2px" }}>{PLAN_PRICE_LABELS.pro_quarterly.price}</p>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 18px" }}>
            {PLAN_PRICE_LABELS.pro_quarterly.cadence}
            {PLAN_PRICE_LABELS.pro_quarterly.note ? ` · ${PLAN_PRICE_LABELS.pro_quarterly.note}` : ""}
          </p>
          <FeatureList items={PRO_FEATURES} />
          <Button variant="outline" className="w-full mt-auto" onClick={() => startCheckout("pro_quarterly")} disabled={busyKey !== null}>
            {busyKey === "pro_quarterly" ? "Opening checkout…" : "Get Pro Quarterly"}
          </Button>
        </section>
      </div>
    </div>
  );
}
