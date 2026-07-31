"use client";

/**
 * Design preview for the Tailor redesign — one work queue, two numbers.
 * Open /tailor-preview signed out; no backend, no LLM. The pass is simulated,
 * but it drives the REAL lib (deriveWorkQueue/withStatus/queueCounts) and the
 * REAL components that will mount into the Tailor results page, so what you
 * review here is what ships.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";
import { deriveWorkQueue, withStatus, type QueueItem } from "@/lib/tailorWorkQueue";
import type { RatingsData } from "@/lib/types";
import { FS, FW } from "@/lib/typography";

const DEMO_RATINGS: RatingsData = {
  match_score: 48,
  criteria: [],
  whats_working: [],
  gaps: [],
  verdict: "Fair fit",
  overall_score: 48,
  job_title: {
    matched: false,
    jd_title: "Software Engineer III, Engineering Productivity",
    resume_title: "Senior Fullstack Developer",
    score: 25,
    detail: "",
  },
  qualifications: {
    score: 40,
    covered: [],
    missing: [
      { text: "CI/CD pipeline experience", analysis: "Not named; bridge from the SOCOM analysis tooling." },
      { text: "Build systems (Bazel-class)", analysis: "Closest support: frontend build tooling on Project Spectrum." },
    ],
  },
  responsibilities: {
    score: 55,
    covered: [],
    missing: [
      { text: "Improve developer workflows", context: "Closest match: the internal IPT tool dashboard." },
    ],
  },
  keywords: {
    direct_skills: { found: ["Python", "TypeScript"], missing: ["Kubernetes"] },
    contextual: { found: [], missing: ["advertisers", "publishers", "networking"] },
    found_count: 57,
    total_count: 69,
  },
};

/** Scripted outcome per item, in queue order: what the real pass would report. */
const OUTCOMES: Record<string, { status: QueueItem["status"]; detail: string; gain: number }> = {
  "qualification:ci/cd pipeline experience": {
    status: "applied", gain: 2,
    detail: "Woven into the SOCOM bullet: the pipeline now re-runs the analysis suite on every merge.",
  },
  "qualification:build systems (bazel-class)": {
    status: "needs_review", gain: 1,
    detail: "Aggressive stretch: “build-caching” mirrors the JD, not your history. Confirm or edit before sending.",
  },
  "responsibility:improve developer workflows": {
    status: "applied", gain: 1,
    detail: "Added to the summary; it matches the role's own title.",
  },
  "keyword:kubernetes": {
    status: "applied", gain: 1,
    detail: "Named on the LiteLLM gateway bullet, where the manifests already were.",
  },
  "contextual:advertisers": {
    status: "not_coverable", gain: 0,
    detail: "Google's business domain, not a skill. Recruiters don't expect it in your bullets.",
  },
  "contextual:publishers": {
    status: "not_coverable", gain: 0,
    detail: "Employer-domain word. Add only if a real project touched it.",
  },
  "contextual:networking": {
    status: "not_coverable", gain: 0,
    detail: "No supporting project found. Left out rather than stuffed.",
  },
};

export default function TailorPreviewPage() {
  const [items, setItems] = useState<QueueItem[]>(() => deriveWorkQueue(DEMO_RATINGS, new Set()));
  const [found, setFound] = useState(57);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passRan, setPassRan] = useState(false);
  const [stale, setStale] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const runPass = useCallback(() => {
    setBusy(true);
    let t = 0;
    const order = deriveWorkQueue(DEMO_RATINGS, new Set());
    for (const it of order) {
      const out = OUTCOMES[it.id];
      if (!out) continue;
      const step = out.status === "not_coverable" ? 500 : 950;
      later(t, () => setWorkingId(it.id));
      t += step;
      later(t, () => {
        setItems((prev) => withStatus(prev, it.id, out.status, out.detail));
        if (out.gain > 0) {
          setFound((f) => f + out.gain);
          setStale(true);
        }
      });
    }
    later(t + 50, () => {
      setWorkingId(null);
      setBusy(false);
      setPassRan(true);
    });
  }, []);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setItems(deriveWorkQueue(DEMO_RATINGS, new Set()));
    setFound(57);
    setWorkingId(null);
    setBusy(false);
    setPassRan(false);
    setStale(false);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 64px" }}>
        <h1 style={{ fontSize: FS.h3, fontWeight: FW.bold, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Tailor redesign preview: one queue, two numbers
        </h1>
        <p style={{ margin: "0 0 6px", color: "var(--muted)", fontSize: FS.bodyLg, maxWidth: "68ch" }}>
          Design preview, no backend. Press <b>Fix everything</b>: the match counter ticks per accepted
          change, the grade tile stays put and dates itself, and every item ends in an explicit state.
        </p>
        <p style={{ margin: "0 0 20px", fontSize: FS.small, color: "var(--dim)" }}>
          <Link href="/" style={{ color: "var(--accent)" }}>← Back to the app</Link>
          {" · "}
          <button
            type="button"
            onClick={reset}
            style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: FS.small, textDecoration: "underline" }}
          >
            Reset the demo
          </button>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <TailorScoreboard
            found={found}
            total={69}
            grade={75}
            gradedAtLabel="2:41 PM"
            stale={stale}
            onRecheck={() => setStale(false)}
          />
          <TailorWorkQueue
            items={items}
            workingId={workingId}
            passRan={passRan}
            fixAllBusy={busy}
            onFixAll={runPass}
            onItemAction={() => undefined}
            onDownload={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}
