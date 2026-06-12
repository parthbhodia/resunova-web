"use client";

/**
 * Post-scan view for anonymous (signed-out) visitors.
 *
 * Shows the real overall score + per-category scores — the free taste — and
 * locks the deep report (flagged bullets, AI rewrites, top issues, PDF export,
 * saved history) behind Google sign-in. The finished result is already stashed
 * in localStorage (see lib/anonScan.ts), so after OAuth the user lands on their
 * unlocked report with no re-upload.
 */

import { useState } from "react";
import ScoreRing from "./ScoreRing";
import { scoreColor } from "@/lib/utils";
import { signInWithGoogle } from "@/lib/anonScan";

type TeaserCategoryScores = Record<string, number | null | undefined>;

export type AnonTeaserResult = {
  overallScore: number;
  categoryScores: TeaserCategoryScores;
  summary?: string;
  topIssues?: Array<{ issue: string }>;
  bulletAnalysis?: Array<unknown>;
  atsWarnings?: Array<unknown>;
  resumeHeader?: string[];
};

/** Must mirror the categoryScores keys emitted by the backend. */
const TEASER_CATEGORY_LABELS: Array<{ key: string; label: string }> = [
  { key: "readability", label: "Readability" },
  { key: "atsCompatibility", label: "ATS Compatibility" },
  { key: "achievementQuality", label: "Achievement Quality" },
  { key: "quantification", label: "Quantification" },
  { key: "sectionStructure", label: "Section Structure" },
  { key: "languageQuality", label: "Language Quality" },
  { key: "technicalBranding", label: "Technical Branding" },
  { key: "jobMatch", label: "Job Match" },
];

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function LockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function AnonReportTeaser({
  result,
  onNewScan,
}: {
  result: AnonTeaserResult;
  onNewScan: () => void;
}) {
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const flaggedBullets = Array.isArray(result.bulletAnalysis) ? result.bulletAnalysis.length : 0;
  const issueCount = Array.isArray(result.topIssues) ? result.topIssues.length : 0;
  const atsCount = Array.isArray(result.atsWarnings) ? result.atsWarnings.length : 0;
  const candidateName = result.resumeHeader?.[0]?.trim() || "";

  const categories = TEASER_CATEGORY_LABELS.filter(
    ({ key }) => typeof result.categoryScores?.[key] === "number",
  );

  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError(null);
    // Result is already stashed by AnalyzeResume's anon-stash effect — OAuth
    // redirect loses React state, never the report.
    const err = await signInWithGoogle();
    if (err) {
      setSignInError(err);
      setSigningIn(false);
    }
  };

  const lockedPerks: Array<[string, string]> = [
    [
      flaggedBullets > 0 ? `${flaggedBullets} flagged bullet${flaggedBullets === 1 ? "" : "s"} with AI rewrites` : "Line-by-line AI rewrites",
      "See exactly which lines hold your score down — and the rewritten versions.",
    ],
    [
      issueCount > 0 ? `${issueCount} prioritized issue${issueCount === 1 ? "" : "s"} to fix` : "Prioritized issues to fix",
      "Ranked by severity, with why each one matters to a recruiter.",
    ],
    [
      atsCount > 0 ? `${atsCount} ATS warning${atsCount === 1 ? "" : "s"}` : "ATS compatibility report",
      "Formatting and parsing problems applicant-tracking systems trip on.",
    ],
    ["Download the polished PDF", "WYSIWYG export of your improved résumé."],
    ["Saved history + 5 free scans/day", "Track your score as you improve. Still completely free."],
  ];

  return (
    <div
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        overflowY: "auto",
        background: "var(--bg)",
        padding: "36px 20px 80px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Score header — the free value, fully visible */}
        <div
          style={{
            textAlign: "center",
            padding: "30px 24px 26px",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-card)",
            marginBottom: 18,
          }}
        >
          {candidateName ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 14 }}>
              {candidateName}
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <ScoreRing score={result.overallScore} size={120} label="" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.4, color: scoreColor(result.overallScore), marginBottom: 8 }}>
            Overall score: {result.overallScore}/100
          </div>
          {result.summary ? (
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
              {result.summary}
            </p>
          ) : null}

          {/* Category bars — real numbers */}
          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px 24px", textAlign: "left" }}>
            {categories.map(({ key, label }) => {
              const score = result.categoryScores[key] as number;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)", letterSpacing: -0.15 }}>{label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: scoreColor(score), fontVariantNumeric: "tabular-nums" }}>{score}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: "var(--surface2)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(2, Math.min(100, score))}%`, height: "100%", borderRadius: 99, background: scoreColor(score) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Locked detail — the reason to sign in */}
        <div
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(47,129,247,0.3)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-card)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div style={{ padding: "18px 22px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: "var(--accent)", display: "inline-flex" }}><LockIcon size={15} /></span>
              <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.35, color: "var(--text)", margin: 0 }}>
                Your full report is ready
              </h2>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 14px" }}>
              Sign in free to unlock everything below — your finished scan is waiting on the other side, no re-upload.
            </p>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: "0 22px 16px" }}>
            {lockedPerks.map(([title, sub]) => (
              <li
                key={title}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--dim)", marginTop: 2, flexShrink: 0 }}><LockIcon /></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: -0.2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>{sub}</div>
                </div>
              </li>
            ))}
          </ul>

          <div style={{ padding: "0 22px 22px", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => { void handleSignIn(); }}
              disabled={signingIn}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                maxWidth: 420,
                padding: "14px 24px",
                borderRadius: 12,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: -0.2,
                cursor: signingIn ? "wait" : "pointer",
                fontFamily: "inherit",
                opacity: signingIn ? 0.7 : 1,
                boxShadow: "0 6px 24px rgba(47,129,247,0.35)",
              }}
            >
              <GoogleG /> {signingIn ? "Opening Google…" : "Sign in free — unlock my report"}
            </button>
            {signInError ? (
              <p style={{ fontSize: 12, color: "var(--red)", margin: "10px 0 0" }}>{signInError}</p>
            ) : null}
            <p style={{ fontSize: 11.5, color: "var(--dim)", margin: "10px 0 0", lineHeight: 1.5 }}>
              We only receive your email, name, and profile picture. No credit card, no paid tier.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={onNewScan}
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--muted)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "10px 18px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Scan a different résumé
          </button>
        </div>
      </div>
    </div>
  );
}
