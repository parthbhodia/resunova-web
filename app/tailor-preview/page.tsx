"use client";

/**
 * Design preview for the Tailor redesign — one work queue, inline one-by-one
 * fixes, two numbers. Open /tailor-preview signed out; no backend, no LLM.
 * The fetches are simulated, but they drive the REAL TailorQueuePanel (queue,
 * scoreboard, inline TailorFixExpansion, staggered reveal), so what you review
 * here is what ships on /tailor-2.
 *
 * Try both paths:
 *  - Fix on "CI/CD pipeline experience": the row expands with two versions to
 *    pick from, Add to resume / Edit first / Ignore.
 *  - Fix everything: waves land, leftovers end explicit, never silent.
 */

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";
import type { FixSuggestion } from "@/components/tailor/TailorFixExpansion";
import { normalizeQueueName, type QueueItem } from "@/lib/tailorWorkQueue";
import type { RatingsData } from "@/lib/types";
import { FS, FW } from "@/lib/typography";

const DEMO_RATINGS: RatingsData = {
  match_score: 48,
  criteria: [],
  whats_working: [
    "Five years of production LLM systems, exactly the stack the team runs.",
    "Real security clearance work (SOCOM) most applicants can't claim.",
    "Quantified outcomes on every role, which recruiters read first.",
  ],
  gaps: [],
  verdict: "Fair fit, with standout depth in LLM engineering.",
  overall_score: 48,
  role_context: [
    { text: "Hybrid role in Sunnyvale", analysis: "Your profile lists Baltimore; expect a relocation question." },
  ],
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
      { text: "CI/CD pipeline experience", analysis: "Not on your resume yet. You have related work to draw from." },
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
    contextual: { found: [], missing: ["advertisers", "publishers"] },
    found_count: 57,
    total_count: 69,
  },
};

/**
 * The requirements the deterministic scorer extracted from this posting.
 *
 * The harness used to omit these, so the panel never issued a score-preview
 * request and the queue it showed was the rater's short list only — i.e. the
 * design surface could not show the queue that actually ships. They carry a
 * `type` each, because that is what bands a missing degree apart from a
 * missing tool. Without a backend the request fails and the panel degrades to
 * the rater-only queue, which is itself worth being able to see here.
 */
const DEMO_CONCEPTS = [
  { id: "rc1", canonical: "CI/CD pipeline experience", type: "experience", importance: "required" },
  { id: "rc2", canonical: "Build systems (Bazel-class)", type: "tool", importance: "required" },
  { id: "rc3", canonical: "Kubernetes", type: "tool", importance: "required" },
  { id: "rc4", canonical: "Improve developer workflows", type: "responsibility", importance: "required" },
  { id: "rc5", canonical: "BS in Computer Science", type: "degree", importance: "required" },
  { id: "rc6", canonical: "Bazel", type: "tool", importance: "preferred" },
  { id: "rc7", canonical: "developer productivity domain", type: "domain_knowledge", importance: "preferred" },
];

const DEMO_RESUME_TEXT = [
  "Senior Fullstack Developer",
  "Designed a LangGraph multi-agent workflow for SOCOM-approved security analysis, building LLM enrichment services for severity classification.",
  "Deployed an LLM gateway with LiteLLM, routing traffic across model providers.",
  "Built the internal IPT tool dashboard used by four teams.",
].join("\n");

/** Scripted rewrite options per item, keyed by normalized name. */
const DEMO_SUGGESTIONS: Record<string, FixSuggestion[]> = {
  "ci/cd pipeline experience": [
    {
      id: "d1",
      section: "Adds CI/CD to this bullet",
      original:
        "Designed a LangGraph multi-agent workflow for SOCOM-approved security analysis, building LLM enrichment services for severity classification.",
      suggested:
        "Designed a LangGraph multi-agent workflow for SOCOM-approved security analysis, building LLM enrichment services for severity classification, deployed through a CI/CD pipeline that re-runs the full analysis suite on every merge.",
      reason: "Based on your SOCOM security project. Nothing invented.",
      priority: "high",
    },
    {
      id: "d2",
      section: "Shorter rewrite",
      original:
        "Designed a LangGraph multi-agent workflow for SOCOM-approved security analysis, building LLM enrichment services for severity classification.",
      suggested:
        "Built a SOCOM-approved security analysis workflow with automated CI/CD deployment, including LLM enrichment for severity classification.",
      reason: "Same project, tighter phrasing.",
      priority: "high",
    },
  ],
  kubernetes: [
    {
      id: "d3",
      section: "Experience",
      original:
        "Deployed an LLM gateway with LiteLLM, routing traffic across model providers.",
      suggested:
        "Deployed an LLM gateway with LiteLLM on Kubernetes, routing traffic across model providers.",
      reason: "The gateway manifests were already Kubernetes. Names it.",
      priority: "medium",
    },
  ],
};

