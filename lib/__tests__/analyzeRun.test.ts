import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRuns,
  clearRun,
  peekRun,
  RUN_RESULT_TTL_MS,
  startRun,
  subscribeRun,
} from "@/lib/analyzeRun";

/** A promise with the resolve/reject handles exposed, so a test can hold a run
 *  "in flight" the way a real 25-second scan is. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => __resetRuns());

describe("a scan that outlives its component", () => {
  it("keeps the result when nobody is listening", async () => {
    // THE BUG. The fetch was never aborted, so the server did the work and
    // charged a scan; the answer was simply assigned to a component that had
    // unmounted. Now it lands somewhere it can be picked up.
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    d.resolve("scored");
    await d.promise;

    expect(peekRun("analyze")).toEqual({ status: "done", result: "scored" });
  });

  it("reports a run that is still going, so a remount shows the loader", () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    expect(peekRun("analyze")).toEqual({ status: "running" });
  });

  it("does not start a second scan while one is in flight", async () => {
    // A double click, or a remount racing the click, must not spend two of the
    // user's daily scans on one question.
    const d = deferred<string>();
    const work = vi.fn(() => d.promise);
    const a = startRun("analyze", work);
    const b = startRun("analyze", work);
    expect(work).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    d.resolve("x");
    await a;
  });

  it("delivers to a listener that subscribed after the run started", async () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    const seen: unknown[] = [];
    subscribeRun("analyze", (s) => seen.push(s));
    d.resolve("scored");
    await d.promise;
    expect(seen).toEqual([{ status: "done", result: "scored" }]);
  });

  it("keeps a failure too, rather than losing the error", async () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise).catch(() => {});
    d.reject(new Error("boom"));
    await d.promise.catch(() => {});
    expect(peekRun("analyze")).toMatchObject({ status: "error" });
  });

  it("has nothing to subscribe to once the run has settled", async () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    d.resolve("x");
    await d.promise;
    expect(subscribeRun("analyze", () => {})).toBeNull();
  });

  it("forgets a result once it has been taken up", async () => {
    // Otherwise leaving and returning re-applies an answer the user has already
    // seen and possibly edited, silently reverting their work.
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    d.resolve("x");
    await d.promise;
    clearRun("analyze");
    expect(peekRun("analyze")).toBeNull();
  });

  it("expires a stale result but never a running one", async () => {
    const d = deferred<string>();
    void startRun("analyze", () => d.promise);
    // Still running, an hour in: a slow scan is still wanted.
    expect(peekRun("analyze", Date.now() + RUN_RESULT_TTL_MS * 4)).toEqual({ status: "running" });

    d.resolve("x");
    await d.promise;
    expect(peekRun("analyze", Date.now() + RUN_RESULT_TTL_MS + 1000)).toBeNull();
  });

  it("keeps analyze and tailor runs apart", async () => {
    const a = deferred<string>();
    const t = deferred<string>();
    void startRun("analyze", () => a.promise);
    void startRun("tailor", () => t.promise);
    a.resolve("A");
    await a.promise;
    expect(peekRun("analyze")).toEqual({ status: "done", result: "A" });
    expect(peekRun("tailor")).toEqual({ status: "running" });
  });

  it("lets a newer run win rather than overwriting it with a stale answer", async () => {
    // The displaced promise is not aborted (its cost is sunk), so it will
    // still settle. It must not clobber the run the user is actually waiting on.
    const first = deferred<string>();
    void startRun("analyze", () => first.promise);
    const settled = deferred<string>();
    void startRun("analyze", () => settled.promise);   // no-op: first is running
    clearRun("analyze");                                // user navigated away

    const second = deferred<string>();
    void startRun("analyze", () => second.promise);
    first.resolve("stale");
    await first.promise;

    expect(peekRun("analyze")).toEqual({ status: "running" });
    second.resolve("fresh");
    await second.promise;
    expect(peekRun("analyze")).toEqual({ status: "done", result: "fresh" });
    settled.resolve("");
  });
});
