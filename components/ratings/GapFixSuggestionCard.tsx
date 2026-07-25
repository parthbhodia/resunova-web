"use client";

import { useMemo, useState } from "react";
import { gapFixAppendDelta } from "@/lib/gapFixAppendDelta";

export type GapFixSuggestion = {
  id: string;
  section: string;
  employer?: string;
  original: string;
  suggested: string;
  reason: string;
  category?: string;
  priority: string;
  action_type?: "rewrite" | "append";
  risk_level?: "low" | "medium" | "high";
};

type Props = {
  suggestion: GapFixSuggestion;
  index: number;
  checked: boolean;
  onToggleCheck: () => void;
  draftText: string;
  onDraftChange: (text: string) => void;
  showCheckbox?: boolean;
  /** This card's bullet is the one selected in the preview. */
  active?: boolean;
  /** Select this card's bullet in the preview. */
  onActivate?: () => void;
  /** The bullet's CURRENT preview text. Prefer it over `suggestion.original`,
   *  which is the LLM's quote of the pristine line and goes stale as soon as
   *  another fix lands on the same bullet. */
  targetBulletText?: string;
  cardRef?: (el: HTMLDivElement | null) => void;
};

const RISK_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  low:    { bg: "rgba(34,197,94,0.10)",  color: "#16a34a", label: "LOW RISK" },
  medium: { bg: "rgba(245,158,11,0.10)", color: "#d97706", label: "MED RISK" },
  high:   { bg: "rgba(239,68,68,0.10)",  color: "#dc2626", label: "HIGH RISK" },
};

const CATEGORY_LABEL: Record<string, string> = {
  add_keywords:   "KEYWORDS",
  relevance:      "RELEVANCE",
  quantification: "METRICS",
  readability:    "CLARITY",
  action_verbs:   "LANGUAGE",
  languageQuality:"LANGUAGE",
  remove_filler:  "CLARITY",
};

