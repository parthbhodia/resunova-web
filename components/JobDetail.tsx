"use client";

/**
 * JobDetail — in-place job detail view (/?view=jobs&job=<id>).
 *
 * Left: job header + full JD. Right: dark match panel (score ring, matched /
 * missing requirements, "Optimize my résumé"). Clicking it opens a right-side
 * slide-over (BoostPanel) with a 3-step in-place flow:
 *   Step 1 — See your difference (match diff summary)
 *   Step 2 — Align (section + keyword picks)
 *   Step 3 — Review & download (tailored résumé preview + PDF export)
 * No navigation to the builder.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJobDetail, scoreLabel, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import { fetchJobPrepStatuses, type JobPrepStatus } from "@/lib/supabase";
import { prefillPrepFromJob } from "@/lib/interviewPrepLaunch";
import BoostPanel from "@/components/BoostPanel";
import CompanyLogo from "@/components/CompanyLogo";
import InsiderPanel from "@/components/InsiderPanel";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobDetailData };

function formatSalary(job: JobDetailData): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const cur = job.salaryCurrency === "USD" || !job.salaryCurrency ? "$" : `${job.salaryCurrency} `;
  const period = job.salaryPeriod || "year";
  const hourly = period === "hour";
  const fmt = (n: number) =>
    hourly ? `${Math.round(n * 100) / 100}` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;
  const lo = job.salaryMin ?? job.salaryMax;
  const hi = job.salaryMax ?? job.salaryMin;
  if (lo == null || hi == null) return null;
  const suffix = hourly ? "/hr" : period === "month" ? "/mo" : period === "week" ? "/wk" : period === "day" ? "/day" : "/yr";
  const range = lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(lo)}–${fmt(hi)}`;
  return `${range}${suffix}`;
}

function formatApplicants(n: number | null): string {
  // First-party count (how many of our users applied). Per spec: show the exact
  // number only once it reaches 25; below that (incl. null/0) show the band.
  return n != null && n >= 25 ? `${n.toLocaleString()} applicants` : "Less than 25 applicants";
}

const WM_LABEL: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const SEN_LABEL: Record<string, string> = {
  intern: "Intern", entry: "Entry-level", mid: "Mid-level", senior: "Senior",
  lead: "Lead", principal: "Principal", director: "Director", executive: "Executive",
};

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

export default function JobDetail({ jobId, embedded = false }: { jobId: string; embedded?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [boostOpen, setBoostOpen] = useState(false);
  const [prepStatus, setPrepStatus] = useState<JobPrepStatus | null>(null);
  const [prepLaunching, setPrepLaunching] = useState(false);

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

  // Has the user already built a prep kit for this job? (signed-in only)
  useEffect(() => {
    let cancelled = false;
    void fetchJobPrepStatuses([jobId]).then((m) => { if (!cancelled) setPrepStatus(m[jobId] ?? null); });
    return () => { cancelled = true; };
  }, [jobId]);

  const onPrep = useCallback(() => {
    if (state.status !== "ready") return;
    setPrepLaunching(true);
    prefillPrepFromJob(state.job);
    router.push("/interview-prep/dashboard");
  }, [state, router]);

  const backToFeed = () => router.push("/?view=jobs");

  return (
    <div style={embedded
      ? { width: "100%", padding: "2px 2px 24px" }
      : { maxWidth: 1280, margin: "0 auto", padding: "24px 28px 64px", width: "100%" }}>
      {/* Embedded (split view): the list rail is alongside, so offer a compact
          close instead of a back breadcrumb. Standalone: full back breadcrumb. */}
      {embedded ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button
            onClick={backToFeed}
            aria-label="Close job detail"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: "5px 10px", fontSize: 12.5, color: "var(--muted)" }}
          >
            ✕ Close
          </button>
        </div>
      ) : (
        <button
          onClick={backToFeed}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginBottom: 18 }}
        >
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>‹ Back to Jobs</span>
        </button>
      )}

      {state.status === "loading" && (
        <div>
          {/* Opening an un-scored job triggers a live JD extraction (~a few
              seconds), so tell the user what the wait is for. */}
          <div style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--surface2)", borderTopColor: "var(--accent)", animation: "spin 0.9s linear infinite", display: "inline-block" }} />
            Scoring this job against your résumé…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 480px", display: "flex", flexDirection: "column", gap: 16 }}>
              <Skeleton className="h-[150px] w-full rounded-2xl" />
              <Skeleton className="h-[320px] w-full rounded-2xl" />
            </div>
            <Skeleton className="h-[420px] w-[340px] rounded-2xl" />
          </div>
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
        <JobBody
          job={state.job}
          embedded={embedded}
          onBoost={() => setBoostOpen(true)}
          onPrep={onPrep}
          prepStatus={prepStatus}
          prepLaunching={prepLaunching}
        />
      )}

      {/* Stays mounted while the job is loaded so the optimize step/result
          survives closing + reopening the slide-over (no re-generation). */}
      {state.status === "ready" && (
        <BoostPanel job={state.job} open={boostOpen} onClose={() => setBoostOpen(false)} />
      )}
    </div>
  );
}

