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
import type { QueueVerdict, SourcedQueueItem } from "@/lib/tailorRequirementQueue";
import { isCredentialRequirement } from "@/lib/degreeRequirement";

/** What the row's trailing action says, per state. Null = no action. */
export type QueueItemAction =
  | "view_change"
  | "review"
  | "add_to_summary"
  | "fix"
  | "whats_this"
  | "add_education"
  | "reconsider"
  | "no_action";

export function itemAction(
  it: QueueItem,
  /** Present on scorer rows. Absent ⇒ unchanged behaviour for legacy callers. */
  verdict?: QueueVerdict,
): QueueItemAction | null {
  // A covered requirement has nothing to do to it, and the mockup says so out
  // loud rather than leaving an empty gutter where every other row has a
  // control — the same reason the contextual rows carry an information mark.
  if (it.status === "covered") return "no_action";
  if (it.status === "applied") return "view_change";
  if (it.status === "needs_review") return "review";
  if (it.status === "ignored") return "reconsider";
  if (it.status === "not_coverable") return it.kind === "contextual" ? "whats_this" : null;
  if (it.kind === "contextual") return "whats_this";
  // A credential cannot be evidenced by rewriting an experience bullet, so it
  // never goes to the bullet fixer. Offered a degree, the model does not
  // decline -- it rewrites something unrelated and invents a justification.
  // Which side of the line the row falls on is the whole honesty question:
  // `partial` means the résumé HAS it and the scanner cannot see the wording,
  // so surfacing it in Education is true. `not_evidenced` means they do not
  // have it, and offering to add it would be offering to fabricate a
  // credential -- the one thing this product must never do.
  if (isCredentialRequirement(it.name)) {
    return verdict === "partial" || verdict === "covered" ? "add_education" : "no_action";
  }
  return "fix";
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
  fix: "Fix this",
  whats_this: "What's this?",
  add_education: "Add to education",
  reconsider: "Reconsider",
  no_action: "No action",
};

/**
 * A keyword is a different job from a gap, so it gets a different verb.
 *
 * "Fix this" on a row whose whole content is the word `gRPC` overstates the
 * work: nothing is broken, a term is missing from a bullet that already
 * describes the work. "Add" says the size of it.
 */
function actionLabel(action: QueueItemAction, it: QueueItem): string {
  if (action === "fix" && it.kind === "keyword") return "Add";
  return ACTION_LABEL[action];
}

/** The claim, in the user's words. */
const VERDICT_LABEL: Record<QueueVerdict, string> = {
  partial: "Partial match",
  not_evidenced: "Not evidenced",
  keyword: "Keyword · fits an existing bullet",
  covered: "You have this",
};

/**
 * Verdict tone, matching the mockup's `.verdictchip[data-tone]`.
 *
 * `partial` is deliberately NOT crit. It means the résumé already demonstrates
 * the requirement and only the wording is off, which is the best news any open
 * row can carry; printing it in the band's alarm colour would tell someone they
 * are missing something they have.
 */
const VERDICT_TONE: Record<QueueVerdict, "crit" | "warn" | "good"> = {
  partial: "warn",
  not_evidenced: "crit",
  keyword: "warn",
  covered: "good",
};

/**
 * A verdict is a PILL, not a coloured word.
 *
 * Rendered as bare tinted text it read as an annotation on the title rather
 * than a state the row is in, which is most of why the queue looked like a
 * list of complaints instead of a set of cards you act on. The border is what
 * does the work: a background alone is a highlight, a background inside a
 * border is a badge.
 *
 * `color-mix` keeps the border derived from the same ink rather than adding a
 * third hard-coded colour per tone to maintain across two themes.
 */
const VERDICT_INK = {
  crit: "var(--red-ink, #b42318)",
  warn: "var(--amber-ink, #b45309)",
  good: "var(--green-ink, #16a34a)",
} as const;
const VERDICT_BG = {
  crit: "var(--red-bg, rgba(220,38,38,0.10))",
  warn: "var(--amber-bg, rgba(180,83,9,0.10))",
  good: "var(--green-bg, rgba(22,163,74,0.10))",
} as const;

function verdictChipStyle(v: QueueVerdict): React.CSSProperties {
  const tone = VERDICT_TONE[v];
  const ink = VERDICT_INK[tone];
  return {
    fontSize: FS.micro,
    fontWeight: FW.bold,
    borderRadius: 5,
    padding: "2px 7px",
    color: ink,
    background: VERDICT_BG[tone],
    border: `1px solid color-mix(in srgb, ${ink} 30%, transparent)`,
    whiteSpace: "nowrap",
    flex: "none",
  };
}

