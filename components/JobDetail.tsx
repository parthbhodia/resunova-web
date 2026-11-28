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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useSignInDialog } from "@/components/SignInDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJobDetail, peekJobDetail, scoreLabel, trackJobEvent, type JobDetail as JobDetailData } from "@/lib/jobsApi";
import { fetchJobPrepStatuses, getSupabaseClient, type JobPrepStatus } from "@/lib/supabase";
import { goToFreeScan, stashAnalyzeJd } from "@/lib/anonScan";
import { prefillPrepFromJob } from "@/lib/interviewPrepLaunch";
import BoostPanel from "@/components/BoostPanel";
import CompanyLogo from "@/components/CompanyLogo";
import { apiFetch } from "@/lib/apiClient";
import { FREE_SCAN_DAILY_LIMIT } from "@/lib/planLimits";
import { useResumeEpoch } from "@/hooks/useResumeEpoch";
import { JobChip, JobDescriptionBlocks, JobFact } from "@/components/jobs/JobPresentation";
import JobApplyLink from "@/components/jobs/JobApplyLink";
import { SEN_LABEL, WM_LABEL, formatPostedAt, formatSalaryFull } from "@/lib/jobFacts";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; job: JobDetailData };

function formatApplicants(n: number | null): string {
  // First-party count (how many of our users applied). Per spec: show the exact
  // number only once it reaches 25; below that (incl. null/0) show the band.
  return n != null && n >= 25 ? `${n.toLocaleString()} applicants` : "Less than 25 applicants";
}

