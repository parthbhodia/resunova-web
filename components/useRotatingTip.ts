"use client";

import { useEffect, useState } from "react";

/**
 * One rotation speed for every loader tip in the app (founder-directed
 * 2026-08-15: "when showing a loader show tips below for 5s randomly changing
 * to keep user engaged"). The loaders used to tick at 2.6s, 2.8s, 3s and 7s,
 * which meant the same idea read as four different products.
 */
export const LOADER_TIP_INTERVAL_MS = 5000;

function shuffled(count: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Random-order walk over tip indices. Deck-walk, not random-pick, because a
 * pure random pick shows the same tip twice in a row ~1/n of the time and a
 * rotation that repeats reads as stuck — "randomly changing" must always
 * CHANGE. The deck shows every tip once before any repeats; a reshuffle that
 * would open with the tip just shown is rotated one step so the no-repeat
 * property holds across the boundary too.
 *
 * Pure factory (no React) so the algorithm has one home and one test surface:
 * `useRotatingTip` below wraps it for mount-gated loader components, and
 * `useAnalyzeLoaderProgress` drives it index-wise for the Analyze loader.
 */
export function createTipRotation(count: number): () => number {
  let deck = shuffled(count);
  let pos = -1;
  return () => {
    pos += 1;
    if (pos >= deck.length) {
      const last = deck[deck.length - 1];
      deck = shuffled(count);
      if (deck.length > 1 && deck[0] === last) deck.push(deck.shift() as number);
      pos = 0;
    }
    return deck[pos] ?? 0;
  };
}

/**
 * The current tip for a loader that is mounted only while its work runs
 * (all of ours are conditionally rendered, so mount === loading). Changes
 * every LOADER_TIP_INTERVAL_MS in random order, never repeating back-to-back.
 *
 * Safe from hydration mismatch for the same reason: these components never
 * render during prerender, so the lazy shuffle only ever runs after a real
 * user interaction.
 */
export function useRotatingTip(tips: readonly string[]): string {
  // Lazy state, not a render-phase ref write — the react-hooks rules ban the
  // latter, and the rotation's identity must survive re-renders either way.
  const [nextTip] = useState(() => createTipRotation(tips.length));
  const [idx, setIdx] = useState(() => nextTip());

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => setIdx(nextTip()), LOADER_TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tips.length, nextTip]);

  return tips[idx] ?? "";
}
