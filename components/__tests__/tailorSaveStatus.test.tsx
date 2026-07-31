import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTailorSaveStatus } from "@/components/TailorSaveStatus";

describe("useTailorSaveStatus", () => {
  it("never flashes Saving… for a fast save (the fix-everything strobe)", () => {
    // Fix everything fires beginSave/saveSucceeded once per applied batch.
    // Before the debounce the pill strobed Saving…/Saved for the whole pass.
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTailorSaveStatus());

      for (let i = 0; i < 3; i++) {
        act(() => result.current.beginSave());
        // Save resolves quickly — well inside the 400ms delay.
        act(() => vi.advanceTimersByTime(100));
        expect(result.current.state).not.toBe("saving");
        act(() => result.current.saveSucceeded());
        expect(result.current.state).toBe("saved");
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("still shows Saving… when a save is genuinely slow", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTailorSaveStatus());
      act(() => result.current.beginSave());
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.state).toBe("saving");
      act(() => result.current.saveSucceeded());
      expect(result.current.state).toBe("saved");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a pending Saving… timer cannot fire after failure or reset", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTailorSaveStatus());
      act(() => result.current.beginSave());
      act(() => result.current.saveFailed());
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.state).toBe("error");

      act(() => result.current.beginSave());
      act(() => result.current.resetForNewRun());
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.state).toBe("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("fires the success toast only on the first save of a run", () => {
    const { result } = renderHook(() => useTailorSaveStatus());
    act(() => result.current.saveSucceeded());
    expect(result.current.toast).toEqual({ kind: "success" });
    act(() => result.current.dismissToast());
    act(() => result.current.saveSucceeded());
    expect(result.current.toast).toBeNull();
  });
});
