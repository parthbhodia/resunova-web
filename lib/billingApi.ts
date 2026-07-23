/**
 * Billing API client — Stripe checkout/portal/status via the resunova-api
 * backend. The web app never talks to Stripe directly and never reads the
 * service-only billing tables; GET /api/billing/status is the single source
 * of plan truth.
 *
 * Every helper tolerates a missing Supabase config (public marketing pages
 * like /pricing/ render without NEXT_PUBLIC_SUPABASE_* set locally) by
 * treating it as "signed out".
 */
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/utils";

export type BillingPriceKey = "pro_monthly" | "pro_quarterly";

export type BillingScanStatus = {
  enforced?: boolean;
  allowed?: boolean;
  reason?: string;
  limit?: number | null;
  used?: number | null;
  resetAt?: string | null;
};

export type BillingStatus = {
  plan: "free" | "pro";
  status: string | null;
  priceKey: BillingPriceKey | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  portalAvailable: boolean;
  checkoutEnabled: boolean;
  scan: BillingScanStatus | null;
};

/** Display copy for the two live Stripe prices. The AMOUNTS here are labels
 * only — the charge always comes from the Stripe Price object (see the
 * runbook: keep these in sync with the configured Price IDs). */
export const PLAN_PRICE_LABELS: Record<BillingPriceKey, { title: string; price: string; cadence: string; note?: string }> = {
  pro_monthly: { title: "Pro Monthly", price: "$19", cadence: "per month" },
  pro_quarterly: { title: "Pro Quarterly", price: "$39", cadence: "every 3 months", note: "$13/mo — save 32%" },
};

async function accessToken(): Promise<string | null> {
  try {
    const db = getSupabaseClient();
    const { data: { session } } = await db.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    // Supabase env not configured (local marketing-page builds) → signed out.
    return null;
  }
}

/** Ask the backend for a Stripe Checkout URL. Returns the URL on success, or
 * a typed failure so callers can fall back gracefully. */
export async function createCheckoutSession(
  priceKey: BillingPriceKey = "pro_monthly",
): Promise<{ url: string } | { error: "signed_out" | "checkout_unavailable" | "request_failed" }> {
  const token = await accessToken();
  if (!token) return { error: "signed_out" };
  try {
    const resp = await fetch(apiUrl("/api/billing/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ priceKey }),
    });
    if (resp.ok) {
      const json = await resp.json();
      if (typeof json?.url === "string" && json.url) return { url: json.url };
      return { error: "request_failed" };
    }
    // 403 checkout_disabled / 503 not configured → checkout isn't live yet.
    if (resp.status === 403 || resp.status === 503) return { error: "checkout_unavailable" };
    if (resp.status === 401) return { error: "signed_out" };
    return { error: "request_failed" };
  } catch {
    return { error: "request_failed" };
  }
}

/** Open the Stripe Billing Portal (manage/cancel/update card). */
export async function createPortalSession(): Promise<string | null> {
  const token = await accessToken();
  if (!token) return null;
  try {
    const resp = await fetch(apiUrl("/api/billing/portal"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return typeof json?.url === "string" && json.url ? json.url : null;
  } catch {
    return null;
  }
}

/** Authoritative plan + usage. Null when signed out or the request fails —
 * callers render the free-tier default in that case. */
export async function fetchBillingStatus(): Promise<BillingStatus | null> {
  const token = await accessToken();
  if (!token) return null;
  try {
    const resp = await fetch(apiUrl("/api/billing/status"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || typeof json !== "object" || (json.plan !== "free" && json.plan !== "pro")) return null;
    return json as BillingStatus;
  } catch {
    return null;
  }
}

/** Human label for a subscription status shown in the plan card. */
export function describeBillingStatus(status: BillingStatus | null): string {
  if (!status || status.plan !== "pro") return "Free plan";
  const renews = status.currentPeriodEnd ? new Date(status.currentPeriodEnd) : null;
  const dateLabel = renews && !Number.isNaN(renews.getTime())
    ? renews.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  if (status.status === "trialing") return dateLabel ? `Pro trial — converts ${dateLabel}` : "Pro trial";
  if (status.status === "past_due") return "Pro — payment issue, please update your card";
  if (status.cancelAtPeriodEnd) return dateLabel ? `Pro — ends ${dateLabel}` : "Pro — cancels at period end";
  return dateLabel ? `Pro — renews ${dateLabel}` : "Pro";
}
