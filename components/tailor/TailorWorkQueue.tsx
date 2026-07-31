"use client";

/**
 * One work queue, not three surfaces.
 *
 * Gaps, keywords and polish render as a single prioritized list with one
 * outcome-segmented progress bar. Presentational: the caller owns the pass
 * (which items flip to which terminal state) and the actions; this component
 * guarantees every item's state and reason are visible — a capped item reads
 * "queued", never silently "missing".
 */

import React from "react";
import { FS, FW } from "@/lib/typography";
import type { QueueItem, QueueKind } from "@/lib/tailorWorkQueue";
import { queueCounts } from "@/lib/tailorWorkQueue";

const KIND_LABEL: Record<QueueKind, string> = {
  qualification: "Qualification",
  responsibility: "Responsibility",
  keyword: "Keyword",
  contextual: "Nice to have",
};

/** What the row's trailing action says, per state. Null = no action. */
export type QueueItemAction =
  | "view_change"
  | "review"
  | "add_to_summary"
  | "fix"
  | "whats_this"
  | "reconsider";

export function itemAction(it: QueueItem): QueueItemAction | null {
  if (it.status === "applied") return "view_change";
  if (it.status === "needs_review") return "review";
  if (it.status === "ignored") return "reconsider";
  if (it.status === "not_coverable") return it.kind === "contextual" ? "whats_this" : null;
  return it.kind === "contextual" ? "whats_this" : "fix";
}

const ACTION_LABEL: Record<QueueItemAction, string> = {
  view_change: "See it",
  review: "Review",
  add_to_summary: "Add to summary",
  fix: "Fix",
  whats_this: "What's this?",
  reconsider: "Reconsider",
};

function StatusDot({ status, working }: { status: QueueItem["status"]; working: boolean }) {
  const base: React.CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: 999,
    border: "1.5px solid var(--border)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: FS.micro,
    fontWeight: FW.extrabold,
    flexShrink: 0,
    marginTop: 2,
  };
  if (working) {
    return (
      <span
        aria-label="working"
        className="rn-queue-spin"
        style={{ ...base, borderColor: "var(--accent)", borderTopColor: "transparent" }}
      />
    );
  }
  if (status === "applied") {
    return (
      <span aria-label="applied" style={{ ...base, background: "var(--green-ink, #16a34a)", borderColor: "var(--green-ink, #16a34a)", color: "#fff" }}>
        ✓
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span aria-label="needs review" style={{ ...base, borderColor: "var(--amber-ink, #b45309)", color: "var(--amber-ink, #b45309)" }}>
        !
      </span>
    );
  }
  if (status === "not_coverable") {
    return (
      <span aria-label="not coverable" style={{ ...base, color: "var(--muted)" }}>
        –
      </span>
    );
  }
  if (status === "ignored") {
    return (
      <span aria-label="ignored" style={{ ...base, color: "var(--muted)", opacity: 0.7 }}>
        –
      </span>
    );
  }
  return <span aria-label="queued" style={base} />;
}

