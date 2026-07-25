"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Prefetch-on-intent: start the work the moment the user *signals* they are
 * about to click — pointer-over, focus, or touch-start — so the payload is
 * usually already in memory by the time the click lands.
 *
 * Deliberately conservative:
 *   - fires at most once per key (a hover-scrub down a list of 50 job cards
 *     must not fan out 50 requests twice),
 *   - waits `delayMs` so a pointer merely crossing a card does not trigger it,
 *   - swallows failures — a prefetch that fails is a no-op, never a UI error.
 *
 * Usage:
 *   const intent = usePrefetchOnIntent();
 *   <a {...intent(job.id, () => prefetchJob(job.id))}>…</a>
 */
export function usePrefetchOnIntent({ delayMs = 90 }: { delayMs?: number } = {}) {
  const fired = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, []);

  const cancel = useCallback((key: string) => {
    const t = timers.current.get(key);
    if (t) {
      clearTimeout(t);
      timers.current.delete(key);
    }
  }, []);

  const arm = useCallback(
    (key: string, run: () => void | Promise<unknown>) => {
      if (fired.current.has(key) || timers.current.has(key)) return;
      const t = setTimeout(() => {
        timers.current.delete(key);
        fired.current.add(key);
        try {
          void Promise.resolve(run()).catch(() => {});
        } catch {
          /* prefetch is best-effort */
        }
      }, delayMs);
      timers.current.set(key, t);
    },
    [delayMs],
  );

  /** Spread the result onto the hoverable element. */
  return useCallback(
    (key: string, run: () => void | Promise<unknown>) => ({
      onPointerEnter: () => arm(key, run),
      onPointerLeave: () => cancel(key),
      onFocus: () => arm(key, run),
      onTouchStart: () => arm(key, run),
    }),
    [arm, cancel],
  );
}

export default usePrefetchOnIntent;
