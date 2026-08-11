"use client";

// Anonymous-scan capture — the moment of value.
//
// Measured 2026-08-10: 58% of three months' analyze volume is anonymous
// (70% Jun / 35% Jul / 75% Aug). Those visitors get a score and leave no row,
// no email and no history, so no digest, reward or streak can ever reach them.
// Capture is upstream of every retention mechanic.
//
// Before this, the ONLY sign-in ask for an anonymous visitor fired when they
// attempted a SECOND scan (`hasUsedAnonScan()` in AnalyzeResume). Someone who
// scanned once and left — which is the behaviour we are trying to change — was
// never asked at all.
//
// The carry-over machinery already exists and is load-bearing here: the finished
// result is stashed by AnalyzeResume on every anonymous result, survives the
// OAuth full-page unload, and is restored + persisted when the session lands.
// So signing in NEVER costs the user a re-scan — that is the whole promise of
// this prompt, and it is why the CTA can honestly say "keep this report".

import React, { useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { useResumeAnalyzeStore } from "@/store/resumeAnalyzeStore";
import { resumeFingerprint } from "./saveToProfile";
import { stashPrewallEvent } from "@/lib/clientEvents";
import { FREE_SCAN_DAILY_LIMIT } from "@/components/UpgradeDialog";

const SEEN_KEY = "rn_savescan_seen_v1";

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

function markSeen(fp: string) {
  try {
    const s = loadSeen();
    if (!s.includes(fp)) localStorage.setItem(SEEN_KEY, JSON.stringify([fp, ...s].slice(0, 50)));
  } catch {
    /* quota */
  }
}

export type SaveScanPromptProps = {
  /** True only for a signed-OUT visitor. A signed-in user has nothing to capture. */
  isAnon: boolean;
  /** The score just produced, for the headline. Null hides the number, not the prompt. */
  score?: number | null;
  /** Opens the shared sign-in modal. */
  onSignIn: () => void;
};

export default function SaveScanPrompt({ isAnon, score, onSignIn }: SaveScanPromptProps) {
  const sr = useResumeAnalyzeStore((s) => s.structuredResume);
  const fp = sr ? resumeFingerprint(sr) : "";
  const [hidden, setHidden] = useState(false);
  const lastFp = useRef<string>("");
  const shownFor = useRef<string>("");

  // A different résumé re-offers; one already dismissed stays hidden.
  useEffect(() => {
    if (fp === lastFp.current) return;
    lastFp.current = fp;
    setHidden(fp ? loadSeen().includes(fp) : false);
  }, [fp]);

  const visible = isAnon && !!sr && !!fp && !hidden;

  // Funnel denominator. Anonymous events cannot insert (client_events RLS keys
  // on auth.uid()), so this is stashed and flushed by flushPrewallEvents once a
  // session exists — the same path the pre-wall edit_click already uses.
  useEffect(() => {
    if (!visible || shownFor.current === fp) return;
    shownFor.current = fp;
    stashPrewallEvent("capture_prompt_shown", { score: score ?? null });
  }, [visible, fp, score]);

  if (!visible) return null;

  const save = () => {
    stashPrewallEvent("capture_signin_started", { score: score ?? null });
    onSignIn();
  };

  const dismiss = () => {
    stashPrewallEvent("capture_prompt_dismissed", { score: score ?? null });
    markSeen(fp);
    setHidden(true);
  };

  return (
    <div
      role="status"
      data-testid="save-scan-prompt"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        zIndex: 1100,
        maxWidth: "calc(100vw - 32px)",
        width: 460,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
      }}
    >
      <span style={{ color: "var(--accent)", display: "flex", flexShrink: 0 }}>
        <Lock size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
        {typeof score === "number" ? `Your score of ${score} lives only in this browser.` : "This report lives only in this browser."}
        <span style={{ color: "var(--muted)" }}>
          {" "}Save it free to keep your history and get {FREE_SCAN_DAILY_LIMIT} scans a day.
        </span>
      </div>
      <button
        onClick={save}
        style={{
          flexShrink: 0,
          padding: "7px 14px",
          borderRadius: 9,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Save my report
      </button>
      <button onClick={dismiss} aria-label="Dismiss" style={iconBtn}>
        <X size={15} />
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 7,
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
};
