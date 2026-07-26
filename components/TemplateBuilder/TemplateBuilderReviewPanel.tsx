import React, { useCallback, useMemo, useState } from "react";
import type { TBResumeData } from "./types";
import { tbResumeToPlainText, tbResumeSignature } from "@/lib/tbResumeToText";
import { apiFetch } from "@/lib/apiClient";

export interface ReviewResult {
  overallScore: number | null;
  matchScore: number | null;
  categoryScores: Record<string, number | null>;
  missingKeywords: string[];
  topIssues: { issue: string; severity?: string; suggestion?: string }[];
  jd: string;
  signature: string;
}

const CATEGORY_LABELS: { key: string; label: string }[] = [
  { key: "atsCompatibility", label: "ATS Compatibility" },
  { key: "jobMatch", label: "Job Match" },
  { key: "quantification", label: "Quantification" },
  { key: "achievementQuality", label: "Achievement Quality" },
  { key: "readability", label: "Readability" },
  { key: "sectionStructure", label: "Structure" },
  { key: "languageQuality", label: "Language" },
  { key: "technicalBranding", label: "Branding" },
];

export function reviewScoreColor(s: number | null | undefined): string {
  if (s === null || s === undefined) return "var(--border)";
  if (s >= 80) return "var(--green, #16a34a)";
  if (s >= 60) return "var(--yellow, #d97706)";
  return "var(--red, #dc2626)";
}

function severityColor(sev?: string): string {
  if (sev === "high") return "var(--red, #dc2626)";
  if (sev === "medium") return "#d97706";
  return "var(--accent)";
}

function Gauge({ label, score }: { label: string; score: number | null }) {
  const color = reviewScoreColor(score);
  return (
    <div style={{ flex: "1 1 0", minWidth: 130, border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", background: "var(--bg)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{score ?? "—"}</span>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{score === null ? "" : "/100"}</span>
      </div>
    </div>
  );
}

function Bar({ label, score }: { label: string; score: number | null }) {
  const color = reviewScoreColor(score);
  const pct = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "var(--text)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score === null || score === undefined ? "N/A" : score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "var(--surface2, #eef0f3)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function TemplateBuilderReviewPanel({ data, result, onResult }: {
  data: TBResumeData;
  result: ReviewResult | null;
  onResult: (r: ReviewResult | null) => void;
}) {
  const [jd, setJd] = useState(result?.jd ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSignature = useMemo(() => tbResumeSignature(data), [data]);
  const stale = result != null && result.signature !== currentSignature;

  const run = useCallback(async () => {
    const resumeText = tbResumeToPlainText(data);
    if (resumeText.replace(/\s/g, "").length < 40) {
      setError("Add some résumé content first — fill in your experience, summary, or skills.");
      return;
    }
    if (!jd.trim()) {
      setError("Paste the job description you're targeting to score your résumé against it.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Anonymous is allowed here, subject to the per-IP daily limit; apiFetch
      // sends a token only when there is a session.
      const res = await apiFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_profile: resumeText, job_description: jd.trim(), include_bullet_analysis: true }),
      });
      const raw = await res.json().catch(() => ({} as Record<string, unknown>));
      if (res.status === 429) {
        setError((raw as { error?: string })?.error || "Daily scan limit reached. Sign in to keep scoring — it's free.");
        return;
      }
      if (!res.ok) throw new Error((raw as { error?: string })?.error || `Analysis failed (HTTP ${res.status})`);

      const ratings = ((raw as Record<string, unknown>).ratings || {}) as Record<string, unknown>;
      const kw = (ratings.keywords || {}) as {
        direct_skills?: { missing?: string[] };
        contextual?: { missing?: string[] };
        missing?: string[];
      };
      const missing = Array.from(new Set([
        ...(kw.direct_skills?.missing || []),
        ...(kw.contextual?.missing || []),
        ...(kw.missing || []),
      ].map((s) => String(s).trim()).filter(Boolean)));

      const r = raw as Record<string, unknown>;
      const built: ReviewResult = {
        overallScore: typeof r.overallScore === "number" ? r.overallScore : null,
        matchScore: typeof r.jdMatchScore === "number"
          ? (r.jdMatchScore as number)
          : (typeof ratings.match_score === "number" ? (ratings.match_score as number) : null),
        categoryScores: (r.categoryScores && typeof r.categoryScores === "object")
          ? (r.categoryScores as Record<string, number | null>)
          : {},
        missingKeywords: missing.slice(0, 24),
        topIssues: Array.isArray(r.topIssues)
          ? (r.topIssues as { issue: string; severity?: string; suggestion?: string; source?: string }[])
              .filter((t) => t && t.source !== "deterministic")
              .slice(0, 6)
          : [],
        jd: jd.trim(),
        signature: currentSignature,
      };
      onResult(built);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while scoring.");
    } finally {
      setLoading(false);
    }
  }, [data, jd, currentSignature, onResult]);

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6,
  };

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>ATS & Job Match</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Paste the job you&apos;re targeting to score your résumé against it — ATS readiness, category breakdown, missing keywords, and the top fixes.
      </p>

      <label style={labelStyle}>Job description</label>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job posting here…"
        style={{
          width: "100%", minHeight: 120, padding: "10px 12px", borderRadius: 8,
          border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)",
          fontSize: 12.5, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", outline: "none",
        }}
      />

      <button
        type="button"
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 10, width: "100%", padding: "10px 16px", borderRadius: 7, border: "none",
          background: loading ? "var(--surface2)" : "var(--accent)", color: loading ? "var(--muted)" : "#fff",
          fontSize: 13, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
        }}
      >
        {loading ? "Scoring your résumé…" : result ? "✦ Re-check résumé" : "✦ Check my résumé"}
      </button>

      {error && (
        <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 6, background: "rgba(220,38,38,0.1)", border: "1px solid var(--red, #dc2626)", color: "var(--red, #dc2626)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 18 }}>
          {stale && (
            <div style={{ marginBottom: 12, padding: "8px 11px", borderRadius: 6, background: "rgba(217,119,6,0.1)", border: "1px solid #d97706", color: "#b45309", fontSize: 11.5 }}>
              You&apos;ve edited your résumé since this check — re-run to update the scores.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <Gauge label="ATS Score" score={result.overallScore} />
            <Gauge label="Job Match" score={result.matchScore} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Category breakdown</div>
            {CATEGORY_LABELS.map(({ key, label }) => (
              <Bar key={key} label={label} score={result.categoryScores[key] ?? null} />
            ))}
          </div>

          {result.missingKeywords.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Missing keywords <span style={{ color: "var(--red, #dc2626)" }}>({result.missingKeywords.length})</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.missingKeywords.map((k) => (
                  <span key={k} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 20, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", color: "var(--text)" }}>
                    {k}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
                Weave the relevant ones into your experience bullets and skills — only where they&apos;re truthful.
              </p>
            </div>
          )}

          {result.topIssues.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Top fixes</div>
              {result.topIssues.map((t, i) => (
                <div key={i} style={{ marginBottom: 9, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: severityColor(t.severity), marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{t.issue}</div>
                      {t.suggestion && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{t.suggestion}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