// ── Small inline icons (no emoji — consistent 1.7 stroke) ────────────────────
const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.7" /></svg>
);
const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M14 5h5v5M19 5l-8 8M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconClose = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
);
const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5Z" /></svg>
);
const IconMic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconPlus = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
);
const IconArrowR = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}><path d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** A small labeled value pill used in the "Job details" block. */
export default function JobDetail({ jobId, embedded = false }: { jobId: string; embedded?: boolean }) {
  const router = useRouter();
  const { openSignIn } = useSignInDialog();
  // A job the feed already warmed on hover opens straight into content —
  // flashing a skeleton over data we hold would be theatre.
  const [state, setState] = useState<LoadState>(() => {
    const warm = peekJobDetail(jobId);
    return warm ? { status: "ready", job: warm } : { status: "loading" };
  });
  const [boostOpen, setBoostOpen] = useState(false);
  const [prepStatus, setPrepStatus] = useState<JobPrepStatus | null>(null);
  const [prepLaunching, setPrepLaunching] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const load = useCallback(async ({ force = false } = {}) => {
    const warm = !force && peekJobDetail(jobId);
    if (warm) {
      setState({ status: "ready", job: warm });
      return;
    }
    setState({ status: "loading" });
    try {
      const job = await fetchJobDetail(jobId, { force });
      setState({ status: "ready", job });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to load job" });
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The résumé this pane was scored against can change while it is open: an
  // upload in the feed beside it, Optimize's "Use as my résumé", or a scan in
  // Analyze. Refetch in place rather than through `load`, which would show the
  // skeleton and unmount an open Optimize panel mid-task. A failed refetch
  // keeps what is on screen; the next open fetches again.
  const resumeEpoch = useResumeEpoch();
  const seenEpoch = useRef(resumeEpoch);
  const currentJobId = useRef(jobId);
  useEffect(() => {
    currentJobId.current = jobId;
  }, [jobId]);
  useEffect(() => {
    if (resumeEpoch === seenEpoch.current) return;
    seenEpoch.current = resumeEpoch;
    const id = jobId;
    void fetchJobDetail(id, { force: true }).then(
      (job) => {
        if (currentJobId.current === id) setState({ status: "ready", job });
      },
      () => {},
    );
  }, [resumeEpoch, jobId]);

  // Optimize keeps its step and result while mounted, so reopening it does not
  // re-run it. Once the résumé underneath changes that result is the old
  // résumé's, so the panel is re-keyed to the résumé the pane now shows. Only
  // while it is closed: an open panel is never pulled away from someone.
  const paneResume = state.status === "ready" ? state.job.resumeAnalysisId ?? "" : "";
  const [boostResume, setBoostResume] = useState(paneResume);
  if (!boostOpen && paneResume !== boostResume) setBoostResume(paneResume);

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

  const updateJobMatchScore = useCallback((postingId: string, score: number) => {
    setState((prev) =>
      prev.status === "ready" && prev.job.id === postingId
        ? { ...prev, job: { ...prev.job, matchScore: score } }
        : prev,
    );
  }, []);

  const trackApplyClick = useCallback(async (postingId: string) => {
    try {
      await apiFetch("/api/jobs/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posting_id: postingId, event: "apply_click" }),
        keepalive: true,
      });
    } catch {
      /* tracking must never block applying */
    }
  }, []);

  const handleBoostApplied = useCallback((postingId: string, score: number | null) => {
    if (typeof score === "number") updateJobMatchScore(postingId, score);
    void trackApplyClick(postingId);
  }, [trackApplyClick, updateJobMatchScore]);

  // Signed-out visitors get an "Upload your résumé" CTA (the boost flow needs a
  // résumé) instead of the résumé-dependent "Optimize" action — see MatchPanel.
  useEffect(() => {
    const sb = getSupabaseClient();
    let active = true;
    sb.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // Preserve the feed's filter params (the feed serializes country/date/work
  // model/etc. into the URL) — only drop the `job` selection. A bare
  // "/?view=jobs" push was resetting every filter on Back.
  const backToFeed = () => {
    const p = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    p.delete("job");
    p.set("view", "jobs");
    router.push(`/?${p.toString()}`);
  };

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
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: "5px 10px", fontSize: 13, color: "var(--muted)" }}
          >
            <IconClose /> Close
          </button>
        </div>
      ) : (
        <button
          onClick={backToFeed}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "2px 0", marginBottom: 18 }}
        >
          <span style={{ fontSize: 14, color: "var(--muted)" }}>‹ Back to Jobs</span>
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
            <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 14px" }}>Couldn&apos;t load this job: {state.message}</p>
            <Button variant="outline" onClick={() => void load({ force: true })}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {state.status === "ready" && (
        <JobBody
          job={state.job}
          embedded={embedded}
          signedIn={signedIn}
          onBoost={() => setBoostOpen(true)}
          onPrep={onPrep}
          prepStatus={prepStatus}
          prepLaunching={prepLaunching}
          onContactSignIn={() => openSignIn({ ask: "contacts" })}
        />
      )}

      {/* Stays mounted while the job is loaded so the optimize step/result
          survives closing + reopening the slide-over (no re-generation). */}
      {state.status === "ready" && (
        <BoostPanel
          key={boostResume}
          job={state.job}
          open={boostOpen}
          onClose={() => setBoostOpen(false)}
          onApplied={handleBoostApplied}
          onScoreChange={updateJobMatchScore}
        />
      )}
    </div>
  );
}

/**
 * "Apply on company site" in the job pane. A signed-out visitor gets the shared
 * Apply popup (a résumé check, or "Continue to application"), never a sign-in
 * wall; everyone else goes straight to the employer. Leaving for the employer
 * also records the click in the tracker, which is a no-op for a guest.
 */
function ApplyLink({
  job,
  signedIn,
  style,
  children,
}: {
  job: JobDetailData;
  signedIn: boolean | null;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <JobApplyLink
      job={{ id: job.id, company: job.company, url: job.url, jd: job.jdText }}
      place="job_detail"
      signedIn={signedIn}
      style={style}
      onFollow={() => void trackJobEvent(job.id, "apply_click")}
    >
      {children}
    </JobApplyLink>
  );
}