function JobBody({
  job,
  embedded = false,
  onBoost,
  onPrep,
  prepStatus,
  prepLaunching,
}: {
  job: JobDetailData;
  embedded?: boolean;
  onBoost: () => void;
  onPrep: () => void;
  prepStatus: JobPrepStatus | null;
  prepLaunching: boolean;
}) {
  const salary = formatSalary(job);
  const posted = formatPostedAt(job.postedAt);
  // JD is collapsed by default (Google-style "Show full description") so a long
  // posting never dominates the panel. Only long JDs get the toggle.
  const [showFullJd, setShowFullJd] = useState(false);
  // Scraped JDs (esp. Greenhouse) arrive with huge runs of blank lines — the
  // real body often sits below 30+ empty lines. Rendered verbatim with
  // white-space:pre-wrap inside the 300px collapse, the clamp landed entirely
  // in that leading blank gap, so the panel looked empty (only the title
  // showed). Strip trailing whitespace per line + collapse blank-line runs so
  // the actual description surfaces immediately.
  const jdDisplay = (job.jdText || "")
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const jdLong = jdDisplay.length > 800;

  return (
    // Two equal columns that FILL the available width (no wasted right-hand
    // space). auto-fit collapses to a single column on narrow viewports / mobile
    // (non-embedded). Left = role header + scrollable JD; right = match + prep +
    // insider. alignItems:start keeps the right column pinned to the top while
    // the JD scrolls inside its own pane.
    <div style={{
      display: "grid",
      gridTemplateColumns: embedded ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr",
      gap: 24,
      alignItems: "start",
    }}>
      {/* LEFT — header + JD */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <CardContent style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <CompanyLogo company={job.company} companyDomain={job.companyDomain} slug={job.companySlug} size={64} radius={14} />
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
              {job.workModel && WM_LABEL[job.workModel] && <span>🏢 {WM_LABEL[job.workModel]}</span>}
              {job.seniority && SEN_LABEL[job.seniority] && <span>📈 {SEN_LABEL[job.seniority]}</span>}
              {formatApplicants(job.applicantCount) && <span>👥 {formatApplicants(job.applicantCount)}</span>}
              <span>🕑 Full-time</span>
            </div>
            {(salary || job.h1bSponsor || job.visaSponsorship === "yes") && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {salary && (
                  <Badge style={{ fontSize: 13, background: "var(--accent-bg)", color: "var(--accent)", border: "none" }}>{salary}</Badge>
                )}
                {(job.h1bSponsor || job.visaSponsorship === "yes") && (
                  <Badge style={{ fontSize: 13, background: "color-mix(in srgb, #16a34a 14%, transparent)", color: "#16a34a", border: "none" }}>
                    {job.h1bSponsor && job.h1bCertifiedCount
                      ? `H-1B sponsor · ${job.h1bCertifiedCount.toLocaleString()} approvals`
                      : "H-1B sponsor"}
                  </Badge>
                )}
                {salary && (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {job.salarySource === "jd" ? "Estimated from the job description" : "Listed by the company on its careers page"}
                  </span>
                )}
              </div>
            )}
            {job.h1bSponsor && job.h1bMedianWage != null && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                DOL H-1B median offered wage at this employer:{" "}
                <strong style={{ color: "var(--text)" }}>
                  ${Math.round(job.h1bMedianWage / 1000)}k/yr
                </strong>
              </div>
            )}
            {/* Primary action — apply on the source board (Google puts this up top). */}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  alignSelf: "flex-start", padding: "11px 22px", borderRadius: 10,
                  background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600,
                  textDecoration: "none", marginTop: 2,
                }}
              >
                Apply ↗
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>About this role</h2>
            {/* Collapsed by default (Google "Show full description") — a long JD no
                longer makes a wall; the panel itself scrolls, so we avoid a
                nested scroll region inside it. */}
            <div style={{ position: "relative" }}>
              <div style={{
                fontSize: 13.5, lineHeight: 1.62, color: "var(--muted)", whiteSpace: "pre-wrap",
                ...(jdLong && !showFullJd ? { maxHeight: 300, overflow: "hidden" } : {}),
              }}>
                {jdDisplay || "No description available for this posting."}
              </div>
              {jdLong && !showFullJd && (
                // Fade so the clamp reads as "more below", not a hard cut.
                <div aria-hidden style={{
                  position: "absolute", left: 0, right: 0, bottom: 0, height: 64, pointerEvents: "none",
                  background: "linear-gradient(to bottom, transparent, var(--surface))",
                }} />
              )}
            </div>
            {jdLong && (
              <button
                type="button"
                onClick={() => setShowFullJd((v) => !v)}
                style={{
                  marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--accent)",
                }}
              >
                {showFullJd ? "Show less ⌃" : "Show full description ⌄"}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — match panel + interview prep + insider outreach. A real grid
          column now (was a fixed 340px panel that wrapped below + left the right
          half of the page empty). */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <MatchPanel job={job} onBoost={onBoost} />
        <PrepCard job={job} onPrep={onPrep} prepStatus={prepStatus} prepLaunching={prepLaunching} />
        <InsiderPanel postingId={job.id} company={job.company} />
      </div>
    </div>
  );
}

