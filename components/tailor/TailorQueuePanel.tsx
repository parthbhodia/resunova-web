"use client";

/**
 * Container that adapts ResumeBuilder's live tailor state into the work-queue
 * surfaces (TailorScoreboard + TailorWorkQueue). Mounted only on the /tailor-2
 * route (ResumeBuilder's `queueUi` prop) while the redesign is validated; the
 * legacy match sidebar and detail tabs render below it as the evidence layer.
 *
 * State mapping, deliberately conservative for the first live slice:
 *  - applied        <- the existing addressedGaps set (same source the old
 *                      cards use, so the two can never disagree)
 *  - not_coverable  <- still open after a completed Fix-everything pass
 *                      (the pass attempted or capped it; either way the user
 *                      deserves an ending, not a silent "missing")
 *  - needs_review   <- not emitted yet; requires per-suggestion risk plumbing
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AddressedGapAction, RatingsData } from "@/lib/types";
import {
  CONTEXTUAL_DETAIL,
  deriveWorkQueue,
  type QueueItem,
} from "@/lib/tailorWorkQueue";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorWorkQueue, type QueueItemAction } from "@/components/tailor/TailorWorkQueue";

const NOT_COVERED_DETAIL =
  "The pass couldn't cover this honestly. Try Fix on it alone, or leave it uncovered rather than stretch.";

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
  onFixItem,
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
  onFixItem: (item: QueueItem) => void;
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
    if (!passRan || fixAllBusy) return base;
    // After a completed pass, nothing stays silently open: what the pass
    // didn't land becomes an explicit "not coverable" with its reason.
    return base.map((it) =>
      it.status === "queued"
        ? {
            ...it,
            status: "not_coverable" as const,
            detail: it.kind === "contextual" ? CONTEXTUAL_DETAIL : NOT_COVERED_DETAIL,
          }
        : it,
    );
  }, [ratings, addressedGaps, addressedGapActions, passRan, fixAllBusy]);

  const kw = ratings.keywords;
  const found = kw?.found_count ?? 0;
  const total = kw?.total_count ?? 0;
  const grade =
    typeof ratings.overall_score === "number"
      ? ratings.overall_score
      : typeof ratings.match_score === "number"
        ? ratings.match_score
        : null;

  const handleItemAction = (item: QueueItem, action: QueueItemAction) => {
    if (action === "fix" || action === "add_to_summary") onFixItem(item);
    // view_change / review navigation lands with the preview-linking slice.
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
      />
    </div>
  );
}
