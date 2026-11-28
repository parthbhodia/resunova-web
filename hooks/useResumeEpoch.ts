"use client";

import { useSyncExternalStore } from "react";
import { resumeEpoch, subscribeResumeChanged } from "@/lib/resumeChange";

/**
 * A number that changes whenever the working résumé does. Put it in an
 * effect's dependencies to refetch anything scored against the résumé.
 * Server render always sees 0.
 */
export function useResumeEpoch(): number {
  return useSyncExternalStore(subscribeResumeChanged, resumeEpoch, () => 0);
}
