import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useAdoptedRun } from "@/components/analyze/useAdoptedRun";
import { __resetRuns, startRun } from "@/lib/analyzeRun";

/**
 * The end-to-end shape of the reported bug: start a scan, unmount the component
 * that started it, mount a fresh one, and get the answer anyway.
 *
 * The registry tests prove the result is KEPT. These prove a component actually
 * picks it up, which is the half the user experiences.
 */

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

function Consumer({ onResult }: { onResult: (r: string) => void }) {
  const { adoptedRunning } = useAdoptedRun<string>("analyze", onResult);
  return <div>{adoptedRunning ? "scanning" : "idle"}</div>;
}

beforeEach(() => __resetRuns());

describe("adopting a scan across an unmount", () => {
  it("shows the loader when it mounts into a scan already in flight", () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    render(<Consumer onResult={vi.fn()} />);
    // On the FIRST paint, not after an effect: otherwise the user sees the
    // upload screen flash and thinks the scan never started.
    expect(screen.getByText("scanning")).toBeInTheDocument();
  });

  it("delivers a result that landed while nothing was mounted", async () => {
    // The exact reported sequence: scan starts, user switches tab, the
    // component goes away, the server answers, the user comes back.
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    const { unmount } = render(<Consumer onResult={vi.fn()} />);
    unmount();

    d.resolve("scored");
    await act(async () => { await d.promise; });

    const onResult = vi.fn();
    render(<Consumer onResult={onResult} />);
    await waitFor(() => expect(onResult).toHaveBeenCalledWith("scored"));
  });

  it("delivers to a component that stays mounted through the wait", async () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    const onResult = vi.fn();
    render(<Consumer onResult={onResult} />);
    expect(screen.getByText("scanning")).toBeInTheDocument();

    await act(async () => { d.resolve("scored"); await d.promise; });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith("scored"));
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("does not re-deliver the same result on a later visit", async () => {
    // Re-applying an answer the user has already seen would silently revert
    // any edits they made to it.
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    d.resolve("scored");
    await act(async () => { await d.promise; });

    const first = vi.fn();
    const { unmount } = render(<Consumer onResult={first} />);
    await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
    unmount();

    const second = vi.fn();
    render(<Consumer onResult={second} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(second).not.toHaveBeenCalled();
  });

  it("is idle when there is no scan to adopt", () => {
    render(<Consumer onResult={vi.fn()} />);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });
});
