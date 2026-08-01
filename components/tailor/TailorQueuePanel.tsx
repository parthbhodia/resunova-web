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

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AddressedGapAction, RatingsData } from "@/lib/types";
import {
  CONTEXTUAL_DETAIL,
  IGNORED_DETAIL,
  deriveWorkQueue,
  normalizeQueueName,
  type QueueItem,
} from "@/lib/tailorWorkQueue";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorWorkQueue, type QueueItemAction } from "@/components/tailor/TailorWorkQueue";
import {
  TailorFixExpansion,
  type FixExpansionState,
  type FixSuggestion,
} from "@/components/tailor/TailorFixExpansion";

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
  onFixAll,
  fetchFixSuggestions,
  applyFixSuggestion,
  ignoredNames,
  onToggleIgnored,
  stale,
  onRecheck,
  recheckBusy,
  onDownload,
}: {
  ratings: RatingsData;
  addressedGaps: ReadonlySet<string>;
  addressedGapActions?: readonly AddressedGapAction[];
  fixAllBusy: boolean;
  /** Gap names whose batch is still generating — these rows spin, and each
   *  wave that lands clears its own. */
  pendingGapNames?: readonly string[];
  onFixAll: () => void;
  /** Fetch rewrite options for one item; the row expands inline around them. */
  fetchFixSuggestions: (item: QueueItem) => Promise<FixSuggestion[]>;
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
  stale: boolean;
  onRecheck: () => void;
  recheckBusy: boolean;
  onDownload?: () => void;
}) {
  // A pass "ran" once Fix everything has gone busy -> idle in this mount.
  const [passRan, setPassRan] = useState(false);
  const wasBusy = useRef(false);
  useEffect(() => {
    if (fixAllBusy) wasBusy.current = true;
    else if (wasBusy.current) setPassRan(true);
  }, [fixAllBusy]);

  const items = useMemo(() => {
    const base = deriveWorkQueue(ratings, addressedGaps, addressedGapActions);
    const withPass =
      !passRan || fixAllBusy
        ? base
        : // After a completed pass, nothing stays silently open: what the pass
          // didn't land becomes an explicit "not coverable" with its reason.
          base.map((it) =>
            it.status === "queued"
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
  }, [ratings, addressedGaps, addressedGapActions, passRan, fixAllBusy, ignoredNames]);

  const kw = ratings.keywords;
  const found = kw?.found_count ?? 0;
  const total = kw?.total_count ?? 0;
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

  const openFix = (item: QueueItem) => {
    setExpandedId(item.id);
    setExpandState({ phase: "loading" });
    const seq = ++fetchSeq.current;
    fetchFixSuggestions(item).then(
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
    else if (action === "whats_this" || action === "add_to_summary") {
      setExpandedId(item.id);
      setExpandState({ phase: "info" });
    }
    // view_change / review navigation lands with the preview-linking slice.
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 12px 0" }}>
      <TailorScoreboard
        found={found}
        total={total}
        grade={grade}
        gradedAtLabel={null}
        stale={stale}
        onRecheck={onRecheck}
        recheckBusy={recheckBusy}
      />
      <TailorWorkQueue
        items={displayItems}
        workingIds={workingIds}
        passRan={passRan && !revealing}
        fixAllBusy={fixAllBusy || revealing}
        onFixAll={onFixAll}
        onItemAction={handleItemAction}
        onDownload={onDownload}
        expandedId={expandedId}
        expansion={
          expandedItem ? (
            <TailorFixExpansion
              item={expandedItem}
              state={expandState}
              applying={applying}
              onApply={(s, edited) => { void handleApply(s, edited); }}
              onIgnore={handleIgnore}
              onTryFix={() => openFix(expandedItem)}
              onClose={closeExpansion}
            />
          ) : null
        }
      />
    </div>
  );
}
