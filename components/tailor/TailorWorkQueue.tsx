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
import { groupQueueBySeverity, queueCounts, type QueueTone } from "@/lib/tailorWorkQueue";

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

/** Severity tones. The fallbacks matter: these vars are defined per theme, and
 *  a missing one would otherwise render the stripe transparent. */
const TONE_COLOR: Record<QueueTone, string> = {
  crit: "var(--red-ink, #b42318)",
  warn: "var(--amber-ink, #b45309)",
  muted: "var(--muted)",
  good: "var(--green-ink, #16a34a)",
};

/**
 * Band strip fills.
 *
 * Alpha tints, never opaque hex. An opaque light fill is invisible in dark mode
 * and takes the band's own text down with it; a tint composites over whatever
 * surface it lands on and stays legible in both themes. The `--*-bg` variables
 * are the alpha ones — `--*-ink` are the opaque text colours and must not be
 * used as a background.
 */
const TONE_BAND_BG: Record<QueueTone, string> = {
  crit: "var(--red-bg, rgba(220,38,38,0.10))",
  warn: "var(--amber-bg, rgba(180,83,9,0.10))",
  muted: "var(--surface-2, rgba(127,127,127,0.08))",
  good: "var(--green-bg, rgba(22,163,74,0.10))",
};

/**
 * Roughly where a title stops fitting the rail on one line.
 *
 * An approximation on purpose. Knowing whether CSS actually clipped a given
 * string means measuring after layout, and a resize observer per row to pick
 * between two words of button copy is not worth what it costs. Erring long is
 * the safe direction: a title just under the threshold reads "Why this matters"
 * and shows its detail, which is right either way.
 */
const LONG_TITLE_CHARS = 46;

