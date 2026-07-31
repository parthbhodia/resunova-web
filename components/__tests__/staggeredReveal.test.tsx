import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useStaggeredReveal } from "@/components/tailor/TailorQueuePanel";
import type { QueueItem } from "@/lib/tailorWorkQueue";

const item = (id: string, status: QueueItem["status"]): QueueItem => ({
  id, name: id, kind: "keyword", status, detail: "",
});

describe("useStaggeredReveal", () => {
  it("reveals a wave's results one row at a time, not all at once", () => {
    vi.useFakeTimers();
    try {
      const queued = [item("a", "queued"), item("b", "queued"), item("c", "queued")];
      const { result, rerender } = renderHook(
        ({ items }: { items: QueueItem[] }) => useStaggeredReveal(items),
        { initialProps: { items: queued } },
      );

      // One data update flips all three terminal — the single-batch pass.
      const landed = [item("a", "applied"), item("b", "applied"), item("c", "not_coverable")];
      rerender({ items: landed });

      // Nothing shows terminal yet; the walk is starting.
      expect(result.current.displayItems.every((it) => it.status === "queued")).toBe(true);
      expect(result.current.revealing).toBe(true);

      act(() => vi.advanceTimersByTime(450));
      expect(result.current.displayItems.map((it) => it.status)).toEqual([
        "applied", "queued", "queued",
      ]);
      // Spinner walks ahead to the next row.
      expect(result.current.revealWorkingId).toBe("b");

      act(() => vi.advanceTimersByTime(450));
      expect(result.current.displayItems.map((it) => it.status)).toEqual([
        "applied", "applied", "queued",
      ]);

      act(() => vi.advanceTimersByTime(450));
      expect(result.current.displayItems.map((it) => it.status)).toEqual([
        "applied", "applied", "not_coverable",
      ]);
      expect(result.current.revealWorkingId).toBeNull();
      expect(result.current.revealing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows statuses that were already terminal on mount immediately", () => {
    const { result } = renderHook(() =>
      useStaggeredReveal([item("done", "applied"), item("open", "queued")]),
    );
    expect(result.current.displayItems[0].status).toBe("applied");
    expect(result.current.revealing).toBe(false);
  });
});
