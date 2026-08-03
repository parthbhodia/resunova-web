"use client";

/**
 * Pick up a scan that was started before this component existed.
 *
 * On mount: if a run of this kind is still going, report it and stay
 * subscribed; if one finished while we were unmounted, hand over its result
 * once and forget it, so navigating away and back does not re-apply an answer
 * the user has already seen and edited.
 */
import { useEffect, useRef, useState } from "react";
import { clearRun, peekRun, subscribeRun, type RunKind, type RunState } from "@/lib/analyzeRun";

export function useAdoptedRun<T>(
  kind: RunKind,
  onResult: (result: T) => void,
  onError?: (error: unknown) => void,
): { adoptedRunning: boolean } {
  // Read on first render, not in an effect. A scan already in flight has to
  // paint as the loader immediately, or the user sees the upload screen for a
  // frame and thinks their scan never started.
  const [adoptedRunning, setAdoptedRunning] = useState(
    () => peekRun(kind)?.status === "running",
  );
  // The callbacks are usually inline closures; holding them in a ref keeps the
  // adoption effect from re-subscribing (and re-adopting) on every render.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  // Declared BEFORE the adoption effect so it runs first: effects fire in
  // declaration order, and adoption must see the current callbacks.
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const state = peekRun<T>(kind);
    if (!state) return;

    const deliver = (s: RunState<T>) => {
      if (s.status === "running") return;
      setAdoptedRunning(false);
      clearRun(kind);
      if (s.status === "done") onResultRef.current(s.result);
      else onErrorRef.current?.(s.error);
    };

    if (state.status !== "running") {
      // Already settled. Deliver on a microtask rather than synchronously in
      // the effect body: applying a whole analysis result during mount would
      // cascade a second render before the first has painted.
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) deliver(state); });
      return () => { cancelled = true; };
    }

    return subscribeRun<T>(kind, deliver) ?? undefined;
  }, [kind]);

  return { adoptedRunning };
}
