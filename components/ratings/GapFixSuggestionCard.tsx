"use client";

import { useMemo, useState } from "react";

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
  draftText: string;
  onDraftChange: (text: string) => void;
  /** Legacy/Boost: checkbox select for batch accept. */
  checked?: boolean;
  onToggleCheck?: () => void;
  /** This card's bullet is the one selected in the preview. */
  active?: boolean;
  /** Select this card's bullet in the preview. */
  onActivate?: () => void;
  /** The bullet's CURRENT preview text (stale-safe vs suggestion.original). */
  targetBulletText?: string;
  cardRef?: (el: HTMLDivElement | null) => void;
  /** Per-card Apply (gap-fix Redesign). Mutually preferred over checkbox UI. */
  onApply?: () => void | Promise<void>;
  onSkip?: () => void;
  applyBusy?: boolean;
};

const RISK_COLOR: Record<string, string> = {
  low: "#16a34a",
  medium: "#d97706",
  high: "#dc2626",
};

export function GapFixSuggestionCard({
  suggestion: s,
  index,
  draftText,
  onDraftChange,
  checked,
  onToggleCheck,
  active = false,
  onActivate,
  targetBulletText,
  cardRef,
  onApply,
  onSkip,
  applyBusy = false,
}: Props) {
  const employerLabel = (s.employer || s.section || "").trim();
  const baseText = (targetBulletText ?? s.original ?? "").trim();
  const risk = s.risk_level ?? "low";
  const perCardActions = Boolean(onApply || onSkip);
  const [editing, setEditing] = useState(false);
  const showTextarea = !perCardActions || editing;

  const reasonShort = useMemo(() => {
    const r = (s.reason || "").trim();
    if (!r) return "";
    return r.length > 140 ? `${r.slice(0, 137)}…` : r;
  }, [s.reason]);

  return (
    <div
      ref={cardRef}
      onClick={onActivate}
      style={{
        borderRadius: 10,
        border: active
          ? "1.5px solid color-mix(in srgb, var(--accent) 55%, transparent)"
          : "1px solid var(--border)",
        background: "var(--surface2)",
        overflow: "hidden",
        cursor: onActivate ? "pointer" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {onToggleCheck && !perCardActions ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={!!checked}
            aria-label={checked ? "Deselect suggestion" : "Select suggestion"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCheck();
            }}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: checked ? "none" : "1.5px solid var(--border)",
              background: checked ? "var(--accent)" : "transparent",
              color: "#fff",
              fontSize: 11,
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            {checked ? "✓" : null}
          </button>
        ) : null}
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
          Fix {index + 1}
        </span>
        {employerLabel ? (
          <span
            style={{
              fontSize: 12,
              color: "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            · {employerLabel}
          </span>
        ) : null}
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: RISK_COLOR[risk] ?? RISK_COLOR.low,
          }}
        >
          {risk === "low" ? "Low risk" : risk === "medium" ? "Review" : "High risk"}
        </span>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {reasonShort ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
            {reasonShort}
          </p>
        ) : null}

        {baseText ? (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--dim)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Current
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                background: "color-mix(in srgb, var(--red-ink, #ef4444) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--red-ink, #ef4444) 18%, transparent)",
                fontSize: 13,
                color: "var(--muted)",
                lineHeight: 1.45,
                textDecoration: "line-through",
                textDecorationColor: "color-mix(in srgb, var(--red-ink, #ef4444) 35%, transparent)",
              }}
            >
              {baseText}
            </div>
          </div>
        ) : null}

        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--dim)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Suggested
          </div>
          {showTextarea ? (
            <textarea
              value={draftText}
              onChange={(e) => onDraftChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              rows={Math.min(10, Math.max(3, Math.ceil(draftText.length / 70)))}
              aria-label="Suggested bullet"
              style={{
                cursor: "text",
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                borderRadius: 6,
                background: "color-mix(in srgb, var(--green-ink, #16a34a) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--green-ink, #16a34a) 28%, transparent)",
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.45,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          ) : (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                background: "color-mix(in srgb, var(--green-ink, #16a34a) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--green-ink, #16a34a) 28%, transparent)",
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.45,
              }}
            >
              {draftText}
            </div>
          )}
        </div>

        {perCardActions ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onApply ? (
              <button
                type="button"
                disabled={applyBusy || !draftText.trim()}
                onClick={() => {
                  void onApply();
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--text)",
                  color: "var(--bg, #fff)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: applyBusy || !draftText.trim() ? "not-allowed" : "pointer",
                  opacity: applyBusy || !draftText.trim() ? 0.55 : 1,
                }}
              >
                {applyBusy ? "Applying…" : "Apply"}
              </button>
            ) : null}
            {onSkip ? (
              <button
                type="button"
                disabled={applyBusy}
                onClick={onSkip}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: applyBusy ? "not-allowed" : "pointer",
                }}
              >
                Skip
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {editing ? "Done" : "Edit"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
