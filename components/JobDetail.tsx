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

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJobDetail, scoreLabel, type JobDetail as JobDetailData } from "@/lib/jobsApi";
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
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px 64px", width: "100%" }}>
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

      {/* Stays mounted while the job is loaded so the optimize step/result
          survives closing + reopening the slide-over (no re-generation). */}
      {state.status === "ready" && (
        <BoostPanel job={state.job} open={boostOpen} onClose={() => setBoostOpen(false)} />
      )}
    </div>
  );
}

function JobBody({ job, onBoost }: { job: JobDetailData; onBoost: () => void }) {
  const salary = formatSalary(job);
  const posted = formatPostedAt(job.postedAt);

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* LEFT */}
      <div style={{ flex: "1 1 480px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
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

      {/* RIGHT — match panel + insider outreach */}
      <div style={{ width: 340, flexShrink: 0, position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        <MatchPanel job={job} onBoost={onBoost} />
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

      {job.totalRequirements > 0 && (
        <>
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />
          <div style={{ width: "100%", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--muted)" }}>
            REQUIREMENTS · {job.matchedCount}/{job.totalRequirements} MATCHED
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%" }}>
            {[...job.matched.map((m) => ({ ...m, ok: true })), ...job.missing.map((m) => ({ ...m, ok: false }))]
              .slice(0, 14)
              .map((r, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 12, background: r.ok ? "color-mix(in srgb, var(--green-ink, #34d399) 14%, transparent)" : "var(--surface2)", color: r.ok ? "var(--text)" : "var(--muted)" }}>
                  <span style={{ color: r.ok ? "var(--green-ink, #34d399)" : "var(--red-ink, #d97757)", fontWeight: 600 }}>{r.ok ? "✓" : "✗"}</span>
                  {r.canonical}
                </span>
              ))}
          </div>
        </>
      )}

      {job.missing.length > 0 && (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", width: "100%" }}>
          Tailoring can close {job.missing.length} missing requirement{job.missing.length === 1 ? "" : "s"} using your real experience.
        </div>
      )}

      <button
        onClick={onBoost}
        style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: "#c4793a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 2 }}
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