export function GapFixSuggestionCard({
  suggestion: s,
  index,
  checked,
  onToggleCheck,
  draftText,
  onDraftChange,
  showCheckbox = true,
  active = false,
  onActivate,
  targetBulletText,
  cardRef,
}: Props) {
  const risk = RISK_STYLES[s.risk_level ?? "low"] ?? RISK_STYLES.low;
  const actionType = s.action_type ?? "rewrite";
  const categoryLabel = (s.category ? CATEGORY_LABEL[s.category] : null) ?? s.section.toUpperCase();
  const employerLabel = (s.employer || s.section || "").trim();

  // The line this card actually edits. `s.original` is the LLM's quote of the
  // pristine bullet and goes stale once another fix lands on the same line.
  const baseText = (targetBulletText ?? s.original ?? "").trim();
  // No matching bullet in the résumé means apply will REGISTER a new one, so
  // the card must not claim to be extending something that exists.
  const isNewBullet = !baseText;
  const delta = useMemo(
    () => (baseText ? gapFixAppendDelta(baseText, draftText) : null),
    [baseText, draftText],
  );
  const [editing, setEditing] = useState(false);

  return (
    <div
      ref={cardRef}
      onClick={onActivate}
      style={{
        borderRadius: 12,
        // Distinct from the indigo `checked` border: selection and "will be
        // applied" are different states and must not look alike.
        border: checked ? "1.5px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
        outline: active ? "2px solid rgba(139,92,246,0.85)" : "none",
        outlineOffset: 1,
        background: checked ? "rgba(99,102,241,0.02)" : "var(--surface2)",
        overflow: "hidden",
        cursor: onActivate ? "pointer" : undefined,
        transition: "border-color 0.15s, background 0.15s, outline-color 0.15s",
      }}
    >
      {/* ── Header row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexWrap: "wrap",
        }}
      >
        {showCheckbox && (
          <button
            type="button"
            onClick={onToggleCheck}
            aria-label={checked ? "Deselect fix" : "Select fix"}
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              flexShrink: 0,
              border: checked ? "none" : "1.5px solid var(--border)",
              background: checked ? "#6366f1" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {checked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
          </button>
        )}

        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: -0.1 }}>
          Option {index + 1}
        </span>

        {/* Risk badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.4, padding: "2px 7px",
          borderRadius: 20, background: risk.bg, color: risk.color,
        }}>
          {risk.label}
        </span>

        {/* Category badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.4, padding: "2px 7px",
          borderRadius: 20, background: "rgba(99,102,241,0.08)", color: "#6366f1",
        }}>
          {categoryLabel}
        </span>

        {/* Action type badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.4, padding: "2px 7px",
          borderRadius: 20,
          background: actionType === "append" ? "rgba(59,130,246,0.10)" : "rgba(139,92,246,0.10)",
          color: actionType === "append" ? "#2563eb" : "#7c3aed",
        }}>
          {actionType.toUpperCase()}
        </span>

        <div style={{ flex: 1 }} />

        {/* Company chip */}
        {employerLabel && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600, color: "var(--muted)",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "2px 8px", maxWidth: 160,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }} title={employerLabel}>
            <span style={{ fontSize: 9 }}>📍</span>
            {employerLabel.length > 20 ? employerLabel.slice(0, 20) + "…" : employerLabel}
          </span>
        )}
      </div>

      {/* ── Rationale ── */}
      {s.reason && (
        <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <p style={{ margin: 0, fontSize: 12, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.5 }}>
            {s.reason}
          </p>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* WHERE it lands. Without this the box below is disconnected from the
            résumé and the user has to hunt the preview to find the target. */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", letterSpacing: 0.3, textTransform: "uppercase" }}>
          {isNewBullet
            ? `New bullet · ${employerLabel || s.section}`
            : `${actionType === "append" ? "Appending to" : "Rewriting"} · ${employerLabel || s.section}`}
        </div>

        {editing || isNewBullet || !delta || delta.kind !== "append" ? (
          <textarea
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            // Grow with the content: at rows=3 the original prefix scrolled out
            // of sight, so the user saw a fragment with no anchor.
            rows={Math.min(12, Math.max(3, Math.ceil(draftText.length / 60)))}
            aria-label="Suggested correction"
            style={{
              cursor: "text", width: "100%", boxSizing: "border-box",
              padding: "8px 10px", borderRadius: 6,
              background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
              fontSize: 13, color: "var(--text)", lineHeight: 1.45,
              fontFamily: "inherit", resize: "vertical",
            }}
          />
        ) : (
          /* The finished bullet with the new words marked, so "adding content"
             shows WHAT is being added and where it attaches. Computed from the
             live draft, so the highlight stays truthful after an edit. */
          <div
            style={{
              padding: "8px 10px", borderRadius: 6,
              background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
              fontSize: 13, color: "var(--text)", lineHeight: 1.5,
            }}
          >
            <span style={{ color: "var(--muted)" }}>{draftText.slice(0, delta.addedStart)}</span>
            <mark style={{
              background: "rgba(52,211,153,0.30)", color: "var(--text)",
              borderRadius: 3, padding: "0 2px", fontWeight: 600,
            }}>
              {draftText.slice(delta.addedStart, delta.addedEnd)}
            </mark>
            <span style={{ color: "var(--muted)" }}>{draftText.slice(delta.addedEnd)}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {!isNewBullet && delta?.kind === "append" && !editing && (
            <span style={{ fontSize: 11, color: "var(--dim)" }}>
              Highlighted text is what this fix adds.
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}
            style={{
              fontFamily: "inherit", fontSize: 11, fontWeight: 700,
              color: "var(--accent)", background: "none", border: "none",
              cursor: "pointer", padding: 0,
            }}
          >
            {editing ? "Done" : "Edit text"}
          </button>
        </div>
      </div>
    </div>
  );
}