/**
 * The row action, as a button rather than a link.
 *
 * A bare blue word beside a bare grey word is two pieces of text, and nothing
 * on screen says which of them is clickable. The border is the affordance.
 */
const ROW_ACTION_STYLE: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface, transparent)",
  color: "var(--text)",
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: FS.small,
  fontWeight: FW.semibold,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: 1.2,
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
      <span aria-label="applied" className="tq-dot" style={{ ...base, background: "var(--green-ink, #16a34a)", borderColor: "var(--green-ink, #16a34a)", color: "var(--on-fill, #fff)" }}>
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
}) {
  const [showAll, setShowAll] = useState(false);
  const [detailIds, setDetailIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const c = queueCounts(items);
  // Covered rows are not work, so they must not dilute the work bar: with
  // them in the denominator a queue where everything was applied would still
  // render part-empty.
  const workTotal = Math.max(1, c.total - c.covered);
  const seg = (n: number) => `${(n / workTotal) * 100}%`;
  const finished = Boolean(passRan) && c.open === 0;
  const filtered = items;
  // Band FIRST, cap SECOND. The old order sliced the flat list to five rows
  // before grouping, so a posting with seven blockers rendered two of them and
  // printed "2" in the header, and the other two bands did not exist until you
  // found a button. Every work row is now visible by default; only the two
  // advisory bands collapse, each behind its own control.
  const groups = groupQueueBySeverity(filtered, showAll);
  const shown = groups.flatMap((g) => g.items);
  const hiddenCount = groups.reduce((n, g) => n + g.hidden, 0);
  // Rows the collapse control governs. Only ever the advisory bands, so the
  // "collapse" affordance disappears when there is nothing to collapse rather
  // than offering to hide work.
  const collapsibleTotal = filtered.filter(
    (it) => it.status === "covered" || it.kind === "contextual",
  ).length;
  // Credentials are excluded for the same reason contextual rows are: the pass
  // skips them by design (no bullet rewrite can evidence a degree), so counting
  // them makes the button promise work it will not attempt. Ticking a degree
  // and pressing Improve did nothing at all, which reads as a dead button.
  // Their own "Add to education" action is unaffected.
  const selectable = filtered.filter(
    (it) => it.status === "queued" && it.kind !== "contextual" && !isCredentialRequirement(it.name),
  );
  // Open rows a bulk pass deliberately skips. Named here so the header can say
  // so rather than leaving the user to notice the count not adding up.
  const contextualOpen = filtered.filter((it) => it.status === "queued" && it.kind === "contextual").length;
  const selected = selectable.filter((it) => selectedIds.has(it.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
       * warning stops being read at all.
       *
       * ⚠️ The banner BELOW is a different thing and is not that one coming
       * back. That was a warning repeating the stripes; this is a count and a
       * triage instruction — how many rows are pass/fail, and that the rest can
       * wait. Nothing else on the page says which band to start with: the
       * headers name each band, they do not rank them. It hides entirely at
       * zero blockers, so it can never be a red bar over a clean queue. */}
      {/* ⚠️ The gap-count banner lives in TailorQueuePanel, ABOVE the score
       * tiles, not here. Rendered inside this card it sat directly above the
       * "Could get you filtered out" band header and printed that sentence
       * twice in a row, which is the restatement the v7 note above is about.
       * Adjacency is what turned information into noise, so the fix was
       * distance rather than different words. */}
      <div style={{ padding: "17px 16px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: FS.body, fontWeight: FW.bold }}>
            Match gaps{" "}
            <span style={{ color: "var(--muted)", fontWeight: FW.medium }}>
              · {c.open ? `${c.open} to review` : "all reviewed"}
            </span>
          </div>
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
            // The button names a count; it has to attempt exactly that set.
            // Falling through to onFixAll() with no argument let the caller
            // re-derive the work from a NARROWER list than the one on screen,
            // so "Improve 19 blockers" attempted three.
            onClick={() => {
              const target = selected.length > 0 ? selected : selectable;
              if (onFixSelected && target.length > 0) onFixSelected(target);
              else onFixAll();
            }}
            disabled={fixAllBusy || c.open === 0}
            style={{
              background: "var(--accent)",
              color: "var(--on-fill, #fff)",
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
                keeps the button honest without needing a footnote.
                "Blockers" was the next version of the same lie, and only
                looked right while every scored row was banded as one — this
                button covers the blocker AND keyword bands, so it sat above a
                blocker band of two saying it would improve six. "Gaps" is what
                the set actually is, and the exclusion tag beside it already
                names what is left out. */}
            {fixAllBusy
              ? "Improving…"
              : selected.length > 0
                ? `Improve selected (${selected.length})`
                : `Improve ${selectable.length || c.open} gap${(selectable.length || c.open) === 1 ? "" : "s"}`}
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
        {groups.map((group) => (
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
              {/* "all set" is only true when the endings were the user's. A
                  band that merely has nothing OPEN can be nineteen rows we
                  failed to write, and calling that all set is the lie the
                  green tone was also telling. */}
              <span style={{ marginLeft: "auto", letterSpacing: 0, fontWeight: FW.bold, opacity: 0.8 }}>
                {group.band === "covered"
                  // Never "all set": nothing was set. These were satisfied
                  // before the user arrived, so the honest figure is how many
                  // of them there are.
                  ? group.items.length
                  : group.open > 0
                    ? group.open
                    : group.tone === "good"
                      ? "all set"
                      : "none left to try"}
              </span>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {group.items.map((it, rowIndex) => {
          const expanded = it.id === expandedId;
          const verdict = (it as Partial<SourcedQueueItem>).verdict;
          const action = expanded ? null : itemAction(it, verdict);
          // Present only on rows the union produced; a plain QueueItem
          // (a restored payload, a legacy caller) simply has no claim to
          // make and renders without one.
          const working = it.id === workingId || Boolean(workingIds?.has(it.id));
          const detailOpen = detailIds.has(it.id);
          const canSelect = it.status === "queued" && it.kind !== "contextual";
          return (
            <li
              key={it.id}
              data-status={it.status}
              // Rows and their BAND are both <li>, so a text-based locator
              // silently resolves to the band wrapper and drives the wrong row.
              // A browser check that cannot see the row it thinks it clicked is
              // indistinguishable from a working feature.
              data-queue-row={it.name}
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
                borderLeft: `3px solid ${expanded ? "var(--accent)" : TONE_COLOR[group.tone]}`,
                // An open row is tinted and takes the accent stripe, so the
                // confirm flow below it reads as belonging to that row rather
                // than floating between two. Same treatment as `working`,
                // because both mean "this row is what you are doing now".
                background: working || expanded
                  ? "var(--accent-bg, rgba(9,105,218,0.11))"
                  : undefined,
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
                </span>
                {/* The verdict and the reason toggle share the second line.
                 *
                 * A row used to be one line, which kept seven on screen. The
                 * cost was that the row said WHAT the requirement is and never
                 * what we are claiming about it, so "Kubernetes" and "Master's
                 * degree in CS" read as the same kind of problem when one is a
                 * word to add and the other is a credential you either hold or
                 * do not. The verdict is that missing sentence, in two or three
                 * words. Height stays predictable because the title above is
                 * still clipped to one line — that clip is what stopped a
                 * 150-character JD responsibility from filling the rail, and it
                 * is untouched. */}
                {(verdict || it.detail) ? (
                  <span style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 2, minWidth: 0 }}>
                    {verdict ? (
                      <span style={verdictChipStyle(verdict)}>
                        {VERDICT_LABEL[verdict]}
                      </span>
                    ) : null}
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
                        {detailOpen
                        ? "Hide"
                        : it.status === "covered"
                          // On a covered row the detail IS the evidence, and
                          // "Why this matters" would promise an explanation of
                          // a problem the user does not have.
                          ? "Show the evidence"
                          : isLongTitle(it.name) ? "More" : "Why this matters"}
                      </button>
                    ) : null}
                  </span>
                ) : null}
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
              {action === "no_action" ? (
                // Deliberately not a button. There is nothing to press, and a
                // bordered control that does nothing when clicked is worse
                // than plain text saying so.
                <span style={{ fontSize: FS.small, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {ACTION_LABEL.no_action}
                </span>
              ) : action && onItemAction ? (
                <button
                  type="button"
                  onClick={() => onItemAction(it, action)}
                  style={ROW_ACTION_STYLE}
                >
                  {actionLabel(action, it)}
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
          {/* Names the bands, not a bare count. What is behind this is context
              and reassurance, never a blocker, and saying so is the difference
              between a control you can skip and one you have to open to know. */}
          Show {hiddenCount} more from About the employer and Already covered
        </button>
      ) : showAll && collapsibleTotal > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)", background: "var(--surface-2, rgba(127,127,127,0.06))", padding: "10px 14px", color: "var(--accent)", fontSize: FS.small, fontWeight: FW.semibold, cursor: "pointer" }}
        >
          Collapse the advisory rows
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
                  color: "var(--on-fill, #fff)",
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
                  color: "var(--on-fill, #fff)",
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
