"use client";

import { useState } from "react";
import type { JobTitleRating } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  exact: "exact",
  partial: "partial",
  related: "related",
};

const SECTION_COLOR: Record<string, string> = {
  EXPERIENCE: "#22c55e",
  EDUCATION: "#3b82f6",
  PROJECTS: "#a855f7",
  SKILLS: "#f59e0b",
};

export function JobTitleSection({
  jobTitle,
  headlineDraft,
  onHeadlineDraftChange,
  onRescoreTitle,
  rescoring,
}: {
  jobTitle: JobTitleRating;
  /** Current headline override text; undefined/empty = using the extracted headline. */
  headlineDraft?: string;
  onHeadlineDraftChange?: (text: string) => void;
  /** Absent when there's no structured résumé to attach an override to. */
  onRescoreTitle?: () => void;
  rescoring?: boolean;
}) {
  const refs = jobTitle.references ?? [];
  const pct = Math.min(100, Math.max(0, jobTitle.score));

  const barColor = pct >= 75 ? "var(--green, #34d399)" : pct >= 50 ? "#f59e0b" : "#f87171";
  const canEditHeadline = typeof onHeadlineDraftChange === "function" && typeof onRescoreTitle === "function";
  const [editing, setEditing] = useState(false);
  const draftValue = headlineDraft ?? "";
  const displayedTitle = draftValue.trim() || jobTitle.resume_title || "—";
  const isDirty = draftValue.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Target Position ──────────────────────────────── */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--dim)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          TARGET POSITION
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {jobTitle.jd_title || "—"}
          </span>
        </div>
      </div>

      {/* ── Your résumé's title ──────────────────────────────
          This edits `structuredResume.headline` — the self-authored line at
          the top of the résumé, never a specific past employer's job title
          under Experience. That distinction matters: a headline is your own
          characterization of yourself and is genuinely yours to set (résumé
          coaches routinely recommend mirroring the target title here for ATS
          keyword matching); a past employer's title is a checkable fact about
          a real employment relationship, so it stays out of this editor. */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 10,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            YOUR RÉSUMÉ&apos;S TITLE
          </div>
          {canEditHeadline && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                fontSize: 11, fontWeight: 700, color: "var(--accent)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              value={headlineDraft || jobTitle.resume_title || ""}
              onChange={(e) => onHeadlineDraftChange?.(e.target.value)}
              placeholder="e.g. Software Engineer"
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                fontSize: 14, fontWeight: 600, color: "var(--text)",
                padding: "9px 12px", borderRadius: 8,
                border: "1px solid var(--accent)", background: "var(--surface)",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {jobTitle.jd_title && (
                <button
                  type="button"
                  onClick={() => onHeadlineDraftChange?.(jobTitle.jd_title)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "var(--accent)",
                    background: "var(--accent-bg, rgba(196,121,58,0.08))",
                    border: "1px solid var(--accent)", borderRadius: 999,
                    padding: "5px 12px", cursor: "pointer",
                  }}
                >
                  Match target title
                </button>
              )}
              <button
                type="button"
                disabled={!onRescoreTitle || rescoring}
                onClick={() => onRescoreTitle?.()}
                style={{
                  fontSize: 12, fontWeight: 700, color: "#fff",
                  background: "var(--accent)", border: "none", borderRadius: 999,
                  padding: "5px 14px", cursor: rescoring ? "wait" : "pointer",
                  opacity: rescoring ? 0.7 : 1,
                }}
              >
                {rescoring ? "Re-scoring…" : "Update score"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dim)",
                  background: "none", border: "none", cursor: "pointer", padding: "5px 4px",
                }}
              >
                Done
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "var(--dim)", lineHeight: 1.5 }}>
              This changes the headline at the top of your résumé — not any past
              employer&apos;s job title under Experience. Only edit it to something you
              can honestly stand behind in an interview.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isDirty ? "var(--green, #34d399)" : "var(--muted)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", flex: 1, minWidth: 0 }}>
              {displayedTitle}
            </span>
            {isDirty && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green, #34d399)", textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>
                Edited
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Found References ─────────────────────────────── */}
      {refs.length > 0 && (
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 14,
            }}
          >
            FOUND JOB TITLE REFERENCES
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {refs.map((ref, i) => {
              const sectionColor = SECTION_COLOR[ref.section.toUpperCase()] ?? "var(--accent)";
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "var(--green, #34d399)",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: sectionColor,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                        }}
                      >
                        {ref.section}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--dim)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                        }}
                      >
                        {TYPE_LABEL[ref.type] ?? ref.type}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--muted)",
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{ref.text}&rdquo;
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Similarity Score ─────────────────────────────── */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            Similarity Score
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: barColor,
              letterSpacing: -0.5,
            }}
          >
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "rgba(148,163,184,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 4,
              background: barColor,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* ── Assessment ───────────────────────────────────── */}
      {jobTitle.detail && (
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13 }}>👁</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              ASSESSMENT
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.65,
            }}
          >
            {jobTitle.detail}
          </p>
        </div>
      )}
    </div>
  );
}
