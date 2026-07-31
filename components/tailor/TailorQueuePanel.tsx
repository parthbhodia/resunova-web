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

  // Rows whose batch is still generating spin; the set shrinks wave by wave.
  const workingIds = useMemo(() => {
    if (!fixAllBusy || !pendingGapNames?.length) return undefined;
    const pending = new Set(pendingGapNames);
    return new Set(
      items.filter((it) => it.status === "queued" && pending.has(it.name)).map((it) => it.id),
    );
  }, [fixAllBusy, pendingGapNames, items]);

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
        items={items}
        workingIds={workingIds}
        passRan={passRan}
        fixAllBusy={fixAllBusy}
        onFixAll={onFixAll}
        onItemAction={handleItemAction}
        onDownload={onDownload}
      />
    </div>
  );
}
