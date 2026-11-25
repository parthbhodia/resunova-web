"use client";

/**
 * Job alert UI on the jobs page: the sidebar status card and the inline ask.
 * Both drive the one daily jobs email (notify_prefs.jobDigest) through the
 * JobAlertsPref that JobsFeed owns, so turning it on in one place updates all.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import {
  markSeenThisVisit,
  readNudgeState,
  recordDismissal,
  shouldAskNow,
  writeNudgeState,
  type JobAlertsPref,
} from "@/lib/jobAlerts";

const CARD: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
};

const FIRST_EMAIL_NOTE = "Your first email comes after the next batch of new jobs is added.";

export function JobAlertsCard({
  pref,
  criteria,
  onEditCriteria,
}: {
  pref: JobAlertsPref;
  criteria: string | null;
  onEditCriteria: () => void;
}) {
  const [justTurnedOn, setJustTurnedOn] = useState(false);
  if (pref.on === null) return null;
  const on = pref.on;

  async function toggle() {
    const next = !on;
    const ok = await pref.setOn(next);
    if (!ok) return;
    setJustTurnedOn(next);
    trackEvent(next ? "job_alert_enabled" : "job_alert_disabled", { place: "sidebar" });
  }

  return (
    <section aria-label="Job alerts" style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Job alerts</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 999,
            padding: "2px 8px",
            color: on ? "var(--green-ink, #116329)" : "var(--muted)",
            background: on ? "color-mix(in srgb, var(--green-ink, #16a34a) 14%, transparent)" : "var(--surface2)",
          }}
        >
          {on ? "Daily" : "Off"}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
        {on
          ? "Up to 20 new jobs a day, ranked against your résumé. We skip days with nothing new."
          : "Get the best new jobs by email, once a day. We only send when there's something new."}
      </p>
      <p style={{ fontSize: 12, color: "var(--dim)", margin: "8px 0 0" }}>
        {criteria ?? "Uses your latest résumé to pick roles"}
        {" · "}
        <button
          type="button"
          onClick={onEditCriteria}
          style={{ border: "none", background: "none", padding: 0, font: "inherit", color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
        >
          {criteria ? "Edit" : "Add role & location"}
        </button>
      </p>
      {justTurnedOn && on && (
        <p role="status" style={{ fontSize: 12, color: "var(--green-ink, #047857)", margin: "8px 0 0" }}>{FIRST_EMAIL_NOTE}</p>
      )}
      {pref.error && <p role="alert" style={{ fontSize: 12, color: "var(--red)", margin: "8px 0 0" }}>{pref.error}</p>}
      <Button
        variant={on ? "outline" : "default"}
        size="sm"
        style={{ marginTop: 12, width: "100%" }}
        disabled={pref.saving}
        onClick={() => void toggle()}
      >
        {pref.saving ? "Saving…" : on ? "Turn off" : "Turn on daily email"}
      </Button>
    </section>
  );
}

/**
 * The inline ask. `place` "feed" sits between job cards; "empty" sits under an
 * empty result. It follows the ask rules in lib/jobAlerts (one per visit, 14-day
 * snooze, stop after two "Not now"s) and never shows once alerts are on.
 */
export function JobAlertNudge({ pref, place }: { pref: JobAlertsPref; place: "feed" | "empty" }) {
  // Decided once, the first render after the preference loads (React's
  // "adjust state during render" pattern), so it can't flip mid-visit.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  if (allowed === null && pref.on !== null) {
    setAllowed(shouldAskNow(pref.on));
  }

  useEffect(() => {
    if (!allowed) return;
    markSeenThisVisit();
    trackEvent("job_alert_ask_shown", { place });
  }, [allowed, place]);

  if (done) {
    return (
      <div role="status" style={{ ...CARD, borderColor: "color-mix(in srgb, var(--green-ink, #16a34a) 40%, var(--border))" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>Daily jobs email is on</p>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{FIRST_EMAIL_NOTE} Turn it off anytime from the Job alerts card or Settings.</p>
      </div>
    );
  }
  if (!allowed || dismissed || pref.on !== false) return null;

  async function turnOn() {
    const ok = await pref.setOn(true);
    if (!ok) return;
    trackEvent("job_alert_enabled", { place });
    setDone(true);
  }

  function dismiss() {
    writeNudgeState(recordDismissal(readNudgeState(), Date.now()));
    trackEvent("job_alert_ask_dismissed", { place });
    setDismissed(true);
  }

  const title = place === "empty" ? "Nothing new here yet" : "Get the best new matches in your inbox";
  const body =
    place === "empty"
      ? "Turn on the daily jobs email and we'll send new matches as they're posted."
      : "Up to 20 new jobs a day that fit your role and location, ranked against your résumé. Only on days with something new.";

  return (
    <section
      aria-label="Job alerts"
      style={{ ...CARD, background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}
    >
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{title}</p>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{body}</p>
        {pref.error && <p role="alert" style={{ fontSize: 12, color: "var(--red)", margin: "6px 0 0" }}>{pref.error}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Button size="sm" disabled={pref.saving} onClick={() => void turnOn()}>
          {pref.saving ? "Saving…" : "Turn on daily email"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pref.saving} onClick={dismiss}>
          Not now
        </Button>
      </div>
    </section>
  );
}
