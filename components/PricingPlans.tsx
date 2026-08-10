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
 *
 * Built on MUI per AGENTS.md ("new chrome goes to MUI"): the segmented control
 * is a real ToggleButtonGroup, so grouping semantics, pressed state, the 44px
 * tap floor and the ripple come from the theme rather than being re-decided on
 * two bare <button>s. Note it does NOT add roving arrow-key focus — each
 * option is its own tab stop, verified in a browser. The provider is scoped
 * here, the same shape as BoostPanel, so only this route pays for Emotion.
 *
 * Motion is CSS on the Material scale (--md-easing-* / --md-duration-*), not a
 * new animation runtime: `motion` is in package.json but no component imports
 * it, and one marketing page is a poor place to introduce that.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
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

/** `delta` rows are what you are buying; the `flat` row is deliberately shown
 *  as NOT a differentiator, which is what makes the other three credible. */
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

function PricingPlansInner() {
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
    <Paper elevation={0} className="pr-panel pr-rise" style={{ animationDelay: "160ms" }}>
      {notice ? (
        <Alert severity="info" sx={{ mb: 2.25, fontSize: 13, alignItems: "center" }}>
          {notice}
        </Alert>
      ) : null}

      <ToggleButtonGroup
        exclusive
        size="small"
        value={selected}
        aria-label="Billing period"
        onChange={(_, next: BillingPriceKey | null) => {
          // Exclusive groups emit null when the pressed button is clicked
          // again. Ignoring it keeps a plan always selected — there is no
          // "neither" state to price.
          if (next) setSelected(next);
        }}
        sx={{
          mb: 2.75,
          borderRadius: 999,
          background: "var(--surface2)",
          p: 0.5,
          "& .MuiToggleButton-root": {
            border: 0,
            borderRadius: "999px !important",
            px: 2.25,
            minHeight: 40,
            fontSize: 13,
            color: "var(--muted)",
            transition: "background var(--md-duration-medium) var(--md-easing-standard), color var(--md-duration-medium) var(--md-easing-standard)",
          },
          // `backgroundColor`, not the `background` shorthand: MUI's own
          // Mui-selected rule sets backgroundColor and wins over it, which
          // rendered the selected pill grey instead of raised.
          "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            boxShadow: "var(--md-elevation-1)",
          },
        }}
      >
        {TOGGLE.map((t) => (
          <ToggleButton key={t.key} value={t.key}>
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography
        component="p"
        sx={{
          fontSize: 62,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: "var(--text)",
        }}
      >
        {plan.price}
      </Typography>
      <Typography component="p" sx={{ fontSize: 14, color: "var(--muted)", mt: 1 }}>
        {selected === "pro_monthly" ? "per month, billed monthly" : "billed every 3 months"}
      </Typography>

      {savingsNote ? (
        selected === "pro_monthly" ? (
          <Chip
            label={`Quarterly is ${savingsNote}`}
            onClick={() => setSelected("pro_quarterly")}
            size="small"
            sx={{
              mt: 1.75,
              fontWeight: 600,
              fontSize: 13,
              // MUI Chip centres its label by fixed height with no vertical
              // inset, which reads flush against a tinted fill. Real padding.
              height: "auto",
              py: 0.75,
              "& .MuiChip-label": { px: 1.25 },
              // -ink, not --accent: --accent on --accent-bg is 4.46:1 in light.
              color: "var(--accent-ink)",
              background: "var(--accent-bg)",
              borderRadius: "var(--md-shape-xs)",
            }}
          />
        ) : (
          <Typography
            component="p"
            sx={{ mt: 1.75, fontSize: 13, fontWeight: 600, color: "var(--accent-ink)" }}
          >
            {savingsNote}
          </Typography>
        )
      ) : null}

      {/* Static markup: plain list elements rather than Stack. MUI is here for
          the interactive, themed pieces; wrapping inert rows in it buys an
          Emotion class and nothing else. */}
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

      <Button
        variant="contained"
        fullWidth
        onClick={startCheckout}
        disabled={busy}
        sx={{ mt: 3, minHeight: 50, fontSize: 15, borderRadius: "var(--md-shape-sm)" }}
      >
        {busy ? "Opening checkout…" : "Upgrade to Pro"}
      </Button>
      <Typography component="p" sx={{ fontSize: 12, color: "var(--dim)", mt: 1.5, lineHeight: 1.6 }}>
        Cancel any time. You keep Pro until the end of the period you paid for.
      </Typography>
    </Paper>
  );
}

export default function PricingPlans() {
  return (
    <MuiThemeRegistry>
      <PricingPlansInner />
    </MuiThemeRegistry>
  );
}
