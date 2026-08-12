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

/**
 * The save loop, as a property.
 *
 * The hook returns a fresh object literal every render. A consumer that
 * depends on that OBJECT gets a new identity every render — including the one
 * its own setState causes — and ResumeBuilder's debounced Hub-save effect,
 * guarded only by `scoreStale` (which a save does not clear), then re-ran
 * forever: save → re-render → new identity → save. The pill strobed "Saved to
 * My Resumes" and the library was written on a timer indefinitely.
 *
 * The fix depends on the callbacks instead, so this pins that they are stable
 * across the transitions a save actually performs.
 */
describe("callback identity is stable across save transitions", () => {
  it("keeps beginSave/saveSucceeded/saveFailed identical after a save", () => {
    const { result } = renderHook(() => useTailorSaveStatus());
    const before = {
      beginSave: result.current.beginSave,
      saveSucceeded: result.current.saveSucceeded,
      saveFailed: result.current.saveFailed,
    };

    act(() => result.current.beginSave());
    act(() => result.current.saveSucceeded());
    expect(result.current.state).toBe("saved"); // the transition really happened

    expect(result.current.beginSave).toBe(before.beginSave);
    expect(result.current.saveSucceeded).toBe(before.saveSucceeded);
    expect(result.current.saveFailed).toBe(before.saveFailed);
  });

  it("survives an error transition and a reset too", () => {
    const { result } = renderHook(() => useTailorSaveStatus());
    const beginSave = result.current.beginSave;
    act(() => result.current.saveFailed());
    act(() => result.current.resetForNewRun());
    expect(result.current.beginSave).toBe(beginSave);
  });
});
