"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { Card, ToggleSwitch } from "@/components/profileSettingsUi";
import { TailoringModeSelector } from "@/components/TailoringModeModal";
import {
  TAILORING_MODE_META,
  fetchTailoringMode,
  getCachedTailoringMode,
  resolveTailoringMode,
  saveTailoringMode,
  type TailoringMode,
} from "@/lib/tailoringMode";
import { apiFetch } from "@/lib/apiClient";

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
export function EmailPreferencesCard() {
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

  useEffect(() => { prefsRef.current = notifyPrefs; }, [notifyPrefs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const resp = await apiFetch("/api/profile/notify-prefs");
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

    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const resp = await apiFetch("/api/profile/notify-prefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

/** Résumé tailoring — how aggressively AI rewrites tailor to a JD.
 * Persisted on user_profiles.tailoring_mode; the same value the Tailor results
 * header and the first-use modal read/write. */
export function TailoringModeCard() {
  const [mode, setMode] = useState<TailoringMode | null>(() => getCachedTailoringMode());
  useEffect(() => {
    let cancelled = false;
    void fetchTailoringMode().then((m) => { if (!cancelled && m) setMode(m); });
    return () => { cancelled = true; };
  }, []);
  const effective = resolveTailoringMode(mode);
  return (
    <Card title="Résumé tailoring">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>AI rewrite style</div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, maxWidth: 480 }}>
            {TAILORING_MODE_META[effective].blurb} Applies to Tailor gap fixes and Jobs Boost. In either style, rewrites start from a real bullet on your résumé and never add employers, titles, dates, degrees or certifications.
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
