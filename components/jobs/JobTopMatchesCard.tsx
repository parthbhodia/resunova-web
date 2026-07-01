import type { CSSProperties } from "react";

import type { JobTopMatch } from "@/lib/useJobTopMatches";

const CARD: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
};

function scoreColors(score: number): { bg: string; fg: string } {
  if (score >= 70) return { bg: "color-mix(in srgb, var(--green-ink, #16a34a) 14%, transparent)", fg: "var(--green-ink, #16a34a)" };
  if (score >= 50) return { bg: "color-mix(in srgb, #c4793a 14%, transparent)", fg: "#9a5a23" };
  return { bg: "var(--surface2)", fg: "var(--muted)" };
}

function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px" }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface2)", flexShrink: 0 }} />
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ height: 10, width: "78%", borderRadius: 5, background: "var(--surface2)" }} />
        <span style={{ height: 9, width: "48%", borderRadius: 5, background: "var(--surface2)" }} />
      </span>
    </div>
  );
}

export function JobTopMatchesCard({
  jobs,
  loading,
  onOpenJob,
}: {
  jobs: JobTopMatch[];
  loading: boolean;
  onOpenJob: (id: string) => void;
}) {
  if (!loading && jobs.length === 0) return null;

  return (
    <div style={CARD}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Your top matches</div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, margin: "0 0 12px" }}>
        Best résumé matches across your current role, country, and work filters.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && jobs.length === 0 ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          jobs.map((job) => {
            const score = job.matchScore ?? 0;
            const colors = scoreColors(score);
            return (
              <button
                key={job.id}
                onClick={() => onOpenJob(job.id)}
                title={`Open ${job.title} at ${job.company}`}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 9, border: "1px solid var(--surface2)", background: "var(--surface2)", cursor: "pointer", fontFamily: "inherit" }}
              >
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, background: colors.bg, color: colors.fg }}>
                  {score}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.company}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
