/**
 * usePageOverflow must not re-render its host when the page size has not
 * changed.
 *
 * This is a regression test for a real failure, not a hypothetical. The hook
 * originally called setFit with a fresh object literal on every
 * ResizeObserver callback. React only bails out of a re-render on Object.is
 * equality, so a fresh literal re-rendered the host every single observation.
 *
 * On the Template Builder that was merely wasteful. On the Analyze paper the
 * observed node is AnnotatedResumePanel's whole résumé element, whose
 * highlight overlays measure and reposition as they render — so the re-render
 * fed the next observation and the workspace died with React error #185,
 * maximum update depth exceeded. The screen rendered nothing at all.
 *
 * The assertion is referential identity, because that is precisely what React
 * checks. Asserting on the VALUES would pass against the broken version.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { usePageOverflow, PAGE_HEIGHT_PX } from "../PageBoundaryRule";

/** Captures the callback so a test can drive observations by hand. */
let fire: ((entries: { contentRect: { height: number } }[]) => void) | null = null;

class FakeResizeObserver {
  constructor(cb: (entries: { contentRect: { height: number } }[]) => void) { fire = cb; }
  observe() {}
  disconnect() {}
}

function mount() {
  return renderHook(() => {
    const ref = useRef<HTMLElement | null>(document.createElement("div"));
    return usePageOverflow(ref);
  });
}

const observe = (height: number) => act(() => { fire?.([{ contentRect: { height } }]); });

describe("usePageOverflow", () => {
  beforeEach(() => {
    fire = null;
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  it("returns the SAME object when an observation reports an unchanged height", () => {
    const { result } = mount();
    observe(900);
    const first = result.current;
    observe(900);
    // Referential identity, not deep equality: this is the check React makes,
    // and it is the whole reason the infinite loop existed.
    expect(result.current).toBe(first);
  });

  it("still returns the same object when reflow moves the height sub-pixel", () => {
    const { result } = mount();
    observe(900);
    const first = result.current;
    observe(900.4);
    expect(result.current).toBe(first);
  });

  it("does emit a new object when the page genuinely changes size", () => {
    const { result } = mount();
    observe(900);
    const first = result.current;
    observe(1200);
    expect(result.current).not.toBe(first);
    expect(result.current.overflowPx).toBe(1200 - PAGE_HEIGHT_PX);
  });

  it("reports fill percentage and zero overflow for content that fits", () => {
    const { result } = mount();
    observe(PAGE_HEIGHT_PX / 2);
    expect(result.current).toEqual({ overflowPx: 0, fillPct: 50 });
  });

  it("does not observe at all when disabled", () => {
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(document.createElement("div"));
      return usePageOverflow(ref, false);
    });
    expect(fire).toBeNull();
  });
});
