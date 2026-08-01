"use client";

// After a scan, the résumé the user just analyzed is already the one the Jobs
// feed ranks against — so the top matches exist for free (deterministic
// server-side scoring, zero LLM tokens). This surfaces them at the moment of
// highest intent: "your resume scored X, and here's where it can go."
//
// Self-contained like SaveToProfilePrompt: reads the analyze store, fetches
// its own data, renders a fixed dismissible toast (bottom-right, so the two
// prompts never collide). It shows ONLY when the feed comes back
// résumé-ranked for a signed-in user; anonymous scans and role-browse
// fallbacks render nothing — no fake personalization.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, X, ArrowRight } from "lucide-react";
import { useResumeAnalyzeStore } from "@/store/resumeAnalyzeStore";
import { resumeFingerprint } from "./saveToProfile";
import { apiFetch } from "@/lib/apiClient";
import { FS } from "@/lib/typography";
import type { JobFeedItem, JobFeedResponse } from "@/lib/jobsApi";

const SEEN_KEY = "rn_topjobs_seen_v1";
const TOP_N = 5;
/** Below this deterministic match, a "top job for you" claim isn't honest. */
const MIN_SCORE = 40;

function loadSeen(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}
function markSeen(fp: string) {
  try {
    const s = loadSeen();
    if (!s.includes(fp)) sessionStorage.setItem(SEEN_KEY, JSON.stringify([fp, ...s].slice(0, 20)));
  } catch {
    /* quota */
  }
}

export default function TopJobsToast() {
  const sr = useResumeAnalyzeStore((s) => s.structuredResume);
  const fp = sr ? resumeFingerprint(sr) : "";
  // Result is stamped with the fingerprint it was fetched for, so a résumé
  // switch never paints the previous résumé's matches.
  const [result, setResult] = useState<{ fp: string; jobs: JobFeedItem[]; total: number } | null>(null);
  const [dismissedFps, setDismissedFps] = useState<readonly string[]>(() => loadSeen());
  const fetchedFor = useRef<string>("");

  useEffect(() => {
    if (!fp || fp === fetchedFor.current) return;
    fetchedFor.current = fp;
    if (loadSeen().includes(fp)) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch("/api/jobs/feed");
        if (!resp.ok) return;
        const data = await resp.json() as JobFeedResponse;
        // Only a résumé-ranked feed can honestly claim "top jobs for you".
        if (cancelled || data.ranked !== true || !Array.isArray(data.jobs)) return;
        const top = data.jobs
          .filter((j) => typeof j.matchScore === "number" && j.matchScore >= MIN_SCORE)
          .slice(0, TOP_N);
        if (top.length === 0) return;
        setResult({ fp, jobs: top, total: data.jobs.length });
      } catch {
        /* the toast is a bonus — never an error surface */
      }
    })();
    return () => { cancelled = true; };
  }, [fp]);

  const jobs = result?.fp === fp ? result.jobs : null;
  const total = result?.fp === fp ? result.total : 0;
  if (!fp || dismissedFps.includes(fp) || !jobs || jobs.length === 0) return null;

  const dismiss = () => {
    markSeen(fp);
    setDismissedFps(loadSeen());
  };

  return (
    <div
      role="status"
      aria-label="Top matching jobs"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1090,
        width: 360,
        maxWidth: "calc(100vw - 32px)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
        <span style={{ color: "var(--accent)", display: "flex", flexShrink: 0 }}>
          <Briefcase size={17} />
        </span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {total >= TOP_N ? `${total}+ jobs match this resume` : "Jobs matching this resume"}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", display: "flex", padding: 4,
          }}
        >
          <X size={15} />
        </button>
      </div>
      <div style={{ padding: "0 8px" }}>
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/?view=jobs&job=${encodeURIComponent(j.id)}`}
            onClick={() => markSeen(fp)}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
              padding: "7px 8px",
              borderRadius: 9,
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block", fontSize: 13, fontWeight: 600,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {j.title}
              </span>
              <span
                style={{
                  display: "block", fontSize: FS.caption, color: "var(--muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {j.company}{j.location ? ` · ${j.location}` : ""}
              </span>
            </span>
            <span
              style={{
                fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: j.matchScore >= 70 ? "var(--green-ink, #16a34a)" : "var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              {Math.round(j.matchScore)}%
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/?view=jobs"
        onClick={() => markSeen(fp)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          margin: "6px 8px 10px", padding: "8px 12px", borderRadius: 9,
          background: "var(--accent)", color: "#fff",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
        }}
      >
        See all matches <ArrowRight size={14} />
      </Link>
    </div>
  );
}
