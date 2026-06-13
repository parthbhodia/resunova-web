"use client";

/**
 * JobDetail — in-place job detail view (/?view=jobs&job=<id>).
 *
 * Left: job header + full JD. Right: dark match panel (score ring, matched /
 * missing requirements, "Boost my résumé"). Clicking Boost opens a right-side
 * slide-over (BoostPanel) IN PLACE — no navigation. Generate is stubbed for
 * now; the panel collects section choices, per-section notes, and which
 * missing keywords to inject.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJobDetail, companyLogoUrl, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import { stashBoostHandoff, canBoost } from "@/lib/boostPrefill";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobDetailData };

function formatSalary(job: JobDetailData): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const cur = job.salaryCurrency === "USD" || !job.salaryCurrency ? "$" : `${job.salaryCurrency} `;
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`);
  const lo = job.salaryMin ?? job.salaryMax;
  const hi = job.salaryMax ?? job.salaryMin;
  if (lo == null || hi == null) return null;
  return lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(lo)}–${fmt(hi)}`;
}

function formatPostedAt(iso: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

function scoreLabel(score: number | null): string {
  if (score == null) return "SCAN TO MATCH";
  if (score >= 70) return "STRONG MATCH";
  if (score >= 50) return "GOOD MATCH";
  if (score >= 30) return "PARTIAL MATCH";
  return "LOW MATCH";
}

export default function JobDetail({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [boostOpen, setBoostOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const job = await fetchJobDetail(jobId);
      setState({ status: "ready", job });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load job" });
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const backToFeed = () => router.push("/?view=jobs");

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 64px", width: "100%" }}>
      {/* breadcrumb */}
      <button
        onClick={backToFeed}
        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginBottom: 18 }}
      >
        <span style={{ fontSize: 13.5, color: "var(--muted)" }}>‹ Back to Jobs</span>
      </button>

      {state.status === "loading" && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 16 }}>
            <Skeleton className="h-[150px] w-full rounded-2xl" />
            <Skeleton className="h-[320px] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] w-[340px] rounded-2xl" />
        </div>
      )}

      {state.status === "error" && (
        <Card>
          <CardContent style={{ padding: "32px 28px", textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 14px" }}>Couldn&apos;t load this job: {state.message}</p>
            <Button variant="outline" onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {state.status === "ready" && (
        <JobBody job={state.job} onBoost={() => setBoostOpen(true)} />
      )}

      {state.status === "ready" && boostOpen && (
        <BoostPanel job={state.job} onClose={() => setBoostOpen(false)} />
      )}
    </div>
  );
}

function JobBody({ job, onBoost }: { job: JobDetailData; onBoost: () => void }) {
  const salary = formatSalary(job);
  const posted = formatPostedAt(job.postedAt);
  const logo = companyLogoUrl(job.source, job.companySlug);
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* LEFT */}
      <div style={{ flex: "1 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <CardContent style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: "#26221f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logo && logoOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={job.company} width={64} height={64} onError={() => setLogoOk(false)} style={{ objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 30, fontWeight: 700, color: "#ee8c5c" }}>{(job.company || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  {posted && <Badge variant="secondary" style={{ fontSize: 11 }}>Posted {posted}</Badge>}
                  {job.isActive && <Badge variant="secondary" style={{ fontSize: 11 }}>Actively hiring</Badge>}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.2 }}>{job.title}</h1>
                <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>{job.company}</div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--surface2)" }} />
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 13, color: "var(--text)" }}>
              {job.location && <span>📍 {job.location}</span>}
              <span>🕑 Full-time</span>
            </div>
            {salary && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <Badge style={{ fontSize: 13, background: "var(--accent-bg)", color: "var(--accent)", border: "none" }}>{salary}/yr</Badge>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Listed by the company on its careers page</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>About this role</h2>
            <div style={{ fontSize: 13.5, lineHeight: 1.62, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {job.jdText || "No description available for this posting."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — match panel */}
      <div style={{ width: 340, flexShrink: 0, position: "sticky", top: 16 }}>
        <MatchPanel job={job} onBoost={onBoost} />
      </div>
    </div>
  );
}

function MatchPanel({ job, onBoost }: { job: JobDetailData; onBoost: () => void }) {
  const score = job.matchScore;
  const ringColor = score == null ? "#9aa0a6" : score >= 70 ? "#4ddb9e" : score >= 50 ? "#e0a35c" : "#d98";
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const ring = `conic-gradient(${ringColor} ${pct * 3.6}deg, rgba(255,255,255,0.12) 0deg)`;

  return (
    <div style={{ borderRadius: 18, padding: "28px 24px", background: "linear-gradient(160deg, #131311 0%, #1a2a22 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 128, height: 128, borderRadius: "50%", background: ring, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#15201b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{score == null ? "—" : `${score}%`}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "#fff" }}>{scoreLabel(score)}</div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.62)", textAlign: "center" }}>
        {score == null
          ? "Scan your résumé to see how you match this role."
          : `Your résumé matches ${job.matchedCount} of ${job.totalRequirements} extracted requirements`}
      </div>

      {job.totalRequirements > 0 && (
        <>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ width: "100%", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)" }}>
            REQUIREMENTS · {job.matchedCount}/{job.totalRequirements} MATCHED
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%" }}>
            {[...job.matched.map((m) => ({ ...m, ok: true })), ...job.missing.map((m) => ({ ...m, ok: false }))]
              .slice(0, 14)
              .map((r, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 12, background: r.ok ? "rgba(77,219,158,0.14)" : "rgba(255,255,255,0.07)", color: r.ok ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)" }}>
                  <span style={{ color: r.ok ? "#6be8ad" : "#ff9e8c", fontWeight: 600 }}>{r.ok ? "✓" : "✗"}</span>
                  {r.canonical}
                </span>
              ))}
          </div>
        </>
      )}

      {job.missing.length > 0 && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.55)", width: "100%" }}>
          Tailoring can close {job.missing.length} missing requirement{job.missing.length === 1 ? "" : "s"} using your real experience.
        </div>
      )}

      <button
        onClick={onBoost}
        style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 2 }}
      >
        ✦ Boost my résumé
      </button>
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.92)", fontSize: 13.5, fontWeight: 600, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}
      >
        Apply on company site ↗
      </a>
    </div>
  );
}

