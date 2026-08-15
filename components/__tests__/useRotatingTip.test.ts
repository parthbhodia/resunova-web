import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  LOADER_TIP_INTERVAL_MS,
  createTipRotation,
  useRotatingTip,
} from "@/components/useRotatingTip";

/**
 * The shared loader-tip rotation (founder-directed 2026-08-15: tips below
 * every loader, changing every 5s, in random order). Deck-walk properties are
 * what make "randomly changing" true on screen: full variety before any
 * repeat, and never the same tip twice in a row — a random PICK fails both.
 */

describe("createTipRotation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows every tip once before any repeats", () => {
    const next = createTipRotation(6);
    const firstPass = Array.from({ length: 6 }, () => next());
    expect([...new Set(firstPass)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("actually randomizes the order", () => {
    // Math.random pinned to 0 drives Fisher-Yates to a KNOWN non-identity
    // permutation. If the shuffle is deleted (identity deck = sequential
    // rotation, the pre-2026-08-15 behaviour), this goes red.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const next = createTipRotation(5);
    const order = Array.from({ length: 5 }, () => next());
    expect(order).not.toEqual([0, 1, 2, 3, 4]);
  });

  it("never repeats across the deck boundary", () => {
    // Adversarial seed: the reshuffled deck opens with the tip just shown,
    // so without the rotate-one-step guard the tip visibly sticks for 10s.
    const seq = [0, 0.99];
    vi.spyOn(Math, "random").mockImplementation(() => seq.shift() ?? 0.5);
    const next = createTipRotation(2);
    const a = next();
    const b = next();
    const c = next(); // boundary: naive reshuffle would repeat b
    expect(b).not.toBe(a);
    expect(c).not.toBe(b);
  });

  it("a single tip is stable rather than crashing", () => {
    const next = createTipRotation(1);
    expect(next()).toBe(0);
    expect(next()).toBe(0);
  });
});

describe("useRotatingTip", () => {
  it("changes the tip at 5s, not sooner", () => {
    // LITERAL milliseconds on purpose. A first draft advanced by
    // `LOADER_TIP_INTERVAL_MS - 1000`, which derives the test's clock from
    // the constant under test — mutating the interval to 3s turned nothing
    // red because the waits moved with it. The founder's ask is five seconds,
    // so five thousand is written out.
    vi.useFakeTimers();
    try {
      const tips = ["a", "b", "c", "d", "e", "f"];
      const { result } = renderHook(() => useRotatingTip(tips));
      const first = result.current;
      expect(tips).toContain(first);
      // A faster interval (the old 2.6-3s tickers) turns this red.
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current).toBe(first);
      // A slower interval (the old 7s Analyze ticker) turns this one red.
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).not.toBe(first);
      const second = result.current;
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current).not.toBe(second);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the shared cadence is the five seconds the loaders promise", () => {
    expect(LOADER_TIP_INTERVAL_MS).toBe(5000);
  });
});
