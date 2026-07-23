"use client";

/**
 * Account Settings — account-level controls that are NOT career data:
 * the signed-in account, plan & usage, email/notification preferences, and
 * résumé visibility. Career fields (contact, roles, education, EEO, tailoring
 * defaults) live on the Profile page instead.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { signOutAndReturnHome } from "@/lib/authSignOut";
import { apiUrl } from "@/lib/utils";
import { Card, ToggleSwitch } from "@/components/profileSettingsUi";
import { ScanUsageWidget } from "@/components/ScanUsageWidget";
import PlanBillingCard from "@/components/PlanBillingCard";
import { TailoringModeSelector } from "@/components/TailoringModeModal";
import { TAILORING_MODE_META, fetchTailoringMode, getCachedTailoringMode, saveTailoringMode, type TailoringMode } from "@/lib/tailoringMode";

type NotifyPrefs = { accountChanges: boolean; scanLimit: boolean; features: boolean };
const NOTIFY_DEFAULTS: NotifyPrefs = { accountChanges: true, scanLimit: false, features: false };
const NOTIFY_PREFS_KEY = "rn_notify_prefs_v1";

const NOTIFY_ROWS: { key: keyof NotifyPrefs; label: string; sub: string | null }[] = [
  { key: "accountChanges", label: "Email me when my account changes", sub: "password, email, profile updates" },
  { key: "scanLimit", label: "Notify me when I reach my daily scan limit", sub: null },
  { key: "features", label: "Tell me about new features and updates", sub: null },
];

/** Email preferences — persisted to user_profiles.notify_prefs via
 * /api/profile/notify-prefs (which also syncs the "features" flag to Brevo).
 * localStorage is an offline fallback + instant first render. */
function EmailPreferencesCard() {
  const [notifyPrefs, setNotifyPrefs] = useState<NotifyPrefs>(() => {
    if (typeof window === "undefined") return NOTIFY_DEFAULTS;
    try {
      const raw = localStorage.getItem(NOTIFY_PREFS_KEY);
      return raw ? { ...NOTIFY_DEFAULTS, ...JSON.parse(raw) } : NOTIFY_DEFAULTS;
    } catch { return NOTIFY_DEFAULTS; }
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const prefsRef = useRef<NotifyPrefs>(notifyPrefs);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a latest-value ref in sync (in an effect, never during render) so the
  // toggle handler can read current prefs without stale-closure issues.
  useEffect(() => { prefsRef.current = notifyPrefs; }, [notifyPrefs]);

  // DB is source of truth; overrides the localStorage value once loaded.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const resp = await fetch(apiUrl("/api/profile/notify-prefs"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!resp.ok || cancelled) return;
        const prefs = (await resp.json()) as NotifyPrefs;
        const merged = { ...NOTIFY_DEFAULTS, ...prefs };
        setNotifyPrefs(merged);
        try { localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(merged)); } catch {}
      } catch { /* keep localStorage value already in state */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const toggle = useCallback((key: keyof NotifyPrefs) => {
    const next = { ...prefsRef.current, [key]: !prefsRef.current[key] };
    prefsRef.current = next;
    setNotifyPrefs(next);
    try { localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(next)); } catch {}

    // Debounced backend persist (also subscribes/unsubscribes from Brevo server-side).
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(apiUrl("/api/profile/notify-prefs"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(next),
        });
        setSaveStatus(resp.ok ? "saved" : "error");
        if (resp.ok) setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("error"); }
    }, 500);
  }, []);

  return (
    <Card
      title="Email preferences"
      action={
        <span role="status" aria-live="polite" style={{ fontSize: 11, flexShrink: 0 }}>
          {saveStatus === "saving" && <span style={{ color: "var(--muted)" }}>Saving…</span>}
          {saveStatus === "saved" && (
            <span style={{ color: "var(--green-ink, #047857)", fontWeight: 600 }}>✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span style={{ color: "var(--red)", fontWeight: 600 }}>Couldn’t save — retry</span>
          )}
        </span>
      }
    >
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 8px" }}>
        We&apos;ll send at most 1–2 emails per week.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {NOTIFY_ROWS.map(({ key, label, sub }, i) => (
          <ToggleSwitch
            key={key}
            checked={notifyPrefs[key]}
            onChange={() => toggle(key)}
            label={label}
            sub={sub}
            topBorder={i > 0}
          />
        ))}
      </div>
    </Card>
  );
}

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

/** Résumé tailoring — how aggressively AI rewrites tailor to a JD.
 * Persisted on user_profiles.tailoring_mode; the same value the Tailor results
 * header and the first-use modal read/write. */
function TailoringModeCard() {
  const [mode, setMode] = useState<TailoringMode | null>(() => getCachedTailoringMode());
  useEffect(() => {
    let cancelled = false;
    void fetchTailoringMode().then((m) => { if (!cancelled && m) setMode(m); });
    return () => { cancelled = true; };
  }, []);
  const effective = mode ?? "honest";
  return (
    <Card title="Résumé tailoring">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>AI rewrite style</div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, maxWidth: 480 }}>
            {TAILORING_MODE_META[effective].blurb} Applies to Tailor gap fixes and Jobs Boost. Either way, nothing is ever fabricated — rewrites always start from real bullets on your résumé.
          </p>
        </div>
        <TailoringModeSelector
          value={effective}
          size="md"
          onChange={(m) => { setMode(m); void saveTailoringMode(m); }}
        />
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
        <ScanUsageWidget />
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