// ─── Boost slide-over (Generate stubbed) ───────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Work Experience",
  projects: "Projects",
};

function BoostPanel({ job, onClose }: { job: JobDetailData; onClose: () => void }) {
  const router = useRouter();
  const sections = job.resumeSections.length ? job.resumeSections : ["summary", "skills"];
  const [selected, setSelected] = useState<Set<string>>(() => new Set(sections.filter((s) => s !== "projects")));
  const [expDepth, setExpDepth] = useState<"quick" | "full">("quick");
  const [keywords, setKeywords] = useState<Set<string>>(() => new Set());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const toggleSection = (s: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleKeyword = (k: string) =>
    setKeywords((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const total = job.injectableKeywords.length;
  const ready = canBoost(job);

  const handleGenerate = () => {
    if (!ready) {
      router.push("/?view=analyze");
      return;
    }
    stashBoostHandoff({
      resumeText: job.resumeText,
      structuredResume: job.structuredResume,
      jd: job.jdText,
      company: job.company,
      role: job.title,
      sections: [...selected],
      keywords: [...keywords],
      notes,
      depth: expDepth,
    });
    // Hand off to the existing tailor builder (intent=job prefills résumé + JD).
    router.push("/?view=builder&flow=tailor&intent=job");
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "100vw", background: "var(--bg)", zIndex: 61, display: "flex", flexDirection: "column", boxShadow: "-8px 0 28px rgba(0,0,0,0.12)" }}>
        {/* header */}
        <div style={{ padding: "20px 24px 16px", background: "var(--surface)", borderBottom: "1px solid var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--accent)", fontSize: 16 }}>✦</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Boost my résumé</span>
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--muted)" }}>✕</button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Tailoring for {job.title} · {job.company}</div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
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
        <div style={{ padding: "16px 24px 20px", background: "var(--surface)", borderTop: "1px solid var(--surface2)", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleGenerate}
            disabled={selected.size === 0 && keywords.size === 0}
            style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, opacity: selected.size === 0 && keywords.size === 0 ? 0.55 : 1, cursor: selected.size === 0 && keywords.size === 0 ? "not-allowed" : "pointer" }}
          >
            {ready ? "Generate tailored résumé →" : "Scan your résumé first"}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
            {selected.size} section{selected.size === 1 ? "" : "s"} · {keywords.size} keyword{keywords.size === 1 ? "" : "s"} selected · opens the tailor with this job loaded
          </div>
        </div>
      </div>
    </>
  );
}

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
