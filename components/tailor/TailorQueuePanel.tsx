"use client";

/**
 * Container that adapts ResumeBuilder's live tailor state into the work-queue
 * surfaces (TailorScoreboard + TailorWorkQueue + the inline TailorFixExpansion).
 * Mounted only on the /tailor-2 route (ResumeBuilder's `queueUi` prop) while
 * the redesign is validated; the legacy match sidebar and detail tabs render
 * below it as the evidence layer.
 *
 * State mapping:
 *  - applied        <- the existing addressedGaps set (same source the old
 *                      cards use, so the two can never disagree)
 *  - ignored        <- the user clicked Ignore; owned by ResumeBuilder so the
 *                      Fix-everything pass skips those items too
 *  - not_coverable  <- still open after a completed Fix-everything pass
 *                      (the pass attempted or capped it; either way the user
 *                      deserves an ending, not a silent "missing")
 *  - needs_review   <- not emitted yet; requires per-suggestion risk plumbing
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AddressedGapAction, RatingsData } from "@/lib/types";
import type { StructuredResume, StructuredResumeEducation } from "@/store/resumeAnalyzeStore";
import {
  CONTEXTUAL_DETAIL,
  IGNORED_DETAIL,
  deriveWorkQueue,
  normalizeQueueName,
  groupQueueBySeverity,
  queueCounts,
  type QueueItem,
} from "@/lib/tailorWorkQueue";
import {
  deriveCoveredQueue,
  deriveScorerQueue,
  mergeQueues,
  raterView,
  scoreMovingCount,
} from "@/lib/tailorRequirementQueue";
import { fetchLiveCoverage } from "@/lib/tailorLiveCoverage";
import { FS, FW } from "@/lib/typography";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { useLiveCoverage } from "@/components/tailor/useLiveCoverage";
import { TailorWorkQueue, type QueueItemAction } from "@/components/tailor/TailorWorkQueue";
import { TailorTitleNote } from "@/components/tailor/TailorTitleNote";
import {
  TailorFixExpansion,
  type FixExpansionState,
  type FixSuggestion,
} from "@/components/tailor/TailorFixExpansion";
import type { ConfirmedFact } from "@/lib/tailorConfirmFacts";
import { TailorStrengthsCard } from "@/components/tailor/TailorStrengthsCard";
import { TailorChangeLog } from "@/components/tailor/TailorChangeLog";
import { deriveResumeChanges, type ResumeChange } from "@/lib/tailorChangeLog";

const NOT_COVERED_DETAIL =
  "This one couldn't be written from your real experience. Try Fix on it alone, or leave it out.";

const TERMINAL: ReadonlySet<QueueItem["status"]> = new Set(["applied", "needs_review", "not_coverable"]);

/** ms between row reveals when a wave lands several results at once. */
const REVEAL_STEP_MS = 420;

/**
 * A wave (or a single-batch pass) flips several items terminal in ONE data
 * update. Revealing them all at once reads as "nothing happened, then
 * everything" — so the display lags the data: results reveal one row at a
 * time, in queue order, with the spinner walking ahead. The work is already
 * done when the reveal runs; this staggers only the telling, and the finish
 * line waits for the last row. Skipped under prefers-reduced-motion.
 */
