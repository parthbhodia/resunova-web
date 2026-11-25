"use client";

/**
 * Job alerts (the daily "new jobs for you" email) — the one preference behind
 * every alert ask on the jobs page.
 *
 * The preference is `user_profiles.notify_prefs.jobDigest`, read and written
 * through /api/profile/notify-prefs, the same endpoint the Settings toggle uses.
 *
 * ⚠️ ALWAYS POST THE WHOLE PREFS OBJECT. The API merges the body with its
 * DEFAULTS, not with what is stored, so posting `{ jobDigest: true }` alone would
 * reset accountChanges / features / referralAsks. `setOn` therefore refuses to
 * save until the current prefs have been read.
 *
 * The ask rules (`nudgeAllowed`) live here as pure functions so they are tested
 * without rendering: never once alerts are on, at most one ask per visit, wait
 * 14 days after "Not now", and stop asking after two dismissals.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

/** Shared with EmailPreferencesCard so Settings shows the new value at once. */
export const NOTIFY_PREFS_KEY = "rn_notify_prefs_v1";
export const NUDGE_STATE_KEY = "rn_job_alert_nudge_v1";
/** sessionStorage: set once an ask has been shown in this visit. */
export const NUDGE_SEEN_KEY = "rn_job_alert_nudge_seen";

export const NUDGE_SNOOZE_DAYS = 14;
export const NUDGE_MAX_DISMISSALS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export type NudgeState = { dismissals: number; lastDismissedAt: number | null };
export const EMPTY_NUDGE_STATE: NudgeState = { dismissals: 0, lastDismissedAt: null };

export function nudgeAllowed(
  digestOn: boolean | null,
  state: NudgeState,
  seenThisVisit: boolean,
  now: number,
): boolean {
  // null = not loaded yet; asking before we know would flash at people who are on.
  if (digestOn !== false) return false;
  if (seenThisVisit) return false;
  if (state.dismissals >= NUDGE_MAX_DISMISSALS) return false;
  if (state.lastDismissedAt !== null && now - state.lastDismissedAt < NUDGE_SNOOZE_DAYS * DAY_MS) return false;
  return true;
}

/** The ask rules applied to this browser's stored state, right now. */
export function shouldAskNow(digestOn: boolean | null): boolean {
  return nudgeAllowed(digestOn, readNudgeState(), seenThisVisit(), Date.now());
}

export function recordDismissal(state: NudgeState, now: number): NudgeState {
  return { dismissals: state.dismissals + 1, lastDismissedAt: now };
}

export function readNudgeState(): NudgeState {
  try {
    const raw = localStorage.getItem(NUDGE_STATE_KEY);
    if (!raw) return EMPTY_NUDGE_STATE;
    const parsed = JSON.parse(raw) as Partial<NudgeState>;
    return {
      dismissals: typeof parsed.dismissals === "number" ? parsed.dismissals : 0,
      lastDismissedAt: typeof parsed.lastDismissedAt === "number" ? parsed.lastDismissedAt : null,
    };
  } catch {
    return EMPTY_NUDGE_STATE;
  }
}

export function writeNudgeState(state: NudgeState): void {
  try { localStorage.setItem(NUDGE_STATE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export function seenThisVisit(): boolean {
  try { return sessionStorage.getItem(NUDGE_SEEN_KEY) === "1"; } catch { return false; }
}

export function markSeenThisVisit(): void {
  try { sessionStorage.setItem(NUDGE_SEEN_KEY, "1"); } catch { /* private mode */ }
}

/** "Full-stack engineer · United States" from the saved profile, or null. */
export function alertCriteria(roles: string, locations: string): string | null {
  const first = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
  const r = first(roles);
  const l = first(locations);
  const parts = [
    r.length ? r.slice(0, 2).join(", ") + (r.length > 2 ? ` +${r.length - 2}` : "") : "",
    l.length ? l.slice(0, 2).join(", ") + (l.length > 2 ? ` +${l.length - 2}` : "") : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export type JobAlertsPref = {
  /** null until the server value has loaded. */
  on: boolean | null;
  saving: boolean;
  error: string;
  setOn: (next: boolean) => Promise<boolean>;
};

type Prefs = Record<string, unknown>;

export function useJobAlertsPref(enabled = true): JobAlertsPref {
  const [on, setOnState] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const prefsRef = useRef<Prefs | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch("/api/profile/notify-prefs");
        if (!resp.ok || cancelled) return;
        const prefs = (await resp.json()) as Prefs;
        if (cancelled || !prefs || typeof prefs !== "object") return;
        prefsRef.current = prefs;
        setOnState(prefs.jobDigest === true);
      } catch { /* leave null: no asks, card shows nothing actionable */ }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  const setOn = useCallback(async (next: boolean) => {
    const current = prefsRef.current;
    if (!current) {
      setError("Couldn't load your email settings. Try again.");
      return false;
    }
    const body = { ...current, jobDigest: next };
    setSaving(true);
    setError("");
    try {
      const resp = await apiFetch("/api/profile/notify-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      prefsRef.current = body;
      setOnState(next);
      try {
        const raw = localStorage.getItem(NOTIFY_PREFS_KEY);
        const cached = raw ? (JSON.parse(raw) as Prefs) : {};
        localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify({ ...cached, jobDigest: next }));
      } catch { /* cache only */ }
      return true;
    } catch {
      setError("Couldn't save. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { on, saving, error, setOn };
}
