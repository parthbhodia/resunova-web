"use client";

/**
 * PricingPlans — the Pro panel on the public /pricing/ page.
 *
 * Signed-in + checkout live → the CTA opens Stripe Checkout directly.
 * Signed out (or Supabase env unset on a local marketing build, or checkout
 * flag off) → the CTA routes into the app to sign in first. The page itself
 * stays fully renderable with zero auth configuration.
 *
 * Three plan towers were replaced by one plan and a billing toggle: the plans
 * only ever differed by a number, so three near-identical feature lists made
 * the reader do the diffing. The toggle maps 1:1 onto the two Stripe price
 * keys, and the feature rows state the free→Pro delta directly. Every number
 * is interpolated from the limit constants, so a limit change cannot leave a
 * stale claim on a public page.
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

/** `delta` rows are what you are buying; `flat` rows are deliberately shown as
 *  NOT a differentiator, so the three that are read as credible. */
const FEATURES: { label: string; value: string; kind: "delta" | "flat" }[] = [
  {
    label: "Résumé and ATS checks with AI fixes",
    value: `${FREE_SCAN_DAILY_LIMIT} → ${PRO_SCAN_DAILY_LIMIT} a day`,
    kind: "delta",
  },
  {
    label: "Job-match scores and tailored résumés",
    value: `${FREE_SCAN_DAILY_LIMIT} → ${PRO_SCAN_DAILY_LIMIT} a day`,
    kind: "delta",
  },
  {
    label: "Interview-prep runs",
    value: `${FREE_INTERVIEW_DAILY_LIMIT} → ${PRO_INTERVIEW_DAILY_LIMIT} a day`,
    kind: "delta",
  },
  { label: "Clean PDF downloads", value: "On every plan", kind: "flat" },
];

const TOGGLE: { key: BillingPriceKey; label: string }[] = [
  { key: "pro_monthly", label: "Monthly" },
  { key: "pro_quarterly", label: "Quarterly" },
];

export default function PricingPlans() {
  const router = useRouter();
  const [selected, setSelected] = useState<BillingPriceKey>("pro_monthly");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Stripe cancel_url lands here with ?checkout=cancelled. Read from
  // window.location (not useSearchParams) so the static export needs no
  // Suspense boundary on this public page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("checkout") === "cancelled") {
      setNotice("Checkout was cancelled and no charge was made. You can upgrade any time.");
    }
  }, []);

  const startCheckout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await createCheckoutSession(selected);
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
          ? "Checkout isn't open quite yet. It's launching shortly, and everything free stays free."
          : "Something went wrong starting checkout. Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, router, selected]);

  const plan = PLAN_PRICE_LABELS[selected];
  const savingsNote = PLAN_PRICE_LABELS.pro_quarterly.note;

  return (
    <div className="pr-panel">
      {notice ? (
        <p
          role="status"
          style={{
            margin: "0 0 18px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--amber-ink)",
            background: "var(--amber-bg)",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          {notice}
        </p>
      ) : null}

      <div
        role="group"
        aria-label="Billing period"
        style={{
          display: "inline-flex",
          gap: 2,
          padding: 4,
          borderRadius: 999,
          background: "var(--surface2)",
          marginBottom: 22,
        }}
      >
        {TOGGLE.map((t) => {
          const active = selected === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(t.key)}
              style={{
                border: 0,
                cursor: "pointer",
                font: "inherit",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: 999,
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--text)" : "var(--muted)",
                boxShadow: active ? "0 1px 3px rgba(15,23,42,0.16)" : "none",
                transition: "background 180ms ease, color 180ms ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <p
        style={{
          fontSize: 62,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          margin: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {plan.price}
      </p>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 0" }}>
        {selected === "pro_monthly" ? "per month, billed monthly" : "billed every 3 months"}
      </p>

      {selected === "pro_monthly" && savingsNote ? (
        <button
          type="button"
          onClick={() => setSelected("pro_quarterly")}
          style={{
            marginTop: 14,
            border: 0,
            cursor: "pointer",
            font: "inherit",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent)",
            background: "var(--accent-bg)",
            borderRadius: 6,
            padding: "5px 10px",
          }}
        >
          Quarterly is {savingsNote}
        </button>
      ) : (
        <p style={{ margin: "14px 0 0", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
          {savingsNote}
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 12 }}>
        {FEATURES.map((f) => (
          <li
            key={f.label}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 14,
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            <span style={{ color: f.kind === "delta" ? "var(--text)" : "var(--muted)" }}>
              {f.label}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontWeight: f.kind === "delta" ? 700 : 500,
                fontVariantNumeric: "tabular-nums",
                color: f.kind === "delta" ? "var(--text)" : "var(--dim)",
              }}
            >
              {f.value}
            </span>
          </li>
        ))}
      </ul>

      <Button className="w-full mt-6" onClick={startCheckout} disabled={busy}>
        {busy ? "Opening checkout…" : "Upgrade to Pro"}
      </Button>
      <p style={{ fontSize: 12, color: "var(--dim)", margin: "12px 0 0", lineHeight: 1.6 }}>
        Cancel any time. You keep Pro until the end of the period you paid for.
      </p>
    </div>
  );
}