function MatchPanel({ job, onBoost }: { job: JobDetailData; onBoost: () => void }) {
  const score = job.matchScore;
  const arcColor =
    score == null ? "var(--muted)"
    : score >= 70 ? "var(--green-ink, #34d399)"
    : score >= 50 ? "var(--amber-ink, #e0a35c)"
    : "var(--red-ink, #d97757)";
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));
  const ring = `conic-gradient(${arcColor} ${pct * 3.6}deg, var(--surface2) 0deg)`;

  // Order so the most decision-relevant requirements survive the collapsed view:
  // required gaps first, then required strengths, then preferred gaps, etc.
  // (the old code sliced [matched, missing] at 14 with matched first, which hid
  // the actionable missing requirements first — see avg 18.3 reqs/posting.)
  const reqs = useMemo(() => {
    const all = [
      ...job.matched.map((m) => ({ ...m, ok: true })),
      ...job.missing.map((m) => ({ ...m, ok: false })),
    ];
    const impRank = (s: string) => (s === "required" ? 0 : s === "preferred" ? 1 : 2);
    return all
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const ra = impRank(a.r.importance) * 2 + (a.r.ok ? 1 : 0);
        const rb = impRank(b.r.importance) * 2 + (b.r.ok ? 1 : 0);
        return ra - rb || a.i - b.i; // stable within the same rank
      })
      .map(({ r }) => r);
  }, [job.matched, job.missing]);

  const REQ_COLLAPSED = 12;
  const [showAllReqs, setShowAllReqs] = useState(false);
  const visibleReqs = showAllReqs ? reqs : reqs.slice(0, REQ_COLLAPSED);
  const hasReqChips = reqs.length > 0;
  const matchPct = job.totalRequirements > 0 ? Math.round((job.matchedCount / job.totalRequirements) * 100) : 0;
  const [boostHover, setBoostHover] = useState(false);
  // Brand warm accent (same terracotta as the Optimize CTA) — ties the progress
  // bar + "add these" chips to the action, for a cohesive tangy feel.
  const AMBER = "#c4793a";

  return (
    <div style={{ borderRadius: 18, padding: "28px 24px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 128, height: 128, borderRadius: "50%", background: ring, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text)" }}>{score == null ? "—" : `${score}%`}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text)" }}>{scoreLabel(score)}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
        {score == null
          ? "Scan your résumé to see how you match this role."
          : `Your résumé matches ${job.matchedCount} of ${job.totalRequirements} extracted requirements`}
      </div>

      {hasReqChips ? (
        <>
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted)" }}>
            <span>REQUIREMENTS</span>
            <span>{job.matchedCount}/{job.totalRequirements} MATCHED</span>
          </div>
          <div style={{ width: "100%", height: 7, borderRadius: 999, background: "var(--surface2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${matchPct}%`, background: AMBER, borderRadius: 999, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
          </div>
          <div style={{ width: "100%", fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>
            {job.missing.length === 0
              ? "Every requirement covered — you're ready to apply. ✦"
              : `You're ${matchPct}% there — add a few below to stand out.`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%" }}>
            {visibleReqs.map((r) => (
              <span
                key={`${r.ok ? "y" : "n"}-${r.canonical}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 999,
                  fontSize: 12, fontWeight: 500, lineHeight: 1,
                  background: r.ok ? "color-mix(in srgb, var(--green-ink, #34d399) 13%, transparent)" : "color-mix(in srgb, #c4793a 12%, transparent)",
                  border: r.ok
                    ? "1px solid color-mix(in srgb, var(--green-ink, #34d399) 30%, transparent)"
                    : "1px solid color-mix(in srgb, #c4793a 34%, transparent)",
                  color: "var(--text)",
                }}
              >
                <span style={{ color: r.ok ? "var(--green-ink, #34d399)" : AMBER, fontWeight: 700 }}>{r.ok ? "✓" : "+"}</span>
                {r.canonical}
              </span>
            ))}
          </div>
          {reqs.length > REQ_COLLAPSED && (
            <button
              onClick={() => setShowAllReqs((v) => !v)}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "2px 0", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
            >
              {showAllReqs ? "Show fewer" : `Show all ${reqs.length} requirements ›`}
            </button>
          )}
        </>
      ) : job.totalRequirements > 0 ? (
        <>
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />
          <div style={{ width: "100%", fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            {job.totalRequirements} requirement{job.totalRequirements === 1 ? "" : "s"} extracted from this posting.
            {score == null ? " Scan your résumé to see which ones you match." : ""}
          </div>
        </>
      ) : null}

      {job.missing.length > 0 && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", width: "100%" }}>
          One tap tailors your résumé to add {job.missing.length} of these — from your real experience.
        </div>
      )}

      <button
        onClick={onBoost}
        onMouseEnter={() => setBoostHover(true)}
        onMouseLeave={() => setBoostHover(false)}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: boostHover ? "#b06a30" : "#c4793a", color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: "pointer", marginTop: 2,
          transition: "background .15s ease, transform .15s ease, box-shadow .15s ease",
          transform: boostHover ? "translateY(-1px)" : "none",
          boxShadow: boostHover ? "0 6px 16px rgba(196,121,58,0.32)" : "none",
        }}
      >
        ✦ Optimize my résumé
      </button>
      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13.5, fontWeight: 600, textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}
      >
        Apply on company site ↗
      </a>
    </div>
  );
}

function PrepCard({
  job,
  onPrep,
  prepStatus,
  prepLaunching,
}: {
  job: JobDetailData;
  onPrep: () => void;
  prepStatus: JobPrepStatus | null;
  prepLaunching: boolean;
}) {
  const ready = !!prepStatus;
  return (
    <div style={{ borderRadius: 18, padding: "22px 24px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🎤</span>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Prepare for your interview</div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
        {ready
          ? `Your prep kit for ${job.company || "this role"} is ready — ${prepStatus!.questionCount} questions with STAR+R answers and best-story matches.`
          : `Generate company-specific questions for ${job.company || "this role"} from your résumé and this job description — with STAR+R answer structures.`}
      </div>
      <button
        onClick={onPrep}
        disabled={prepLaunching}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 10,
          border: ready ? "1px solid color-mix(in srgb, var(--green-ink) 40%, transparent)" : "none",
          background: ready ? "color-mix(in srgb, var(--green-ink) 12%, transparent)" : "var(--accent)",
          color: ready ? "var(--green-ink)" : "var(--accent-ink, #fff)",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: prepLaunching ? "wait" : "pointer",
          opacity: prepLaunching ? 0.7 : 1,
          boxSizing: "border-box",
        }}
      >
        {prepLaunching ? "Opening…" : ready ? "🎤 Open prep kit →" : "🎤 Generate prep kit"}
      </button>
    </div>
  );
}
