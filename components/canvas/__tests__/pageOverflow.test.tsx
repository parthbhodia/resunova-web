/**
 * usePageOverflow must not re-render its host when nothing it reports has
 * changed.
 *
 * The hook used to call setFit with a fresh object on every ResizeObserver
 * callback. React only skips a re-render when the new state is Object.is-equal
 * to the old one, so every observation re-rendered the host, including the ones
 * that change neither number. On Analyze the host is the whole
 * AnnotatedResumePanel.
 *
 * The assertions are on referential identity, because that is what React
 * checks. Asserting on the values would pass against the old version.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { PAGE_HEIGHT_PX, usePageOverflow } from "@/components/canvas/PageBoundaryRule";

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the SAME object when an observation reports an unchanged height", () => {
    const { result } = mount();
    observe(900);
    const first = result.current;
    observe(900);
    // Referential identity, not deep equality: this is the check React makes.
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