function JobBody({
  job,
  embedded = false,
  signedIn,
  onBoost,
  onPrep,
  prepStatus,
  prepLaunching,
  onContactSignIn,
}: {
  job: JobDetailData;
  embedded?: boolean;
  signedIn: boolean | null;
  onBoost: () => void;
  onPrep: () => void;
  prepStatus: JobPrepStatus | null;
  prepLaunching: boolean;
  onContactSignIn: () => void;
}) {
  const salaryFull = formatSalaryFull(job);
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
      {/* LEFT — header + job details + full description */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header — title → company → location·work-model → salary·type → apply */}
        <Card>
          <CardContent style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <CompanyLogo company={job.company} companyDomain={job.companyDomain} slug={job.companySlug} size={56} radius={12} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0, lineHeight: 1.2 }}>{job.title}</h1>
                <div style={{ marginTop: 6 }}>
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
                    >
                      {job.company} <IconExternal />
                    </a>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{job.company}</span>
                  )}
                </div>
                {(job.location || (job.workModel && WM_LABEL[job.workModel]) || job.locationMismatch) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 14, color: "var(--muted)", flexWrap: "wrap" }}>
                    {(job.location || (job.workModel && WM_LABEL[job.workModel])) && (
                      <>
                        <IconPin />
                        <span>
                          {job.location}
                          {job.location && job.workModel && WM_LABEL[job.workModel] ? "  ·  " : ""}
                          {job.workModel && WM_LABEL[job.workModel] ? `${WM_LABEL[job.workModel]} work` : ""}
                        </span>
                      </>
                    )}
                    {job.locationMismatch && (
                      <JobChip tone="amber">Location mismatch</JobChip>
                    )}
                  </div>
                )}
                {job.locationMismatch && (job.profileLocations?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                    Role is in {job.location || "another city"} · your profile prefers {job.profileLocations!.slice(0, 2).join(", ")}
                    {(job.profileLocations!.length > 2) ? "…" : ""}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {salaryFull ? `${salaryFull}  ·  ` : ""}Full-time
                </div>
              </div>
            </div>

            <ApplyLink
              job={job}
              signedIn={signedIn}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                alignSelf: "flex-start", padding: "11px 24px", borderRadius: 10,
                background: "var(--accent)", color: "var(--on-fill)", fontSize: 14, fontWeight: 600,
                textDecoration: "none", marginTop: 2,
              }}
            >
              Apply on company site <IconExternal />
            </ApplyLink>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {formatApplicants(job.applicantCount)} on Resunova
              {posted ? ` · Posted ${posted}` : ""}
              {job.isActive ? " · Actively hiring" : ""}
            </div>
          </CardContent>
        </Card>

        {/* Job details — labeled facts, Indeed-style chips */}
        <Card>
          <CardContent style={{ padding: "22px 28px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>Job details</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {salaryFull && (
                <JobFact label="Pay">
                  <JobChip>{salaryFull}</JobChip>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {job.salarySource === "jd" ? "Estimated from the job description" : "Listed by the company"}
                  </span>
                </JobFact>
              )}
              <JobFact label="Job type">
                <JobChip>Full-time</JobChip>
              </JobFact>
              {job.workModel && WM_LABEL[job.workModel] && (
                <JobFact label="Work model">
                  <JobChip>{WM_LABEL[job.workModel]}</JobChip>
                </JobFact>
              )}
              {job.locationMismatch && (
                <JobFact label="Location fit">
                  <JobChip tone="amber">Location mismatch</JobChip>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Does not change your match score. Just a logistics heads-up.
                  </span>
                </JobFact>
              )}
              {job.seniority && SEN_LABEL[job.seniority] && (
                <JobFact label="Level">
                  <JobChip>{SEN_LABEL[job.seniority]}</JobChip>
                </JobFact>
              )}
              {(job.h1bSponsor || job.visaSponsorship === "yes") && (
                <JobFact label="Visa">
                  <JobChip tone="green">
                    {job.h1bSponsor && job.h1bCertifiedCount
                      ? `H-1B sponsor · ${job.h1bCertifiedCount.toLocaleString()} approvals`
                      : "H-1B sponsor"}
                  </JobChip>
                  {job.h1bSponsor && job.h1bMedianWage != null && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      DOL median wage ${Math.round(job.h1bMedianWage / 1000)}k/yr
                    </span>
                  )}
                </JobFact>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Full job description — parsed into headings, paragraphs, and bullet lists */}
        <Card>
          <CardContent style={{ padding: "24px 28px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>Full job description</h2>
            {/* Collapsed by default (Google/Indeed "Show full description") — a long
                JD no longer makes a wall; the panel itself scrolls, so we avoid a
                nested scroll region inside it. */}
            <div style={{ position: "relative" }}>
              <div style={jdLong && !showFullJd ? { maxHeight: 320, overflow: "hidden" } : undefined}>
                <JobDescriptionBlocks text={jdDisplay} />
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
                  marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6,
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
        <MatchPanel job={job} onBoost={onBoost} signedIn={signedIn} />
        <PrepCard job={job} onPrep={onPrep} prepStatus={prepStatus} prepLaunching={prepLaunching} />
        {signedIn === false ? <LockedHiringContacts onSignIn={onContactSignIn} /> : <ContactHiringCard job={job} />}
      </div>
    </div>
  );
}

