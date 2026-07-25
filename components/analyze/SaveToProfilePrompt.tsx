"use client";

// Profile-plan trigger #1 / Slice 5: right after an analysis, offer to save the
// extracted résumé to the user's Career Profile in one tap — the data already
// exists, so we just ask them to keep it. Self-contained: reads the analyze
// store itself and renders a fixed-position dismissible toast, so it does not
// depend on (or disturb) the AnalyzeResume workspace layout.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, X, ArrowRight } from "lucide-react";
import { useResumeAnalyzeStore } from "@/store/resumeAnalyzeStore";
import { extractedProfileFromStructured, resumeFingerprint } from "./saveToProfile";
import {
  saveExtractedProfile,
  loadProfile,
  saveProfile,
  mergeProfilePreferEmpty,
  tailorContactHintsFromExtracted,
} from "@/lib/profileStorage";
import { upsertExtractedProfile, upsertUserProfile } from "@/lib/supabase";

const SEEN_KEY = "rn_saveprofile_seen_v1";

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

export default function SaveToProfilePrompt() {
  const sr = useResumeAnalyzeStore((s) => s.structuredResume);
  const fp = sr ? resumeFingerprint(sr) : "";
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [hidden, setHidden] = useState(false);
  const lastFp = useRef<string>("");

  // A new analysis (different résumé) resets the prompt; a résumé already
  // saved/dismissed stays hidden.
  useEffect(() => {
    if (fp === lastFp.current) return;
    lastFp.current = fp;
    setStatus("idle");
    setHidden(fp ? loadSeen().includes(fp) : false);
  }, [fp]);

  if (!sr || !fp) return null;
  if (hidden && status !== "saved") return null;

  const doSave = async () => {
    setStatus("saving");
    try {
      const ext = extractedProfileFromStructured(sr);
      // Career-profile record (user_extracted_profiles).
      saveExtractedProfile(ext);
      await upsertExtractedProfile(ext);
      // Seed the Tailor-defaults contact fields (user_profiles), prefer-empty.
      const { next } = mergeProfilePreferEmpty(loadProfile(), tailorContactHintsFromExtracted(ext));
      saveProfile(next);
      await upsertUserProfile(next);
      markSeen(fp);
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  };

  const dismiss = () => {
    markSeen(fp);
    setHidden(true);
  };

  return (
    <div
      role="status"
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
      {status === "saved" ? (
        <>
          <span style={{ color: "var(--green, #10b981)", display: "flex" }}><CheckCircle2 size={18} /></span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)" }}>
            Saved to your Profile.
          </div>
          <Link
            href="/profile"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}
          >
            View Profile <ArrowRight size={13} />
          </Link>
          <button onClick={() => setHidden(true)} aria-label="Dismiss" style={iconBtn}><X size={15} /></button>
        </>
      ) : (
        <>
          <span style={{ color: "var(--accent)", display: "flex", flexShrink: 0 }}><Sparkles size={18} /></span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>
            Save this résumé to your Profile?
            <span style={{ color: "var(--muted)" }}> Reuse it across Tailor, Jobs &amp; Cover Letter.</span>
          </div>
          <button
            onClick={doSave}
            disabled={status === "saving"}
            style={{
              flexShrink: 0,
              padding: "7px 14px",
              borderRadius: 9,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: status === "saving" ? "default" : "pointer",
              opacity: status === "saving" ? 0.65 : 1,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {status === "saving" ? "Saving…" : "Save to Profile"}
          </button>
          <button onClick={dismiss} aria-label="Dismiss" style={iconBtn}><X size={15} /></button>
        </>
      )}
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
