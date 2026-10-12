"use client";

/**
 * Account Settings — account-level controls that are NOT career data:
 * the signed-in account, plan & usage, email/notification preferences, and
 * résumé visibility. Career fields (contact, roles, education, EEO, tailoring
 * defaults) live on the Profile page instead.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { signOutAndReturnHome } from "@/lib/authSignOut";
import { Card } from "@/components/profileSettingsUi";
import UsageLimitsCard from "@/components/account/UsageLimitsCard";
import PlanBillingCard from "@/components/PlanBillingCard";
import { EmailPreferencesCard, TailoringModeCard } from "@/components/accountSettingsCards";

/** Read-only account summary + sign out. */
function AccountCard() {
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabaseClient().auth.getUser();
        if (!cancelled) setEmail(data.user?.email ?? null);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // User-initiated retry after a transient auth-fetch failure.
  const retry = useCallback(async () => {
    setLoaded(false);
    setLoadError(false);
    try {
      const { data } = await getSupabaseClient().auth.getUser();
      setEmail(data.user?.email ?? null);
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  const onSignOut = useCallback(() => {
    if (signingOut) return;
    if (typeof window !== "undefined" && !window.confirm("Sign out of Resunova on this device?")) return;
    setSigningOut(true);
    void signOutAndReturnHome();
  }, [signingOut]);

  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <Card title="Account">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loaded ? initial : ""}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
              Signed in as
            </div>
            {!loaded ? (
              <div aria-hidden style={{ width: 180, height: 16, borderRadius: 6, background: "var(--surface2)" }} />
            ) : loadError ? (
              <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                Couldn&apos;t load your account.
                <button
                  type="button"
                  onClick={() => void retry()}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", wordBreak: "break-word" }}>
                {email ?? "Not signed in"}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="rn-account-signout"
          onClick={onSignOut}
          disabled={signingOut}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            padding: "9px 16px",
            minHeight: 40,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--red)",
            cursor: signingOut ? "not-allowed" : "pointer",
            opacity: signingOut ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </Card>
  );
}

export default function AccountSettingsPage() {
  return (
    <div
      className="rn-account-root"
      style={{
        minHeight: "100%",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div style={{ padding: "28px 20px 100px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <header style={{ marginBottom: 26 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8, marginBottom: 8 }}>Account settings</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: 540 }}>
            Manage your account, plan, and notifications. Looking for your résumé details, target roles, or
            education? Those live on your{" "}
            <Link href="/profile" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Profile
            </Link>
            .
          </p>
        </header>

        <AccountCard />
        <PlanBillingCard />
        <UsageLimitsCard />
        <EmailPreferencesCard />

        <TailoringModeCard />

        <Card title="Visibility" badge="Soon">
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
            Control what appears on exported PDFs and shared links.
          </p>
          <div aria-hidden style={{ opacity: 0.45 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 10, cursor: "not-allowed" }}>
              <input type="checkbox" defaultChecked disabled /> Show phone on résumé PDFs
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "not-allowed" }}>
              <input type="checkbox" disabled /> Hide full address (city only)
            </label>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .rn-account-root button:focus-visible,
        .rn-account-root a:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
          border-radius: var(--radius);
        }
        .rn-account-root .rn-account-signout:not(:disabled):hover {
          background: var(--surface2) !important;
          border-color: var(--border-h) !important;
        }
        .rn-account-root .rn-account-signout:not(:disabled):active {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  );
}