export function TailorWorkQueue({
  items,
  workingId,
  workingIds,
  passRan,
  fixAllBusy,
  onFixAll,
  onItemAction,
  onDownload,
  expandedId,
  expansion,
}: {
  items: readonly QueueItem[];
  /** Item currently being processed by the pass, if any. */
  workingId?: string | null;
  /** Several items in flight at once (wave-based passes spin a whole batch). */
  workingIds?: ReadonlySet<string>;
  /** A full pass has completed — show the finish line when nothing is open. */
  passRan?: boolean;
  fixAllBusy?: boolean;
  onFixAll?: () => void;
  onItemAction?: (item: QueueItem, action: QueueItemAction) => void;
  onDownload?: () => void;
  /** Row whose inline fix flow is open; `expansion` renders under it. */
  expandedId?: string | null;
  expansion?: React.ReactNode;
}) {
  const c = queueCounts(items);
  const seg = (n: number) => `${(n / Math.max(1, c.total)) * 100}%`;
  const finished = Boolean(passRan) && c.open === 0;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--card)" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: FS.body, fontWeight: FW.bold }}>
          Missing from your resume{" "}
          <span style={{ color: "var(--muted)", fontWeight: FW.medium }}>
            · {c.open ? `${c.open} to review` : "all reviewed"}
          </span>
        </div>
        {onFixAll ? (
          <button
            type="button"
            onClick={onFixAll}
            disabled={fixAllBusy || c.open === 0}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontSize: FS.body,
              fontWeight: FW.bold,
              padding: "8px 14px",
              cursor: fixAllBusy || c.open === 0 ? "default" : "pointer",
              opacity: fixAllBusy || c.open === 0 ? 0.6 : 1,
            }}
          >
            {fixAllBusy ? "Working…" : "Fix everything"}
          </button>
        ) : null}
      </div>

      {/* Outcome-segmented progress — states, not a spinner. */}
      <div aria-hidden style={{ display: "flex", height: 6, background: "var(--surface-2, rgba(127,127,127,0.12))" }}>
        <span style={{ width: seg(c.applied), background: "var(--green-ink, #16a34a)", transition: "width .3s ease" }} />
        <span style={{ width: seg(c.needsReview), background: "var(--amber-ink, #b45309)", transition: "width .3s ease" }} />
        <span style={{ width: seg(c.notCoverable + c.ignored), background: "var(--muted)", opacity: 0.5, transition: "width .3s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 14, padding: "7px 14px 0", fontSize: FS.caption, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
        <span><b style={{ color: "var(--text)" }}>{c.applied}</b> added</span>
        <span><b style={{ color: "var(--text)" }}>{c.needsReview}</b> need review</span>
        <span><b style={{ color: "var(--text)" }}>{c.notCoverable + c.ignored}</b> left out</span>
        <span><b style={{ color: "var(--text)" }}>{c.open}</b> to review</span>
      </div>

      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0 6px 8px", maxHeight: 380, overflowY: "auto" }}>
        {items.map((it) => {
          const expanded = it.id === expandedId;
          const action = expanded ? null : itemAction(it);
          const working = it.id === workingId || Boolean(workingIds?.has(it.id));
          return (
            <li key={it.id} data-status={it.status} style={{ borderRadius: 9 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto",
                gap: 10,
                alignItems: "start",
                padding: "9px 8px",
                borderRadius: 9,
                background: working ? "var(--accent-soft, rgba(37,99,235,0.08))" : undefined,
              }}
            >
              <StatusDot status={it.status} working={working} />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontSize: FS.body,
                    fontWeight: FW.semibold,
                    color:
                      it.status === "not_coverable"
                        ? "var(--muted)"
                        : it.status === "needs_review"
                          ? "var(--amber-ink, #b45309)"
                          : "var(--text)",
                  }}
                >
                  {it.name}
                </span>
                <span
                  style={{
                    fontSize: FS.micro,
                    fontWeight: FW.bold,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    background: "var(--surface-2, rgba(127,127,127,0.12))",
                    borderRadius: 5,
                    padding: "1px 6px",
                    marginLeft: 7,
                    verticalAlign: 1,
                  }}
                >
                  {KIND_LABEL[it.kind]}
                </span>
                {it.detail ? (
                  <span style={{ display: "block", fontSize: FS.small, color: "var(--muted)", marginTop: 1, maxWidth: "46ch" }}>
                    {it.detail}
                  </span>
                ) : null}
              </span>
              {action && onItemAction ? (
                <button
                  type="button"
                  onClick={() => onItemAction(it, action)}
                  style={{
                    fontSize: FS.small,
                    fontWeight: FW.semibold,
                    color: "var(--accent)",
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ACTION_LABEL[action]}
                </button>
              ) : (
                <span />
              )}
            </div>
            {expanded ? expansion : null}
            </li>
          );
        })}
      </ul>

      {finished ? (
        <div style={{ borderTop: "1px solid var(--border)", padding: "13px 14px", background: "var(--green-soft, rgba(22,163,74,0.1))" }}>
          <div style={{ fontSize: FS.body, fontWeight: FW.bold, color: "var(--green-ink, #16a34a)" }}>
            All done
          </div>
          <p style={{ margin: "3px 0 10px", fontSize: FS.small, color: "var(--text)" }}>
            {c.applied} added · {c.needsReview} waiting on your check · {c.notCoverable + c.ignored} left
            out, each with the reason next to it.
          </p>
          {onDownload ? (
            <button
              type="button"
              onClick={onDownload}
              style={{
                background: "var(--green-ink, #16a34a)",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontSize: FS.body,
                fontWeight: FW.bold,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          ) : null}
        </div>
      ) : null}

      <style>{`
        .rn-queue-spin { animation: rnQueueSpin .7s linear infinite; }
        @keyframes rnQueueSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .rn-queue-spin { animation: none; } }
      `}</style>
    </div>
  );
}