function LockedHiringContacts({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Card>
      <CardContent style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Hiring contacts</div>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
          Sign in to check for available recruiter or HR contact information for this role.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          style={{ border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 650, cursor: "pointer" }}
        >
          Sign in to view contacts
        </button>
      </CardContent>
    </Card>
  );
}

function contactTypeLabel(type: string): string {
  if (type === "recruiter") return "Recruiter contact";
  if (type === "careers") return "Careers inbox";
  if (type === "hr") return "HR inbox";
  return "Hiring contact";
}

function contactSourceLabel(source: string): string {
  if (source === "job_description") return "Found in the job post";
  if (source === "ats_metadata") return "Found in ATS metadata";
  if (source === "dol_lca") return "H-1B filing contact (U.S. Dept. of Labor)";
  if (source === "company_public_page") return "Found on company site";
  if (source === "domain_guess") return "Suggested from company domain (unverified)";
  if (source === "verified") return "Verified contact";
  return "Public contact";
}

const CONTACT_TEMPLATE_KEY = "rn_contact_email_template_v1";

/** Mask the local part so the address is gated behind an explicit reveal
 *  (n•••@nvidia.com) — we only surface the full email once the user opts in,
 *  which is also the signal we track. The domain stays visible as a teaser. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "•••••";
  const local = email.slice(0, at);
  const shown = local.slice(0, 1);
  return `${shown}${"•".repeat(Math.max(3, local.length - 1))}${email.slice(at)}`;
}

const DEFAULT_TEMPLATE = (jobTitle: string, company: string) =>
  [
    `Hi,`,
    ``,
    `I came across the ${jobTitle} role at ${company} and wanted to briefly introduce myself.`,
    `I'm very interested in the opportunity and would appreciate being pointed to the right person for this role, or any guidance on the process.`,
    ``,
    `Thank you for your time,`,
  ].join("\n");

function ContactHiringCard({ job }: { job: JobDetailData }) {
  const contacts = Array.isArray(job.contacts) ? job.contacts : [];
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);

  // Load a saved template once (client only); fall back to the per-job default.
  useEffect(() => {
    try {
      setTemplate(localStorage.getItem(CONTACT_TEMPLATE_KEY));
    } catch {
      setTemplate(null);
    }
  }, []);

  if (contacts.length === 0) return null;

  const primary = contacts[0];
  const subject = `Question about the ${job.title} role at ${job.company}`;
  const body = (template ?? "").trim() ? template! : DEFAULT_TEMPLATE(job.title, job.company);

  const reveal = () => {
    if (revealed) return;
    setRevealed(true);
    void trackJobEvent(job.id, "contact_reveal");
  };

  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      window.setTimeout(() => setCopied(""), 1800);
      void trackJobEvent(job.id, "contact_copy");
    } catch {
      setCopied("");
    }
  };

  const mailtoHref = `mailto:${encodeURIComponent(primary.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(primary.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const saveTemplate = (v: string) => {
    setTemplate(v);
    try { localStorage.setItem(CONTACT_TEMPLATE_KEY, v); } catch { /* ignore */ }
  };

  const actionBtn: React.CSSProperties = {
    border: "1px solid var(--border)", background: "transparent", color: "var(--text)",
    borderRadius: 9, padding: "8px 11px", fontSize: 13, fontWeight: 650, cursor: "pointer",
    textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
  };
  const accentBtn: React.CSSProperties = {
    ...actionBtn, border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff",
  };

  return (
    <Card>
      <CardContent style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Contact hiring team</div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, margin: "5px 0 0" }}>
            Public or suggested hiring contact. Draft only; Resunova will not send emails automatically.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contacts.slice(0, 3).map((contact) => (
            <div key={contact.email} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 11px", background: "var(--surface2)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 3 }}>
                {contactTypeLabel(contact.type)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 650, color: revealed ? "var(--text)" : "var(--muted)", wordBreak: "break-all" }}>
                  {revealed ? contact.email : maskEmail(contact.email)}
                </span>
                {revealed && (
                  <button type="button" onClick={() => void copy(contact.email)} title="Copy email"
                    style={{ ...actionBtn, padding: "4px 8px", fontSize: 12, flexShrink: 0 }}>
                    {copied === contact.email ? "Copied ✓" : "Copy"}
                  </button>
                )}
              </div>
              {contact.pocTitle ? (
                <div style={{ fontSize: 12, color: "var(--text)", marginTop: 3 }}>{contact.pocTitle}</div>
              ) : null}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{contactSourceLabel(contact.source)}</div>
            </div>
          ))}
        </div>

        {!revealed ? (
          <button type="button" onClick={reveal} style={{ ...accentBtn, justifyContent: "center", padding: "10px 14px" }}>
            🔓 Reveal contact{contacts.length > 1 ? "s" : ""}
          </button>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={mailtoHref} onClick={() => void trackJobEvent(job.id, "contact_email")} style={accentBtn}>
                ✉️ Draft email
              </a>
              <a href={gmailHref} target="_blank" rel="noopener noreferrer" onClick={() => void trackJobEvent(job.id, "contact_email")} style={actionBtn}>
                Open in Gmail
              </a>
              <button type="button" onClick={() => setEditingTemplate((v) => !v)} style={{ ...actionBtn, background: editingTemplate ? "var(--surface2)" : "transparent" }}>
                {editingTemplate ? "Done" : "Edit template"}
              </button>
            </div>
            {editingTemplate && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  value={body}
                  onChange={(e) => saveTemplate(e.target.value)}
                  rows={7}
                  spellCheck
                  style={{
                    width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13,
                    lineHeight: 1.5, color: "var(--text)", background: "var(--surface)",
                    border: "1px solid var(--border)", borderRadius: 10, padding: "10px 11px", resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Saved on this device. Used for both Draft email and Gmail.</span>
                  <button type="button" onClick={() => saveTemplate(DEFAULT_TEMPLATE(job.title, job.company))}
                    style={{ ...actionBtn, padding: "4px 9px", fontSize: 12 }}>
                    Reset
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MatchPanel({ job, onBoost, signedIn }: { job: JobDetailData; onBoost: () => void; signedIn: boolean | null }) {
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
    <Card>
      <CardContent style={{ padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 128, height: 128, borderRadius: "50%", background: ring, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 104, height: 104, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text)" }}>{score == null ? "—" : `${score}%`}</span>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text)" }}>{scoreLabel(score)}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          {score == null
            ? "Scan your résumé to see how you match this role."
            : `Your résumé matches ${job.matchedCount} of ${job.totalRequirements} extracted requirements`}
        </div>

        {job.locationMismatch && (
          <div style={{
            width: "100%", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start",
            padding: "10px 12px", borderRadius: 10,
            background: "color-mix(in srgb, #c4793a 10%, transparent)",
            border: "1px solid color-mix(in srgb, #c4793a 28%, transparent)",
          }}>
            <JobChip tone="amber">Location mismatch</JobChip>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)" }}>
              {job.location ? `This role lists ${job.location}` : "This role's location"}
              {(job.profileLocations?.length ?? 0) > 0
                ? ` · your profile prefers ${job.profileLocations!.slice(0, 2).join(", ")}.`
                : "."}
              {" "}Match % is skills-only and is not docked for this.
            </div>
          </div>
        )}

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
                ? "Every requirement covered. You're ready to apply."
                : `You're ${matchPct}% there. Add a few below to stand out.`}
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
                  <span style={{ display: "inline-flex", color: r.ok ? "var(--green-ink, #34d399)" : AMBER }}>{r.ok ? <IconCheck /> : <IconPlus />}</span>
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

        {signedIn === false ? (
          <>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", width: "100%" }}>
              {job.totalRequirements > 0 ? "" : "See how you match this role. "}Free with an account, {FREE_SCAN_DAILY_LIMIT} scans a day.
            </div>
            <button
              onClick={() => { stashAnalyzeJd(job.jdText); goToFreeScan(); }}
              onMouseEnter={() => setBoostHover(true)}
              onMouseLeave={() => setBoostHover(false)}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: boostHover ? "#b06a30" : "#c4793a", color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", marginTop: 2,
                transition: "background .15s ease, transform .15s ease, box-shadow .15s ease",
                transform: boostHover ? "translateY(-1px)" : "none",
                boxShadow: boostHover ? "0 6px 16px rgba(196,121,58,0.32)" : "none",
              }}
            >
              <IconUpload /> Upload your résumé
            </button>
          </>
        ) : (
          <>
            {job.missing.length > 0 && (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", width: "100%" }}>
                One tap tailors your résumé to add {job.missing.length} of these from your real experience.
              </div>
            )}
            <button
              onClick={onBoost}
              onMouseEnter={() => setBoostHover(true)}
              onMouseLeave={() => setBoostHover(false)}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: boostHover ? "#b06a30" : "#c4793a", color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", marginTop: 2,
                transition: "background .15s ease, transform .15s ease, box-shadow .15s ease",
                transform: boostHover ? "translateY(-1px)" : "none",
                boxShadow: boostHover ? "0 6px 16px rgba(196,121,58,0.32)" : "none",
              }}
            >
              <IconSparkle /> Optimize my résumé
            </button>
          </>
        )}
        <ApplyLink
          job={job}
          signedIn={signedIn}
          style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          Apply on company site <IconExternal />
        </ApplyLink>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)" }}>
          <IconMic />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Prepare for your interview</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          {ready
            ? `Your prep kit for ${job.company || "this role"} is ready: ${prepStatus!.questionCount} questions with STAR+R answers and best-story matches.`
            : `Generate company-specific questions for ${job.company || "this role"} from your résumé and this job description, with STAR+R answer structures.`}
        </div>
        <button
          onClick={onPrep}
          disabled={prepLaunching}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            border: ready ? "1px solid color-mix(in srgb, var(--green-ink) 40%, transparent)" : "none",
            background: ready ? "color-mix(in srgb, var(--green-ink) 12%, transparent)" : "var(--accent)",
            color: ready ? "var(--green-ink)" : "var(--on-fill)",
            fontSize: 14,
            fontWeight: 600,
            cursor: prepLaunching ? "wait" : "pointer",
            opacity: prepLaunching ? 0.7 : 1,
            boxSizing: "border-box",
          }}
        >
          {prepLaunching ? "Opening…" : ready ? (<><IconMic /> Open prep kit <IconArrowR /></>) : (<><IconMic /> Generate prep kit</>)}
        </button>
      </CardContent>
    </Card>
  );
}