export function useStaggeredReveal(items: readonly QueueItem[]): {
  displayItems: QueueItem[];
  revealWorkingId: string | null;
  revealing: boolean;
} {
  // Statuses already terminal on mount (restored sessions) show immediately.
  const [shown, setShown] = useState<ReadonlySet<string>>(
    () => new Set(items.filter((it) => TERMINAL.has(it.status)).map((it) => it.id)),
  );
  const [revealWorkingId, setRevealWorkingId] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const queueRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The tick reschedules itself; a ref breaks the self-reference cleanly.
  const tickRef = useRef<() => void>(() => {});

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Latest-ref pattern: assigned in an every-render effect (a render-time ref
  // write is a lint error), so the scheduled timeout always calls fresh state.
  useEffect(() => {
    tickRef.current = () => {
      const next = queueRef.current.shift();
      timerRef.current = null;
      if (!next) {
        setRevealWorkingId(null);
        setRevealing(false);
        return;
      }
      setShown((prev) => new Set([...prev, next]));
      const upcoming = queueRef.current[0] ?? null;
      setRevealWorkingId(upcoming);
      if (upcoming) timerRef.current = setTimeout(() => tickRef.current(), REVEAL_STEP_MS);
      else setRevealing(false);
    };
  });

  useEffect(() => {
    const fresh = items.filter(
      (it) => TERMINAL.has(it.status) && !shown.has(it.id) && !queueRef.current.includes(it.id),
    );
    if (fresh.length === 0) return;
    if (reduceMotion) {
      setShown((prev) => new Set([...prev, ...fresh.map((it) => it.id)]));
      return;
    }
    queueRef.current.push(...fresh.map((it) => it.id));
    setRevealing(true);
    if (timerRef.current === null) {
      setRevealWorkingId(queueRef.current[0] ?? null);
      timerRef.current = setTimeout(() => tickRef.current(), REVEAL_STEP_MS);
    }
  }, [items, shown, reduceMotion]);

  useEffect(() => () => { if (timerRef.current !== null) clearTimeout(timerRef.current); }, []);

  const displayItems = useMemo(
    () =>
      items.map((it) =>
        TERMINAL.has(it.status) && !shown.has(it.id) ? { ...it, status: "queued" as const } : it,
      ),
    [items, shown],
  );

  return { displayItems, revealWorkingId, revealing };
}

export function TailorQueuePanel({
  ratings,
  addressedGaps,
  addressedGapActions,
  fixAllBusy,
  pendingGapNames,
  attemptedNames,
  onFixAll,
  onFixSelected,
  fetchFixSuggestions,
  applyFixSuggestion,
  ignoredNames,
  onToggleIgnored,
  onSeeItem,
  lineOverrides,
  bulletAnalysis,
  onUndoChange,
  stale,
  onRecheck,
  recheckBusy,
  onDownload,
  onInterviewPrep,
  requirementConcepts,
  currentResumeText,
  onAddEducation,
  structuredResume,
}: {
  ratings: RatingsData;
  addressedGaps: ReadonlySet<string>;
  addressedGapActions?: readonly AddressedGapAction[];
  fixAllBusy: boolean;
  /** Gap names whose batch is still generating — these rows spin, and each
   *  wave that lands clears its own. */
  pendingGapNames?: readonly string[];
  /** Normalized names the last pass actually sent a request for. Only these
   *  may be marked "not coverable" when it ends: everything else was never
   *  tried, and saying otherwise blames the résumé for our own omission. */
  attemptedNames?: ReadonlySet<string>;
  onFixAll: () => void;
  onFixSelected?: (items: readonly QueueItem[]) => void;
  /** Fetch rewrite options for one item; the row expands inline around them. */
  /** `facts` is present only when the user corrected the drafted claim. */
  fetchFixSuggestions: (item: QueueItem, facts?: ConfirmedFact) => Promise<FixSuggestion[]>;
  /** Apply the picked (possibly edited) suggestion to the preview. */
  applyFixSuggestion: (
    item: QueueItem,
    suggestion: FixSuggestion,
    editedText: string | null,
  ) => Promise<void>;
  /** Normalized names the user ignored — owned upstream so Fix everything
   *  skips them too. */
  ignoredNames: ReadonlySet<string>;
  onToggleIgnored: (item: QueueItem, ignored: boolean) => void;
  /** "See it" on an applied row: frame the preview bullet the fix landed on. */
  onSeeItem?: (item: QueueItem) => void;
  /** The applied-fix map the preview renders from. The change log is derived
   *  from THIS rather than kept as its own list, so the receipt and the
   *  document cannot drift apart. */
  lineOverrides?: Record<number, string>;
  /** Original bullet text, for the "before" side of each change. */
  bulletAnalysis?: ReadonlyArray<{ originalBullet?: string } | undefined>;
  /** Revert one change. Absent ⇒ the log renders read-only. */
  onUndoChange?: (change: ResumeChange) => void;
  stale: boolean;
  onRecheck: () => void;
  recheckBusy: boolean;
  /** From the analyze response. Handed straight back to score-preview, which
   *  is why the recount costs no tokens and needs no server-side cache. */
  /** Write a credential into Education. Absent ⇒ the credential card explains
   *  what to add instead of writing it, so the panel still works standalone
   *  (the /tailor-preview harness has no résumé to write to). */
  onAddEducation?: (entry: StructuredResumeEducation) => Promise<void> | void;
  structuredResume?: StructuredResume | null;
  requirementConcepts?: readonly unknown[];
  /** Résumé text with applied fixes baked in, i.e. what is being scored. */
  currentResumeText?: string;
  onDownload?: () => void;
  /** Finish-line handoff into interview prep, carrying this run's resume + JD. */
  onInterviewPrep?: () => void;
}) {
  // A pass "ran" once Fix everything has gone busy -> idle in this mount.
  const [passRan, setPassRan] = useState(false);
  const wasBusy = useRef(false);
  useEffect(() => {
    if (fixAllBusy) wasBusy.current = true;
    else if (wasBusy.current) setPassRan(true);
  }, [fixAllBusy]);

  const kw = ratings.keywords;
  const scanFound = kw?.found_count ?? 0;
  const scanTotal = kw?.total_count ?? 0;
  // Recount against the current text when we can; fall back to the scan's
  // counts (and the honest label) when we cannot. Read BEFORE the queue is
  // built, because the queue is now partly derived from what it returns.
  const coverage = useLiveCoverage(
    requirementConcepts,
    currentResumeText ?? "",
    { found: scanFound, total: scanTotal },
  );

  const items = useMemo(() => {
    const raterRows = deriveWorkQueue(ratings, addressedGaps, addressedGapActions);
    // The scored requirements are the spine: they are what the percentage
    // counts, so they are what the user has to move. The rater's list rides on
    // top for the gaps a matcher cannot see (an unevidenced claim behind a term
    // that does appear). Until a recount lands, `unmatched` is empty and this
    // is byte-for-byte the queue that shipped before.
    const base = coverage.unmatched.length
      ? mergeQueues(
          deriveScorerQueue(coverage.unmatched, raterView(ratings), addressedGaps, addressedGapActions),
          raterRows,
        )
      : raterRows;
    // Reassurance rides at the end, always. These are requirements the résumé
    // already satisfies; `queueCounts` excludes them from `open`, so they
    // cannot inflate the "N to review" the whole surface is scored on.
    const withCovered = [...base, ...deriveCoveredQueue(ratings, base)];
    // A pass marks only what it ATTEMPTED.
    //
    // This used to stamp every still-queued row "couldn't be written from your
    // real experience" once a pass ended. That is a claim about the user's
    // résumé, and it was being made about rows no request was ever sent for —
    // the pass ran over the rater's shortlist while the queue showed the wider
    // scorer union. Eight identical false sentences in a column is what the
    // user saw. A row we did not try stays open, because it is.
    const withPass =
      !passRan || fixAllBusy
        ? withCovered
        : withCovered.map((it) =>
            it.status === "queued" && attemptedNames?.has(normalizeQueueName(it.name))
              ? {
                  ...it,
                  status: "not_coverable" as const,
                  detail: it.kind === "contextual" ? CONTEXTUAL_DETAIL : NOT_COVERED_DETAIL,
                }
              : it,
          );
    // The user's explicit Ignore wins over the pass's "not coverable".
    return withPass.map((it) =>
      it.status !== "applied" && it.status !== "needs_review"
        && ignoredNames.has(normalizeQueueName(it.name))
        ? { ...it, status: "ignored" as const, detail: IGNORED_DETAIL }
        : it,
    );
  }, [
    ratings,
    addressedGaps,
    addressedGapActions,
    passRan,
    fixAllBusy,
    ignoredNames,
    coverage.unmatched,
    attemptedNames,
  ]);

  // Derived, never stored: a second list of "what changed" would be one more
  // thing that can disagree with the preview, and the preview is what ships.
  const changes = useMemo(
    () => deriveResumeChanges(items, addressedGapActions ?? [], lineOverrides ?? {}, bulletAnalysis ?? []),
    [items, addressedGapActions, lineOverrides, bulletAnalysis],
  );

  const grade =
    typeof ratings.overall_score === "number"
      ? ratings.overall_score
      : typeof ratings.match_score === "number"
        ? ratings.match_score
        : null;

  // ---- Inline fix expansion -------------------------------------------------
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandState, setExpandState] = useState<FixExpansionState>({ phase: "loading" });
  const [applying, setApplying] = useState(false);
  // Guards a slow response from an earlier row overwriting the current one.
  const fetchSeq = useRef(0);

  const expandedItem = expandedId ? items.find((it) => it.id === expandedId) ?? null : null;

  const openFix = (item: QueueItem, facts?: ConfirmedFact) => {
    setExpandedId(item.id);
    setExpandState({ phase: "loading" });
    const seq = ++fetchSeq.current;
    fetchFixSuggestions(item, facts).then(
      (suggestions) => {
        if (fetchSeq.current === seq) setExpandState({ phase: "ready", suggestions });
      },
      (e: unknown) => {
        if (fetchSeq.current === seq) {
          setExpandState({
            phase: "error",
            message: e instanceof Error ? e.message : "Couldn't write suggestions. Try again.",
          });
        }
      },
    );
  };

  const closeExpansion = () => {
    fetchSeq.current++;
    setExpandedId(null);
  };

  const handleItemAction = (item: QueueItem, action: QueueItemAction) => {
    if (action === "fix") openFix(item);
    else if (action === "reconsider") onToggleIgnored(item, false);
    else if (action === "add_education") {
      setExpandedId(item.id);
      setExpandState({ phase: "credential" });
    } else if (action === "whats_this" || action === "add_to_summary") {
      setExpandedId(item.id);
      setExpandState({ phase: "info" });
    } else if (action === "view_change" || action === "review") {
      onSeeItem?.(item);
    }
  };

  const handleApply = async (suggestion: FixSuggestion, editedText: string | null) => {
    if (!expandedItem) return;
    setApplying(true);
    try {
      await applyFixSuggestion(expandedItem, suggestion, editedText);
      closeExpansion();
    } catch (e: unknown) {
      setExpandState({
        phase: "error",
        message: e instanceof Error ? e.message : "Couldn't add that. Try again.",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleIgnore = () => {
    if (expandedItem) onToggleIgnored(expandedItem, true);
    closeExpansion();
  };

  const { displayItems, revealWorkingId, revealing } = useStaggeredReveal(items);

  // Rows whose batch is still generating spin; the set shrinks wave by wave.
  // During a reveal, the walking spinner takes over for the next row to land.
  const workingIds = useMemo(() => {
    const ids = new Set<string>();
    if (fixAllBusy && pendingGapNames?.length) {
      const pending = new Set(pendingGapNames);
      for (const it of displayItems) {
        if (it.status === "queued" && pending.has(it.name)) ids.add(it.id);
      }
    }
    if (revealWorkingId) ids.add(revealWorkingId);
    return ids.size > 0 ? ids : undefined;
  }, [fixAllBusy, pendingGapNames, displayItems, revealWorkingId]);

  // Split the open work by band so the banner can rank it: blockers are what a
  // screener fails you on, everything else is upside.
  const bandCounts = useMemo(() => {
    const counts = queueCounts(items);
    const blockerOpen = groupQueueBySeverity(items).find((g) => g.band === "blocker")?.open ?? 0;
    return { blockerOpen, smallerOpen: Math.max(0, counts.open - blockerOpen) };
  }, [items]);
  const { blockerOpen, smallerOpen } = bandCounts;

  /**
   * Score one pending rewrite against the current résumé.
   *
   * Returns null rather than a guess when there is nothing to score with —
   * a card that cannot recount says nothing instead of showing a number it
   * made up.
   */
  const scoreFix = useCallback(
    async (original: string, suggested: string) => {
      const text = currentResumeText ?? "";
      if (!requirementConcepts?.length || !text.trim() || !original.trim()) return null;
      const r = await fetchLiveCoverage(requirementConcepts, text, undefined, [
        { original, suggested },
      ]);
      if (!r || typeof r.before !== "number" || typeof r.after !== "number") return null;
      return { before: r.before, after: r.after };
    },
    [requirementConcepts, currentResumeText],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 12px 0" }}>
      {/* Above the tiles, per the mockup.
       *
       * It belongs here rather than inside the queue card: sitting directly on
       * top of the "Could get you filtered out" band header it printed that
       * sentence twice in a row, which is exactly the restatement the queue's
       * own v7 note warns about. Distance is what makes it information again.
       *
       * This is NOT the "Keep every claim true" banner returning. That was a
       * warning repeating the row stripes; this is a count and an ordering —
       * how many rows are pass/fail and that the rest can wait. Nothing else
       * ranks the bands. It renders nothing at zero blockers. */}
      {blockerOpen > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems: "flex-start",
            margin: "16px 16px 0",
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--red-bg, rgba(220,38,38,0.10))",
            border: "1px solid color-mix(in srgb, var(--red-ink, #b42318) 26%, transparent)",
          }}
        >
          <span
            aria-hidden
            style={{
              flex: "none", width: 22, height: 22, borderRadius: 7,
              display: "grid", placeItems: "center",
              background: "var(--red-ink, #b42318)", color: "#fff",
              fontSize: FS.caption, fontWeight: FW.extrabold,
            }}
          >
            !
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: FS.body, fontWeight: FW.bold, color: "var(--red-ink, #b42318)" }}>
              {blockerOpen} gap{blockerOpen === 1 ? "" : "s"} could get you filtered out
            </div>
            <div style={{ fontSize: FS.small, color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>
              {/* Naming what can wait is the point. A count on its own is
                  pressure; a count plus an ordering is a plan. */}
              Hard requirements the posting asks for that your resume does not
              evidence yet.
              {smallerOpen > 0
                ? ` The other ${smallerOpen} can wait.`
                : ""}
            </div>
          </div>
        </div>
      ) : null}
      <TailorScoreboard
        found={coverage.found}
        total={coverage.total}
        live={coverage.live}
        lost={coverage.lost}
        grade={grade}
        gradedAtLabel={null}
        stale={stale}
        onRecheck={onRecheck}
        recheckBusy={recheckBusy}
      />
      {/* The chip row is gone: it grouped the same rows by rater category while
          the bands group them by consequence, and the band headers now carry
          true counts. Title had nowhere else to live, so it stays as a line. */}
      <TailorTitleNote ratings={ratings} />
      <TailorWorkQueue
        items={displayItems}
        workingIds={workingIds}
        passRan={passRan && !revealing}
        fixAllBusy={fixAllBusy || revealing}
        onFixAll={onFixAll}
        onFixSelected={onFixSelected}
        onItemAction={handleItemAction}
        onDownload={onDownload}
        onInterviewPrep={onInterviewPrep}
        expandedId={expandedId}
        expansion={
          expandedItem ? (
            <TailorFixExpansion
              key={expandedItem.id}
              item={expandedItem}
              state={expandState}
              applying={applying}
              onApply={(s, edited) => { void handleApply(s, edited); }}
              onIgnore={handleIgnore}
              onTryFix={() => openFix(expandedItem)}
              // A corrected fact is worth a second call: the API treats
              // confirmed facts as a provenance source, so a number the
              // candidate supplied stops reading as unevidenced.
              onRewriteWithFacts={(fact) => openFix(expandedItem, fact)}
              onAddEducation={onAddEducation}
              structuredResume={structuredResume}
              // What applying this one rewrite would do to the deterministic
              // number, before committing to it. Same endpoint the scoreboard
              // uses, so it is a recount rather than a projection: zero-token,
              // no LLM, and it can honestly report no movement or a drop.
              scoreFix={scoreFix}
              onClose={closeExpansion}
            />
          ) : null
        }
      />
      {/* Above the strengths card on purpose: this is the record of work the
          user just did, and it is what they came back to check. Reassurance
          sits under it. Renders nothing until there IS a change. */}
      <TailorChangeLog
        changes={changes}
        onUndo={(c) => onUndoChange?.(c)}
        onSee={onSeeItem ? (c) => {
          const first = c.requirements[0];
          const row = items.find((it) => it.name === first);
          if (row) onSeeItem(row);
        } : undefined}
      />
      <TailorStrengthsCard
        verdict={ratings.verdict}
        strengths={ratings.whats_working ?? []}
        fitFactors={ratings.role_context}
      />
    </div>
  );
}
