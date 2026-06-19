"use client";

/**
 * BoostPanel — right-side slide-over with the 3-step in-place "Optimize my résumé"
 * flow. Shared by the job detail page (JobDetail.tsx) and the job feed cards
 * (JobsFeed.tsx) so the Boost action works the same wherever it's launched.
 *
 *   Step 1 — See your difference (match diff summary)
 *   Step 2 — Align (section + keyword picks)
 *   Step 3 — Review & download (tailored résumé preview + PDF export)
 *
 * No navigation to the builder; everything happens in the slide-over.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { authHeaders, scoreLabel, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import { canBoost } from "@/lib/boostPrefill";
import { apiUrl } from "@/lib/utils";
import { useHtmlPdfExport } from "@/hooks/useHtmlPdfExport";
import AnalyzeLiveResumeBody from "@/components/AnalyzeLiveResumeBody";
import { GapFixSuggestionCard, type GapFixSuggestion } from "@/components/ratings/GapFixSuggestionCard";
import { resumeLayoutFromPreviewStyle, resumeLayoutCssVars, resumePageRootStyle, RESUME_BULLET_STYLESHEET } from "@/lib/resumeLayout";

// ─── Boost API response ────────────────────────────────────────────────────
// Contract mirrors resunova-api's /api/jobs/boost (docs/boost-frontend-spec.md).
// `BoostSuggestion` is a superset of the shared Tailor card's `GapFixSuggestion`
// so it renders through GapFixSuggestionCard verbatim, plus boost-only fields
// (`keyword`, `gainedRequirements`). NOTE: per backend GAP #1, `id` is NOT unique
// across the list — accept/reject state is keyed by list index, never by id.

type BoostSuggestion = GapFixSuggestion & {
  keyword?: string;
  gainedRequirements?: string[];
};

type BoostResult = {
  company: string;
  title: string;
  url: string;
  beforeScore: number;        // score with NO suggestions applied
  afterScore: number;         // score with ALL suggestions applied
  improved: boolean;          // gates the "match jumped" banner
  tailoredText: string;       // résumé text with all suggestions applied
  suggestions: BoostSuggestion[];
  changes?: BoostSuggestion[]; // legacy alias for `suggestions`
  appliedKeywords: string[];
  skippedKeywords: string[];
};

// Server-side deterministic re-score for a partial accepted subset. The match
// scorer is bucket-weighted + renormalized, so a suggestion's marginal value is
// non-linear and can't be summed honestly client-side — we round-trip instead.
type BoostScoreResult = { score?: number; gainedRequirements?: string[] };

const SECTION_LABELS: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Work Experience",
  projects: "Projects",
};

export default function BoostPanel({ job, onClose, open = true }: { job: JobDetailData; onClose: () => void; open?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step-2 state (section/keyword picks)
  const sections = job.resumeSections.length ? job.resumeSections : ["summary", "skills"];
  const [selected, setSelected] = useState<Set<string>>(() => new Set(sections.filter((s) => s !== "projects")));
  const [expDepth, setExpDepth] = useState<"quick" | "full">("quick");
  const [keywords, setKeywords] = useState<Set<string>>(() => new Set());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Step-3 state
  const [generating, setGenerating] = useState(false);
  const [boostResult, setBoostResult] = useState<BoostResult | null>(null);
  const [boostError, setBoostError] = useState<string | null>(null);

  // PDF export
  const previewRef = useRef<HTMLDivElement>(null);
  const { exportPdf, exporting: pdfExporting, error: pdfError } = useHtmlPdfExport();

  const toggleSection = (s: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleKeyword = (k: string) =>
    setKeywords((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const total = job.injectableKeywords.length;
  const ready = canBoost(job);

  const panelWidth = step === 3 ? 760 : 560;

  // Step 2 → 3: call /api/jobs/boost
  const handleGenerate = async () => {
    setStep(3);
    setGenerating(true);
    setBoostResult(null);
    setBoostError(null);
    try {
      const headers = await authHeaders();
      const resp = await fetch(apiUrl("/api/jobs/boost"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: job.id,
          keywords: [...keywords],
          sections: [...selected],
          notes,
          depth: expDepth,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { message?: string; error?: string; detail?: string };
        const msg = body.message || body.error || body.detail || `HTTP ${resp.status}`;
        setBoostError(msg);
        return;
      }
      const data = await resp.json() as BoostResult;
      setBoostResult(data);
    } catch (e) {
      setBoostError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!previewRef.current) return;
    const filename = `${(boostResult?.company ?? job.company).replace(/\s+/g, "-")}-${(boostResult?.title ?? job.title).replace(/\s+/g, "-")}-tailored.pdf`;
    void exportPdf(previewRef.current, filename, { highlightsEnabled: false });
  };

  // Stepper labels
  const stepLabels = ["See your difference", "Align", "Review"];

  // Keep the component mounted while closed so step/boostResult/picks survive a
  // reopen — re-running the boost just to see a result you already generated is
  // the bug this guards against. All hooks above run unconditionally.
  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60 }} />
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: panelWidth, maxWidth: "100vw",
          background: "var(--bg)", zIndex: 61,
          display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 28px rgba(0,0,0,0.12)",
          transition: "width 0.25s ease",
        }}
      >
        {/* header */}
        <div style={{ padding: "20px 24px 14px", background: "var(--surface)", borderBottom: "1px solid var(--surface2)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ color: "var(--accent)", fontSize: 16 }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Optimize my résumé</span>
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--muted)" }}>✕</button>
          </div>
          {/* stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {stepLabels.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const active = step === n;
              const done = step > n;
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? "var(--green-ink)" : active ? "var(--accent)" : "var(--surface2)",
                      color: done || active ? "#fff" : "var(--muted)",
                    }}>{done ? "✓" : n}</span>
                    <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "var(--text)" : "var(--muted)", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: "var(--surface2)", margin: "0 8px" }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Tailoring for {job.title} · {job.company}</div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── STEP 1: See your difference ── */}
          {step === 1 && (
            <Step1
              job={job}
              ready={ready}
              onNext={() => setStep(2)}
              onScanFirst={() => router.push("/?view=analyze")}
            />
          )}

          {/* ── STEP 2: Align ── */}
          {step === 2 && (
            <Step2
              job={job}
              sections={sections}
              selected={selected}
              toggleSection={toggleSection}
              expDepth={expDepth}
              setExpDepth={setExpDepth}
              keywords={keywords}
              toggleKeyword={toggleKeyword}
              total={total}
              noteFor={noteFor}
              setNoteFor={setNoteFor}
              notes={notes}
              setNotes={setNotes}
              onBack={() => setStep(1)}
              onGenerate={() => void handleGenerate()}
            />
          )}

          {/* ── STEP 3: Review & download ── */}
          {step === 3 && (
            <Step3
              generating={generating}
              result={boostResult}
              error={boostError}
              previewRef={previewRef}
              pdfExporting={pdfExporting}
              pdfError={pdfError}
              onDownload={handleDownloadPdf}
              onRetry={() => setStep(2)}
              jobUrl={job.url}
              postingId={job.id}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────

function Step1({ job, ready, onNext, onScanFirst }: {
  job: JobDetailData;
  ready: boolean;
  onNext: () => void;
  onScanFirst: () => void;
}) {
  const score = job.matchScore;
  const scoreColor = score == null ? "var(--muted)" : score >= 70 ? "var(--green-ink)" : score >= 50 ? "#e0a35c" : "#d97757";
  const CAP = 8;
  const [showAllMatched, setShowAllMatched] = useState(false);
  const [showAllGaps, setShowAllGaps] = useState(false);
  const visMatched = showAllMatched ? job.matched : job.matched.slice(0, CAP);
  const visGaps = showAllGaps ? job.missing : job.missing.slice(0, CAP);
  const toggleStyle = { alignSelf: "flex-start" as const, background: "none", border: "none", padding: "2px 0", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--accent)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* score summary */}
      <div style={{ background: "var(--surface)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {score == null ? "—" : `${score}%`}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{scoreLabel(score)}</span>
        </div>
        {score != null && (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            You match <strong style={{ color: "var(--text)" }}>{job.matchedCount}</strong> of <strong style={{ color: "var(--text)" }}>{job.totalRequirements}</strong> requirements for this role.
          </p>
        )}
      </div>

      {/* matched */}
      {job.matched.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)" }}>YOU HAVE</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {visMatched.map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, fontSize: 12.5, background: "rgba(var(--green-ink-rgb, 4,120,87),0.08)", color: "var(--text)", border: "1px solid rgba(var(--green-ink-rgb, 4,120,87),0.18)" }}>
                <span style={{ color: "var(--green-ink)", fontWeight: 700 }}>✓</span>
                {r.canonical}
              </span>
            ))}
          </div>
          {job.matched.length > CAP && (
            <button onClick={() => setShowAllMatched((v) => !v)} style={toggleStyle}>
              {showAllMatched ? "Show fewer" : `Show all ${job.matched.length} ›`}
            </button>
          )}
        </div>
      )}

      {/* missing — framed as an encouraging "add these" list, not failures */}
      {job.missing.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)" }}>ADD THESE TO LEVEL UP</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {visGaps.map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 500, background: "color-mix(in srgb, #c4793a 12%, transparent)", color: "var(--text)", border: "1px solid color-mix(in srgb, #c4793a 34%, transparent)" }}>
                <span style={{ color: "#c4793a", fontWeight: 700 }}>+</span>
                {r.canonical}
              </span>
            ))}
          </div>
          {job.missing.length > CAP && (
            <button onClick={() => setShowAllGaps((v) => !v)} style={toggleStyle}>
              {showAllGaps ? "Show fewer" : `Show all ${job.missing.length} ›`}
            </button>
          )}
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            One tap tailors your résumé to add <strong style={{ color: "var(--text)" }}>{job.missing.length}</strong> of these — from your real experience.
          </p>
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 4 }}>
        {ready ? (
          <button
            onClick={onNext}
            style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
          >
            Improve my résumé for this job →
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0 }}>
              Scan your résumé first so we have text to tailor.
            </p>
            <button
              onClick={onScanFirst}
              style={{ padding: "12px 28px", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Scan your résumé →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────

function Step2({ job, sections, selected, toggleSection, expDepth, setExpDepth, keywords, toggleKeyword, total, noteFor, setNoteFor, notes, setNotes, onBack, onGenerate }: {
  job: JobDetailData;
  sections: string[];
  selected: Set<string>;
  toggleSection: (s: string) => void;
  expDepth: "quick" | "full";
  setExpDepth: (d: "quick" | "full") => void;
  keywords: Set<string>;
  toggleKeyword: (k: string) => void;
  total: number;
  noteFor: string | null;
  setNoteFor: (s: string | null) => void;
  notes: Record<string, string>;
  setNotes: Dispatch<SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
        {/* section 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeading n={1} title="Choose sections to enhance" />
          {sections.map((s) => {
            const on = selected.has(s);
            return (
              <div key={s} style={{ border: `1px solid ${on ? "var(--accent)" : "var(--surface2)"}`, borderRadius: 12, padding: "12px 14px", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Checkbox on={on} onClick={() => toggleSection(s)} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{SECTION_LABELS[s] || s}</span>
                  <button onClick={() => setNoteFor(noteFor === s ? null : s)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
                    {notes[s] ? "✎ note" : "+ note"}
                  </button>
                </div>
                {noteFor === s && (
                  <textarea
                    value={notes[s] || ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [s]: e.target.value }))}
                    placeholder="Optional: how should we steer this section? e.g. 'emphasize fintech work'"
                    rows={2}
                    style={{ width: "100%", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--surface2)", background: "var(--bg)", color: "var(--text)", resize: "vertical", boxSizing: "border-box" }}
                  />
                )}
                {s === "experience" && on && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <RadioOpt on={expDepth === "quick"} onClick={() => setExpDepth("quick")} title="Quick Edit" sub="First 2 key experiences · faster" />
                    <RadioOpt on={expDepth === "full"} onClick={() => setExpDepth("full")} title="Full Edit" sub="All experiences · longer processing time" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* section 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeading n={2} title="Add missing skill keywords" badge={`${keywords.size} / ${total}`} />
          <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Pulled from this job&apos;s requirements your résumé doesn&apos;t mention yet. Pick the ones you can honestly back up — tailoring weaves them into your real experience.
          </p>
          {total === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>No missing concrete keywords — your résumé already covers this role&apos;s hard requirements.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {job.injectableKeywords.map((k) => {
                const on = keywords.has(k);
                return (
                  <button key={k} onClick={() => toggleKeyword(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, fontSize: 12.5, cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--surface2)"}`, background: on ? "var(--accent-bg)" : "var(--surface)", color: on ? "var(--accent)" : "var(--text)", fontWeight: 500 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{on ? "✓" : "+"}</span>
                    {k}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div style={{ padding: "16px 0 4px", borderTop: "1px solid var(--surface2)", display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
        <button
          onClick={onGenerate}
          disabled={selected.size === 0 && keywords.size === 0}
          style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, opacity: selected.size === 0 && keywords.size === 0 ? 0.55 : 1, cursor: selected.size === 0 && keywords.size === 0 ? "not-allowed" : "pointer" }}
        >
          Generate tailored résumé →
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", padding: 0 }}>
            ‹ Back
          </button>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {selected.size} section{selected.size === 1 ? "" : "s"} · {keywords.size} keyword{keywords.size === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────

function Step3({ generating, result, error, previewRef, pdfExporting, pdfError, onDownload, onRetry, jobUrl, postingId }: {
  generating: boolean;
  result: BoostResult | null;
  error: string | null;
  previewRef: RefObject<HTMLDivElement | null>;
  pdfExporting: boolean;
  pdfError: string | null;
  onDownload: () => void;
  onRetry: () => void;
  jobUrl: string;
  postingId: string;
}) {
  // ── Accept/reject + live-score state (all hooks run before any early return) ──
  const suggestions = useMemo<BoostSuggestion[]>(
    () => (result ? (result.suggestions ?? result.changes ?? []) : []),
    [result],
  );
  const total = suggestions.length;

  // Keyed by list index — backend GAP #1: `id` is not unique across the list.
  const [accepted, setAccepted] = useState<boolean[]>([]);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreUnavailable, setScoreUnavailable] = useState(false);

  // Reset selections whenever a fresh boost result arrives. Default: all applied,
  // matching afterScore + the all-applied `tailoredText` the backend returns.
  useEffect(() => {
    setAccepted(suggestions.map(() => true));
    setDrafts(suggestions.map((s) => s.suggested));
    setLiveScore(null);
    setScoreUnavailable(false);
  }, [suggestions]);

  const acceptedCount = accepted.filter(Boolean).length;
  const beforeScore = result?.beforeScore ?? 0;
  const afterScore = result?.afterScore ?? beforeScore;

  // Debounced server re-score for in-between selections (anchors are known).
  useEffect(() => {
    if (!result || total === 0) return;
    if (acceptedCount === total || acceptedCount === 0) { setScoring(false); return; }
    let cancelled = false;
    setScoring(true);
    const timer = setTimeout(async () => {
      try {
        const subset = suggestions
          .map((s, i) => ({ original: s.original, suggested: drafts[i] ?? s.suggested, keep: accepted[i] }))
          .filter((x) => x.keep)
          .map(({ original, suggested }) => ({ original, suggested }));
        const headers = await authHeaders();
        const resp = await fetch(apiUrl("/api/jobs/boost/score"), {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ posting_id: postingId, suggestions: subset }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as BoostScoreResult;
        if (!cancelled && typeof data.score === "number") {
          setLiveScore(data.score);
          setScoreUnavailable(false);
        }
      } catch {
        if (!cancelled) setScoreUnavailable(true); // endpoint not deployed yet → degrade honestly
      } finally {
        if (!cancelled) setScoring(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [accepted, drafts, acceptedCount, total, suggestions, postingId, result]);

  // Text fed to the preview + PDF, reflecting accept/reject + edits. Best-effort:
  // the backend's `tailoredText` already has every suggestion applied, so we
  // revert rejected ones (append → remove, rewrite → restore original) and swap
  // in any edited draft. Only touches text we can match verbatim.
  const appliedText = useMemo(() => {
    if (!result) return "";
    let text = result.tailoredText;
    suggestions.forEach((s, i) => {
      if (!s.suggested || !text.includes(s.suggested)) return;
      const replacement = accepted[i]
        ? (drafts[i] ?? s.suggested)
        : (s.action_type === "append" ? "" : s.original);
      text = text.replace(s.suggested, replacement);
    });
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  }, [result, suggestions, accepted, drafts]);

  const toggle = (i: number) => setAccepted((a) => a.map((v, j) => (j === i ? !v : v)));
  const setDraft = (i: number, t: string) => setDrafts((d) => d.map((v, j) => (j === i ? t : v)));

  if (generating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, flex: 1, minHeight: 260, color: "var(--muted)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--surface2)", borderTopColor: "var(--accent)", animation: "spin 0.9s linear infinite" }} />
        <span style={{ fontSize: 14, color: "var(--muted)" }}>Tailoring your résumé… ~15s</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", paddingTop: 32 }}>
        <span style={{ fontSize: 28 }}>⚠️</span>
        <p style={{ fontSize: 13.5, color: "var(--text)", textAlign: "center", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>{error}</p>
        <button
          onClick={onRetry}
          style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!result) return null;

  const improved = result.improved ?? (total > 0 && afterScore > beforeScore);
  const partial = total > 0 && acceptedCount !== total && acceptedCount !== 0;

  // Headline score: anchors are exact; in-between comes from the server re-score
  // (falls back to the all-applied projection until that endpoint is live).
  const headlineScore = acceptedCount === total ? afterScore
    : acceptedCount === 0 ? beforeScore
    : (liveScore ?? afterScore);
  const scoreColor = headlineScore >= 70 ? "var(--green-ink)" : headlineScore >= 50 ? "#e0a35c" : "var(--muted)";
  const previewCtx = resumeLayoutFromPreviewStyle("classic");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* ── Match banner — gated on `improved` ── */}
      {improved ? (
        <div style={{ background: "var(--surface)", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted)" }}>BEFORE</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--muted)", lineHeight: 1 }}>{beforeScore}%</span>
          </div>
          <span style={{ fontSize: 22, color: "var(--muted)" }}>→</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted)" }}>
              {acceptedCount === total ? "AFTER" : "NOW"}
            </span>
            <span style={{ fontSize: 36, fontWeight: 700, color: scoreColor, lineHeight: 1, opacity: scoring ? 0.55 : 1, transition: "opacity 0.15s" }}>
              {headlineScore}%
            </span>
          </div>
          <span style={{ fontSize: 13, color: "var(--muted)", flex: 1, minWidth: 120 }}>
            {scoring
              ? "Re-scoring…"
              : partial && scoreUnavailable
                ? <>Showing the projected score with all {total} suggestions — live per-selection scoring is rolling out.</>
                : <>Your match {headlineScore > beforeScore ? "is up" : "is"} from <strong style={{ color: "var(--text)" }}>{beforeScore}%</strong> to <strong style={{ color: scoreColor }}>{headlineScore}%</strong> with {acceptedCount} of {total} suggestions applied.</>}
          </span>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>No honest improvements to apply</span>
          <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
            {result.skippedKeywords.length > 0
              ? <>Skipped — couldn&apos;t honestly support: {result.skippedKeywords.join(", ")}. Your match stays at <strong style={{ color: "var(--text)" }}>{beforeScore}%</strong>.</>
              : <>Your résumé already covers what this posting asks for, or the remaining gaps can&apos;t be closed truthfully. Match: <strong style={{ color: "var(--text)" }}>{beforeScore}%</strong>.</>}
          </span>
        </div>
      )}

      {/* ── Suggestions — shared Tailor card + accept/reject + gained-requirement chips ── */}
      {improved && total > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)" }}>
              SUGGESTIONS · {acceptedCount}/{total} APPLIED
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setAccepted(suggestions.map(() => true))} style={linkBtnStyle}>Accept all</button>
            <span style={{ color: "var(--surface2)" }}>·</span>
            <button onClick={() => setAccepted(suggestions.map(() => false))} style={linkBtnStyle}>Clear</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <GapFixSuggestionCard
                  suggestion={s}
                  index={i}
                  checked={accepted[i] ?? true}
                  onToggleCheck={() => toggle(i)}
                  draftText={drafts[i] ?? s.suggested}
                  onDraftChange={(t) => setDraft(i, t)}
                />
                {(s.gainedRequirements?.length ?? 0) > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 2px" }}>
                    {s.gainedRequirements!.map((req) => (
                      <span key={req} style={{
                        fontSize: 10.5, fontWeight: 600, color: "var(--green-ink)",
                        background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: 20, padding: "2px 9px",
                      }}>+ {req}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {result.skippedKeywords.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Skipped (couldn&apos;t honestly support): {result.skippedKeywords.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* tailored résumé preview — same formatted/annotated viewer as Analyze,
          rendered from the tailored text (not a raw blob). previewRef stays on
          the paper root so the Chromium PDF export captures this exact DOM. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)" }}>TAILORED RÉSUMÉ</span>
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--surface2)",
            background: "var(--surface2)",
            padding: 14,
            maxHeight: 560,
            overflowY: "auto",
          }}
        >
          {/* AnalyzeLiveResumeBody is itself a full padded paper, so this PDF-capture
              wrapper drops its own padding to avoid a doubled margin that squeezes the
              text column on narrow (mobile) panels. */}
          <div ref={previewRef} style={{ ...resumePageRootStyle(previewCtx, { showShadow: false }), ...resumeLayoutCssVars(previewCtx), padding: 0 }}>
            <style dangerouslySetInnerHTML={{ __html: RESUME_BULLET_STYLESHEET }} />
            <AnalyzeLiveResumeBody
              extractedText={appliedText}
              bulletAnalysis={[]}
              activeCategory={null}
              rewriteEdits={{}}
              patchBulletRewrite={() => {}}
              previewLineOverrides={{}}
              patchPreviewLine={() => {}}
              structuredResume={null}
              structuredResumeAuthoritative
              flatTextFallback
              presentationOnly
              highlightsEnabled={false}
            />
          </div>
        </div>
      </div>

      {/* action row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={onDownload}
          disabled={pdfExporting}
          style={{ flex: "1 1 180px", padding: "13px 0", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: pdfExporting ? "wait" : "pointer", opacity: pdfExporting ? 0.7 : 1 }}
        >
          {pdfExporting ? "Exporting…" : "⬇ Download PDF"}
        </button>
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: "1 1 180px", padding: "13px 0", borderRadius: 11, border: "1px solid var(--surface2)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", display: "block" }}
        >
          Apply on company site ↗
        </a>
      </div>

      {(pdfError) && (
        <p style={{ fontSize: 12, color: "#d97757", margin: 0 }}>PDF export failed: {pdfError}</p>
      )}
    </div>
  );
}

const linkBtnStyle: CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontSize: 11.5, fontWeight: 600, color: "var(--accent)",
};

function SectionHeading({ n, title, badge }: { n: number; title: string; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--text)", color: "var(--bg)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</span>
      {badge && <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", background: "var(--surface2)", padding: "3px 9px", borderRadius: 999 }}>{badge}</span>}
    </div>
  );
}

function Checkbox({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${on ? "var(--accent)" : "var(--surface2)"}`, background: on ? "var(--accent)" : "var(--bg)", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {on ? "✓" : ""}
    </button>
  );
}

function RadioOpt({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, cursor: "pointer", textAlign: "left", border: "none", background: on ? "var(--accent-bg)" : "var(--surface2)" }}>
      <span style={{ width: 16, height: 16, borderRadius: 999, border: `${on ? 5 : 1.5}px solid ${on ? "var(--accent)" : "var(--muted)"}`, background: "var(--bg)", flexShrink: 0 }} />
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{sub}</span>
      </span>
    </button>
  );
}