export default function TailorPreviewPage() {
  const [ratings, setRatings] = useState<RatingsData>(DEMO_RATINGS);
  const [addressed, setAddressed] = useState<ReadonlySet<string>>(new Set());
  const [ignored, setIgnored] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<readonly string[]>([]);
  const [stale, setStale] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const bumpFound = useCallback((n: number) => {
    setRatings((r) => {
      if (!r.keywords) return r;
      return {
        ...r,
        keywords: {
          ...r.keywords,
          found_count: (r.keywords.found_count ?? 0) + n,
          total_count: r.keywords.total_count ?? 0,
        },
      };
    });
    setStale(true);
  }, []);

  const fetchFixSuggestions = useCallback(
    (item: QueueItem) =>
      new Promise<FixSuggestion[]>((resolve) => {
        timers.current.push(
          setTimeout(() => resolve(DEMO_SUGGESTIONS[normalizeQueueName(item.name)] ?? []), 1200),
        );
      }),
    [],
  );

  const applyFixSuggestion = useCallback(
    (item: QueueItem) =>
      new Promise<void>((resolve) => {
        timers.current.push(
          setTimeout(() => {
            setAddressed((prev) => new Set([...prev, item.name]));
            bumpFound(1);
            resolve();
          }, 400),
        );
      }),
    [bumpFound],
  );

  const onToggleIgnored = useCallback((item: QueueItem, ign: boolean) => {
    setIgnored((prev) => {
      const next = new Set(prev);
      const key = normalizeQueueName(item.name);
      if (ign) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const runPass = useCallback(() => {
    if (busy) return;
    const open = [
      "CI/CD pipeline experience",
      "Build systems (Bazel-class)",
      "Improve developer workflows",
      "Kubernetes",
    ].filter((n) => !addressed.has(n) && !ignored.has(normalizeQueueName(n)));
    setBusy(true);
    setPending([...open, "advertisers", "publishers"]);
    let t = 0;
    for (const name of open) {
      t += 900;
      later(t, () => {
        setAddressed((prev) => new Set([...prev, name]));
        bumpFound(1);
        setPending((prev) => prev.filter((p) => p !== name));
      });
    }
    later(t + 600, () => {
      setPending([]);
      setBusy(false);
    });
  }, [busy, addressed, ignored, bumpFound]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    window.location.reload();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 64px" }}>
        <h1 style={{ fontSize: FS.h3, fontWeight: FW.bold, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
          Tailor results: focus on what matters first
        </h1>
        <p style={{ margin: "0 0 6px", color: "var(--muted)", fontSize: FS.bodyLg, maxWidth: "68ch" }}>
          Design preview, no backend. Start with the five highest-priority gaps, open the reason
          only when you need it, and review every suggested claim before it reaches your résumé.
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

        <TailorQueuePanel
          ratings={ratings}
          addressedGaps={addressed}
          fixAllBusy={busy}
          pendingGapNames={pending}
          onFixAll={runPass}
          fetchFixSuggestions={fetchFixSuggestions}
          applyFixSuggestion={applyFixSuggestion}
          ignoredNames={ignored}
          onToggleIgnored={onToggleIgnored}
          stale={stale}
          onRecheck={() => setStale(false)}
          recheckBusy={false}
          requirementConcepts={DEMO_CONCEPTS}
          currentResumeText={DEMO_RESUME_TEXT}
          onInterviewPrep={() => window.alert("Opens interview prep with this resume and JD carried over.")}
        />
      </div>
    </div>
  );
}