export function isLongTitle(name: string): boolean {
  return name.trim().length > LONG_TITLE_CHARS;
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
  // `tq-dot` transitions the colours, so a row going queued → applied changes
  // state visibly instead of teleporting.
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
        className="rn-queue-spin tq-dot"
        style={{ ...base, borderColor: "var(--accent)", borderTopColor: "transparent" }}
      />
    );
  }
  if (status === "applied") {
    return (
      <span aria-label="applied" className="tq-dot" style={{ ...base, background: "var(--green-ink, #16a34a)", borderColor: "var(--green-ink, #16a34a)", color: "#fff" }}>
        ✓
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span aria-label="needs review" className="tq-dot" style={{ ...base, borderColor: "var(--amber-ink, #b45309)", color: "var(--amber-ink, #b45309)" }}>
        !
      </span>
    );
  }
  if (status === "not_coverable") {
    return (
      <span aria-label="not coverable" className="tq-dot" style={{ ...base, color: "var(--muted)" }}>
        –
      </span>
    );
  }
  if (status === "ignored") {
    return (
      <span aria-label="ignored" className="tq-dot" style={{ ...base, color: "var(--muted)", opacity: 0.7 }}>
        –
      </span>
    );
  }
  return <span aria-label="queued" className="tq-dot" style={base} />;
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
  // Open rows a bulk pass deliberately skips. Named here so the header can say
  // so rather than leaving the user to notice the count not adding up.
  const contextualOpen = filtered.filter((it) => it.status === "queued" && it.kind === "contextual").length;
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
      {/* The "Keep every claim true" banner is gone (mockup v7).
       *
       * It was the loudest element at the top of the list and said what the red
       * stripe on every blocker row and the exclusion note below already say.
       * Three restatements of one idea competing for the same glance is how the
       * warning stops being read at all. */}
      <div style={{ padding: "17px 16px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: FS.body, fontWeight: FW.bold }}>
            Match gaps{" "}
            <span style={{ color: "var(--muted)", fontWeight: FW.medium }}>
              · {c.open ? `${c.open} to review` : "all reviewed"}
            </span>
          </div>
          {/* A live control, so it gets real contrast. At the same size and
              shade of grey as the note under it the two fused into one block
              and nothing said which part you could click. */}
          {selectable.length > 0 ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--text)", fontSize: FS.body, fontWeight: FW.semibold, cursor: "pointer" }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ flexShrink: 0 }} />
              {/* The text needs its own element. As a bare child of an
                  inline-flex label it becomes an anonymous flex item, which
                  shrinks to its longest word — "Select all gaps" rendered as
                  three stacked lines next to the checkbox even with 400px of
                  free space in the row. */}
              <span style={{ whiteSpace: "nowrap" }}>
                {allSelected ? `All ${selectable.length} selected` : "Select all gaps"}
              </span>
            </label>
          ) : null}
          {/* Its own tag, not a third stacked line of the same grey, so it
              reads as an annotation on the control above rather than as more
              of it. Says what "all" leaves out, because a pass that silently
              skipped rows is the complaint the queue exists to answer. */}
          {contextualOpen > 0 ? (
            <div
              style={{
                margin: "8px 0 0",
                fontSize: FS.caption,
                fontWeight: FW.semibold,
                color: "var(--muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-2, rgba(127,127,127,0.08))",
                borderRadius: 999,
                padding: "5px 11px 5px 9px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ flex: "none", opacity: 0.8 }}>
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
                <path d="M6 5.3v3M6 3.7v.01" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              {contextualOpen} employer-context item{contextualOpen === 1 ? "" : "s"} below {contextualOpen === 1 ? "isn't" : "aren't"} included
            </div>
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
            {/* "all" was a lie whenever a contextual row was open: the pass
                skips those by design. Naming what it actually operates on
                keeps the button honest without needing a footnote. */}
            {fixAllBusy
              ? "Improving…"
              : selected.length > 0
                ? `Improve selected (${selected.length})`
                : `Improve ${selectable.length || c.open} blocker${(selectable.length || c.open) === 1 ? "" : "s"}`}
          </button>
        ) : null}
      </div>

      {/* Outcome-segmented progress — states, not a spinner. */}
      <div aria-hidden style={{ display: "flex", height: 6, background: "var(--surface-2, rgba(127,127,127,0.12))" }}>
        <span style={{ width: seg(c.applied), background: "var(--green-ink, #16a34a)", transition: "width .3s ease" }} />
        <span style={{ width: seg(c.needsReview), background: "var(--amber-ink, #b45309)", transition: "width .3s ease" }} />
        <span style={{ width: seg(c.notCoverable + c.ignored), background: "var(--muted)", opacity: 0.5, transition: "width .3s ease" }} />
      </div>
      {/* Hidden until one of these is actually nonzero.
       *
       * On a fresh scan it read "0 added · 0 need review · 0 left out · N to
       * review", which is three zeroes and a restatement of the "N to review"
       * already in the header two lines above. A row that only ever says
       * nothing on first sight teaches the user to skip that part of the
       * panel, including later when it does carry news. */}
      {c.applied + c.needsReview + c.notCoverable + c.ignored > 0 ? (
        <div style={{ display: "flex", gap: 14, padding: "7px 14px 0", fontSize: FS.caption, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          <span><b style={{ color: "var(--text)" }}>{c.applied}</b> added</span>
          <span><b style={{ color: "var(--text)" }}>{c.needsReview}</b> need review</span>
          <span><b style={{ color: "var(--text)" }}>{c.notCoverable + c.ignored}</b> left out</span>
          <span><b style={{ color: "var(--text)" }}>{c.open}</b> to review</span>
        </div>
      ) : null}

      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: "0 6px 4px" }}>
        {shown.length === 0 ? (
          <li style={{ padding: "10px 8px", fontSize: FS.small, color: "var(--muted)" }}>
            Nothing to add here. You&rsquo;re already covered.
          </li>
        ) : null}
        {groupQueueBySeverity(shown).map((group) => (
          <li key={`g:${group.band}`} style={{ listStyle: "none" }}>
            {/* Grouped by what the gap costs you, not by which rater field it
                came out of. The header carries the band's tone and the count
                of what is still OPEN, so a band you have cleared reads as
                cleared instead of still accusing you. */}
            {/* v7: a tinted strip, not a hairline rule.
                The fill does the section-zoning a 1px line was straining to do,
                and it survives at a glance down a scrolling list where a thin
                rule between similar-looking rows does not. Count sits right,
                away from the label, so neither has to be read to find the
                other. */}
            <div
              className="tq-band"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                padding: "11px 16px",
                fontSize: FS.caption,
                fontWeight: FW.extrabold,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: TONE_COLOR[group.tone],
                background: TONE_BAND_BG[group.tone],
              }}
            >
              <span>{group.label}</span>
              <span style={{ marginLeft: "auto", letterSpacing: 0, fontWeight: FW.bold, opacity: 0.8 }}>
                {group.open > 0 ? group.open : "all set"}
              </span>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {group.items.map((it, rowIndex) => {
          const expanded = it.id === expandedId;
          const action = expanded ? null : itemAction(it);
          const working = it.id === workingId || Boolean(workingIds?.has(it.id));
          const detailOpen = detailIds.has(it.id);
          const canSelect = it.status === "queued" && it.kind !== "contextual";
          return (
            <li
              key={it.id}
              data-status={it.status}
              className="tq-row"
              // Capped stagger: past a handful of rows the delay stops reading
              // as sequence and starts reading as lag.
              style={{ borderRadius: 9, animationDelay: `${Math.min(rowIndex, 5) * 0.03}s` }}
            >
            <div
              className="tq-rowbody"
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto",
                gap: 10,
                alignItems: "start",
                padding: "9px 8px 9px 9px",
                // Square on the stripe side: a 9px radius bends the stripe into
                // a bracket instead of a bar.
                borderRadius: "0 9px 9px 0",
                // Severity in form, not only in colour: the stripe survives a
                // greyscale print and colour-blind vision, where a tinted word
                // does not. State stays with the status dot so the two never
                // have to share one signal.
                borderLeft: `3px solid ${TONE_COLOR[group.tone]}`,
                background: working ? "var(--accent-bg, rgba(9,105,218,0.11))" : undefined,
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
              ) : it.kind === "contextual" && it.status === "queued" ? (
                // Not a checkbox that happens to be missing — an information
                // mark, so the empty slot where every other row has a control
                // reads as deliberate rather than as a row that failed to
                // render one.
                <span
                  role="img"
                  aria-label="context"
                  title="Context, not a selectable gap"
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 5,
                    marginTop: 2,
                    flex: "none",
                    background: "var(--surface-2, rgba(127,127,127,0.08))",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted)",
                    fontSize: 9,
                    fontWeight: FW.extrabold,
                    fontStyle: "italic",
                  }}
                >
                  i
                </span>
              ) : (
                <StatusDot status={it.status} working={working} />
              )}
              <span style={{ minWidth: 0 }}>
                {/* Title and the reason toggle share a line. Seven items fit on
                    screen at a row height of one line; at two they do not, and
                    the queue stops being scannable — which was the whole
                    argument for having one queue. */}
                <span style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
                  {/* One line, always. A responsibility lifted verbatim out of
                      a JD runs to 150+ characters and used to wrap to three
                      lines, so four rows filled the rail and the queue stopped
                      being scannable — which was the entire argument for having
                      one queue. The full text stays reachable: `title` on hover
                      and the toggle below. */}
                  <span
                    className="tq-title"
                    title={isLongTitle(it.name) ? it.name : undefined}
                    style={{
                      fontSize: FS.body,
                      fontWeight: FW.semibold,
                      minWidth: 0,
                      flex: "1 1 auto",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      // Plain ink. Severity is the stripe now, and colouring the
                      // title too made every row shout at the same volume.
                      color:
                        it.status === "not_coverable" || it.status === "ignored"
                          ? "var(--muted)"
                          : "var(--text)",
                    }}
                  >
                    {it.name}
                  </span>
                  {it.detail ? (
                    <button
                      type="button"
                      aria-expanded={detailOpen}
                      onClick={() => toggleDetail(it.id)}
                      style={{ border: 0, background: "none", color: "var(--muted)", padding: 0, fontSize: FS.caption, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap", flex: "none" }}
                    >
                      {/* A cut-off title makes this "show me the rest"; an
                          intact one makes it "explain". Same control, and the
                          label should not claim the wrong one. */}
                      {detailOpen ? "Hide" : isLongTitle(it.name) ? "More" : "Why this matters"}
                    </button>
                  ) : null}
                </span>
                {/* Expanding a clipped row has to give back the words the clip
                    took, or "More" leads somewhere that does not contain what
                    was hidden. */}
                {detailOpen && isLongTitle(it.name) ? (
                  <span style={{ display: "block", fontSize: FS.small, color: "var(--text)", marginTop: 5, maxWidth: "52ch", lineHeight: 1.45 }}>
                    {it.name}
                  </span>
                ) : null}
                {it.detail && detailOpen ? (
                  <span style={{ display: "block", fontSize: FS.small, color: "var(--muted)", marginTop: 4, maxWidth: "52ch", lineHeight: 1.45 }}>
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
            {expanded ? <div className="tq-expand">{expansion}</div> : null}
            </li>
          );
        })}
            </ul>
          </li>
        ))}
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
        <div style={{ borderTop: "1px solid var(--border)", padding: "13px 14px", background: "var(--green-bg, rgba(5,150,105,0.12))" }}>
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
