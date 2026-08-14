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
import { findAppliedBulletIndex } from "@/lib/resumeBulletMatch";
import { gradeDimensions } from "@/lib/tailorGradeDimensions";

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
          deriveScorerQueue(coverage.unmatched, raterView(ratings), addressedGaps, addressedGapActions, currentResumeText ?? ""),
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

  /**
   * The change behind one applied receipt — same derivation the change log
   * uses, so the row's "Was/Now" can never disagree with the preview. Null
   * when the fix's text was folded into a line a later fix rewrote; the queue
   * then says so instead of offering a "See it" that scrolls nowhere.
   */
  const appliedChangeFor = useCallback(
    (name: string): { before: string; after: string } | null => {
      const idx = findAppliedBulletIndex(name, addressedGapActions ?? [], lineOverrides ?? {});
      if (idx === null) return null;
      const after = (lineOverrides ?? {})[idx];
      if (!after?.trim()) return null;
      const before = (bulletAnalysis?.[idx]?.originalBullet ?? "").trim();
      return { before, after: after.trim() };
    },
    [addressedGapActions, lineOverrides, bulletAnalysis],
  );

  const grade =
    typeof ratings.overall_score === "number"
      ? ratings.overall_score
      : typeof ratings.match_score === "number"
        ? ratings.match_score
        : null;

  // ---- Inline fix expansions ------------------------------------------------
  //
  // Plural, and that is the fix. This was one `expandedId` + one state slot, so
  // opening a second row's fix silently closed the first — destroying loaded
  // suggestions the user had just waited a 5-30s model call for, and any
  // version they had picked. From the user's side: click Fix on row two and
  // row one's work vanishes. Every row now owns its expansion; opening another
  // adds, it never evicts. Closing is the user's act (Close/Ignore/apply), not
  // a side effect of looking at something else.
  const [expansions, setExpansions] = useState<ReadonlyMap<string, FixExpansionState>>(new Map());
  // One in-flight apply at a time: two concurrent applies race on the preview
  // override map. Other expansions stay OPEN, their Add buttons just no-op
  // until the first apply settles.
  const [applyingId, setApplyingId] = useState<string | null>(null);
  // Per-row: a slow response from a superseded fetch must not overwrite a
  // newer one, but rows no longer supersede EACH OTHER.
  const fetchSeqs = useRef(new Map<string, number>());

  const setExpansion = (id: string, state: FixExpansionState | null) => {
    setExpansions((prev) => {
      const next = new Map(prev);
      if (state === null) next.delete(id);
      else next.set(id, state);
      return next;
    });
  };

  const openFix = (item: QueueItem, facts?: ConfirmedFact) => {
    setExpansion(item.id, { phase: "loading" });
    const seq = (fetchSeqs.current.get(item.id) ?? 0) + 1;
    fetchSeqs.current.set(item.id, seq);
    fetchFixSuggestions(item, facts).then(
      (suggestions) => {
        if (fetchSeqs.current.get(item.id) === seq) setExpansion(item.id, { phase: "ready", suggestions });
      },
      (e: unknown) => {
        if (fetchSeqs.current.get(item.id) === seq) {
          setExpansion(item.id, {
            phase: "error",
            message: e instanceof Error ? e.message : "Couldn't write suggestions. Try again.",
          });
        }
      },
    );
  };

  const closeExpansion = (id: string) => {
    fetchSeqs.current.set(id, (fetchSeqs.current.get(id) ?? 0) + 1);
    setExpansion(id, null);
  };

  const handleItemAction = (item: QueueItem, action: QueueItemAction) => {
    if (action === "fix") openFix(item);
    else if (action === "reconsider") onToggleIgnored(item, false);
    else if (action === "add_education") setExpansion(item.id, { phase: "credential" });
    else if (action === "whats_this" || action === "add_to_summary") setExpansion(item.id, { phase: "info" });
    else if (action === "view_change" || action === "review") onSeeItem?.(item);
  };

  const handleApply = async (item: QueueItem, suggestion: FixSuggestion, editedText: string | null) => {
    if (applyingId !== null) return;
    setApplyingId(item.id);
    try {
      await applyFixSuggestion(item, suggestion, editedText);
      closeExpansion(item.id);
    } catch (e: unknown) {
      setExpansion(item.id, {
        phase: "error",
        message: e instanceof Error ? e.message : "Couldn't add that. Try again.",
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleIgnore = (item: QueueItem) => {
    onToggleIgnored(item, true);
    closeExpansion(item.id);
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
      {/* This block orients; it no longer carries the failure count.
       *
       * The count has been a free-standing banner, then an entry row inside the
       * match block, and is now the work queue's own header — see the note in
       * TailorScoreboard. The scroll-to-queue affordance went with it: the
       * sentence is the queue's heading now, so there is nowhere to jump to. */}
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
        dimensions={gradeDimensions(ratings)}
      />
      {/* The chip row is gone: it grouped the same rows by rater category while
          the bands group them by consequence, and the band headers now carry
          true counts. Title had nowhere else to live, so it stays as a line. */}
      <TailorTitleNote ratings={ratings} />
      <div>
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
          // Only when the caller supplied the preview state: without it there
          // is nothing to locate a change in, and the legacy rendering is the
          // honest one.
          appliedChangeFor={lineOverrides ? appliedChangeFor : undefined}
          expandedIds={new Set(expansions.keys())}
          renderExpansion={(item) => {
            const state = expansions.get(item.id);
            if (!state) return null;
            return (
              <TailorFixExpansion
                key={item.id}
                item={item}
                state={state}
                applying={applyingId === item.id}
                onApply={(s, edited) => { void handleApply(item, s, edited); }}
                onIgnore={() => handleIgnore(item)}
                onTryFix={() => openFix(item)}
                // A corrected fact is worth a second call: the API treats
                // confirmed facts as a provenance source, so a number the
                // candidate supplied stops reading as unevidenced.
                onRewriteWithFacts={(fact) => openFix(item, fact)}
                onAddEducation={onAddEducation}
                structuredResume={structuredResume}
                // What applying this one rewrite would do to the deterministic
                // number, before committing to it. Same endpoint the scoreboard
                // uses, so it is a recount rather than a projection: zero-token,
                // no LLM, and it can honestly report no movement or a drop.
                scoreFix={scoreFix}
                onClose={() => closeExpansion(item.id)}
              />
            );
          }}
        />
      </div>
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
