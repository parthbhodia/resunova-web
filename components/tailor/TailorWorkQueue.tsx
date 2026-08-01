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

import React, { useState } from "react";
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
  fix: "Review fix",
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
  onFixSelected,
  onItemAction,
  onDownload,
  onInterviewPrep,
  expandedId,
  expansion,
  visibleIds,
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
  /** Run one honest rewrite pass for only the selected open rows. */
  onFixSelected?: (items: readonly QueueItem[]) => void;
  onItemAction?: (item: QueueItem, action: QueueItemAction) => void;
  onDownload?: () => void;
  /** Finish-line handoff into interview prep, carrying this run's resume + JD. */
  onInterviewPrep?: () => void;
  /** Row whose inline fix flow is open; `expansion` renders under it. */
  expandedId?: string | null;
  expansion?: React.ReactNode;
  /** Dimension filter: only these ids render as rows. Counts, the progress
   *  bar and the Fix-everything button stay whole-queue — a chip is a view,
   *  not a different queue. */
  visibleIds?: ReadonlySet<string> | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [detailIds, setDetailIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const c = queueCounts(items);
  const seg = (n: number) => `${(n / Math.max(1, c.total)) * 100}%`;
  const finished = Boolean(passRan) && c.open === 0;
  const filtered = visibleIds ? items.filter((it) => visibleIds.has(it.id)) : items;
  const shown = showAll ? filtered : filtered.slice(0, 5);
  const hiddenCount = Math.max(0, filtered.length - shown.length);
  const selectable = filtered.filter((it) => it.status === "queued" && it.kind !== "contextual");
  const selected = selectable.filter((it) => selectedIds.has(it.id));
  const allSelected = selectable.length > 0 && selected.length === selectable.length;

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectable.map((it) => it.id)));
  };

  const toggleDetail = (id: string) => {
    setDetailIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--card)" }}>
      {c.open > 0 ? (
        <div
          role="status"
          style={{
            display: "flex",
            gap: 9,
            alignItems: "flex-start",
            padding: "10px 14px",
            color: "var(--red-ink, #b42318)",
            background: "var(--red-soft, #fff1f0)",
            borderBottom: "1px solid color-mix(in srgb, var(--red-ink, #b42318) 18%, transparent)",
            fontSize: FS.small,
          }}
        >
          <span aria-hidden style={{ fontWeight: FW.extrabold }}>!</span>
          <span><b>Keep every claim true.</b> These are job requirements your résumé does not prove yet. Only add experience you actually have.</span>
        </div>
      ) : null}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: FS.body, fontWeight: FW.bold }}>
            Match gaps{" "}
            <span style={{ color: "var(--muted)", fontWeight: FW.medium }}>
              · {c.open ? `${c.open} to review` : "all reviewed"}
            </span>
          </div>
          {selectable.length > 0 ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 7, color: "var(--muted)", fontSize: FS.small, cursor: "pointer" }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              {allSelected ? `All ${selectable.length} selected` : "Select all gaps"}
            </label>
          ) : null}
        </div>
        {onFixAll ? (
          <button
            type="button"
            onClick={() => selected.length > 0 && onFixSelected ? onFixSelected(selected) : onFixAll()}
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
            {fixAllBusy
              ? "Improving…"
              : selected.length > 0
                ? `Improve selected (${selected.length})`
                : `Improve all ${selectable.length || c.open}`}
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

      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0 6px 4px" }}>
        {shown.length === 0 ? (
          <li style={{ padding: "10px 8px", fontSize: FS.small, color: "var(--muted)" }}>
            Nothing to add here. You&rsquo;re already covered.
          </li>
        ) : null}
        {shown.map((it) => {
          const expanded = it.id === expandedId;
          const action = expanded ? null : itemAction(it);
          const working = it.id === workingId || Boolean(workingIds?.has(it.id));
          const detailOpen = detailIds.has(it.id);
          const canSelect = it.status === "queued" && it.kind !== "contextual";
          const severityColor =
            it.kind === "qualification" || it.kind === "responsibility"
              ? "var(--red-ink, #b42318)"
              : it.kind === "keyword"
                ? "var(--amber-ink, #b45309)"
                : "var(--muted)";
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
              {canSelect && !working ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${it.name}`}
                  checked={selectedIds.has(it.id)}
                  onChange={() => toggleSelected(it.id)}
                  style={{ width: 17, height: 17, margin: "2px 0 0", accentColor: "var(--accent)", cursor: "pointer" }}
                />
              ) : (
                <StatusDot status={it.status} working={working} />
              )}
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
                          : severityColor,
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
                  <>
                    <button
                      type="button"
                      aria-expanded={detailOpen}
                      onClick={() => toggleDetail(it.id)}
                      style={{ display: "block", border: 0, background: "none", color: "var(--muted)", padding: "3px 0 0", fontSize: FS.caption, cursor: "pointer" }}
                    >
                      {detailOpen ? "Hide details" : "Why this matters"}
                    </button>
                    {detailOpen ? (
                      <span style={{ display: "block", fontSize: FS.small, color: "var(--muted)", marginTop: 3, maxWidth: "52ch", lineHeight: 1.45 }}>
                        {it.detail}
                      </span>
                    ) : null}
                  </>
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

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)", background: "var(--surface-2, rgba(127,127,127,0.06))", padding: "10px 14px", color: "var(--accent)", fontSize: FS.small, fontWeight: FW.semibold, cursor: "pointer" }}
        >
          Show {hiddenCount} more lower-priority gaps
        </button>
      ) : filtered.length > 5 ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)", background: "var(--surface-2, rgba(127,127,127,0.06))", padding: "10px 14px", color: "var(--accent)", fontSize: FS.small, fontWeight: FW.semibold, cursor: "pointer" }}
        >
          Show top 5 only
        </button>
      ) : null}

      {finished ? (
        <div style={{ borderTop: "1px solid var(--border)", padding: "13px 14px", background: "var(--green-soft, rgba(22,163,74,0.1))" }}>
          <div style={{ fontSize: FS.body, fontWeight: FW.bold, color: "var(--green-ink, #16a34a)" }}>
            All done
          </div>
          <p style={{ margin: "3px 0 10px", fontSize: FS.small, color: "var(--text)" }}>
            {c.applied} added · {c.needsReview} waiting on your check · {c.notCoverable + c.ignored} left
            out, each with the reason next to it.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            {onInterviewPrep ? (
              <button
                type="button"
                onClick={onInterviewPrep}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  fontSize: FS.body,
                  fontWeight: FW.bold,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Prep for the interview
              </button>
            ) : null}
          </div>
          {onInterviewPrep ? (
            <p style={{ margin: "7px 0 0", fontSize: FS.caption, color: "var(--muted)" }}>
              Your tailored resume and this job carry over.
            </p>
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
