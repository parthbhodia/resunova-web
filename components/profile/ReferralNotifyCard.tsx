"use client";

/**
 * Email opt-in for referral asks.
 *
 * This reuses the account-level notify-prefs channel (`user_profiles
 * .notify_prefs` via `/api/profile/notify-prefs`) rather than a new column on
 * `company_referrers`. One place for a user to see every email they get, and no
 * second opt-in to honour on the backend when the queue drains.
 *
 * Prefers: on by default. A referrer who is not told an ask arrived will not
 * open the inbox, and the ask expires as a candidate's odds do. The send itself
 * is the backend's: the row lands in `referral_notify_queue` from a trigger,
 * and this only records the preference.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { apiFetch } from "@/lib/apiClient";
import { FeedbackToastCard, type FeedbackToastVariant } from "@/components/FeedbackToastCard";

const cardStyle: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
};

const NOTIFY_PREFS_KEY = "rn_notify_prefs_v1";

type NotifyPrefs = { accountChanges: boolean; scanLimit: boolean; features: boolean; referralAsks: boolean };

const DEFAULTS: NotifyPrefs = {
  accountChanges: true,
  scanLimit: false,
  features: false,
  referralAsks: true,
};

export function ReferralNotifyCard() {
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    variant: FeedbackToastVariant;
  } | null>(null);
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return DEFAULTS.referralAsks;
    try {
      const raw = localStorage.getItem(NOTIFY_PREFS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<NotifyPrefs>) : {};
      return parsed.referralAsks ?? DEFAULTS.referralAsks;
    } catch {
      return DEFAULTS.referralAsks;
    }
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const prefsRef = useRef<NotifyPrefs | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: NotifyPrefs) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const resp = await apiFetch("/api/profile/notify-prefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (resp.ok) {
          setStatus("saved");
          setToast({
            title: next.referralAsks ? "Referral emails on" : "Referral emails off",
            description: next.referralAsks
              ? "We will email you when someone asks you for a referral."
              : "We will not email you. New asks still appear in your referral desk.",
            variant: "success",
          });
          setTimeout(() => setStatus("idle"), 2000);
          return;
        }
        setStatus("error");
        setToast({
          title: "Could not save",
          description: "Your preference did not change. Try again.",
          variant: "error",
        });
      } catch {
        setStatus("error");
        setToast({
          title: "Could not save",
          description: "Your preference did not change. Try again.",
          variant: "error",
        });
      }
    }, 400);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await apiFetch("/api/profile/notify-prefs");
        if (!resp.ok || cancelled) return;
        const merged = { ...DEFAULTS, ...(await resp.json()) } as NotifyPrefs;
        prefsRef.current = merged;
        setOn(merged.referralAsks);
        try {
          localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(merged));
        } catch { /* private mode */ }
      } catch { /* keep the localStorage default */ }
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const toggle = () => {
    const next = { ...(prefsRef.current ?? DEFAULTS), referralAsks: !on };
    prefsRef.current = next;
    setOn(next.referralAsks);
    try {
      localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(next));
    } catch { /* private mode */ }
    void persist(next);
  };

  return (
    <div style={cardStyle}>
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Email me when someone asks</div>
            <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14, lineHeight: 1.55 }}>
              One email per ask. Without it an ask sits in your inbox until you happen to open this tab.
            </p>
          </div>
          <span role="status" aria-live="polite" style={{ fontSize: 12, flexShrink: 0, color: status === "error" ? "#dc2626" : "#15803d" }}>
            {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : status === "error" ? "Could not save" : ""}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          style={{
            marginTop: 16,
            border: "none",
            borderRadius: 999,
            width: 48,
            height: 28,
            padding: 0,
            background: on ? "#2563eb" : "#d1d5db",
            position: "relative",
            cursor: "pointer",
            transition: "background var(--md-duration-medium) var(--md-easing-standard)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 3,
              left: on ? 23 : 3,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fff",
              transition: "left var(--md-duration-medium) var(--md-easing-standard)",
            }}
          />
        </button>
      </div>
      {toast ? (
        <FeedbackToastCard
          variant={toast.variant}
          role={toast.variant === "error" ? "alert" : "status"}
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}