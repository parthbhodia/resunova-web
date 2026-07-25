import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_TTL_MS,
  invalidateCache,
  readCache,
  updateCache,
  writeCache,
} from "@/lib/clientCache";

describe("clientCache", () => {
  beforeEach(() => {
    invalidateCache();
    vi.useRealTimers();
  });

  it("returns null for an unknown key", () => {
    expect(readCache("nope")).toBeNull();
  });

  it("round-trips a value and reports it fresh", () => {
    writeCache("k", { a: 1 });
    expect(readCache<{ a: number }>("k")).toEqual({ data: { a: 1 }, stale: false });
  });

  it("still returns the value past the TTL, marked stale", () => {
    vi.useFakeTimers();
    writeCache("k", "v");
    vi.advanceTimersByTime(DEFAULT_TTL_MS + 1);
    // Stale-while-revalidate: the caller paints this and refreshes behind it.
    expect(readCache<string>("k")).toEqual({ data: "v", stale: true });
  });

  it("honours a per-read TTL override", () => {
    vi.useFakeTimers();
    writeCache("k", "v");
    vi.advanceTimersByTime(5_000);
    expect(readCache<string>("k", 1_000)?.stale).toBe(true);
    expect(readCache<string>("k", 10_000)?.stale).toBe(false);
  });

  it("invalidates one key, a prefix, or everything", () => {
    writeCache("job:detail:1", "a");
    writeCache("job:detail:2", "b");
    writeCache("other", "c");

    invalidateCache("job:detail:1");
    expect(readCache("job:detail:1")).toBeNull();
    expect(readCache("job:detail:2")).not.toBeNull();

    invalidateCache("job:detail:", { prefix: true });
    expect(readCache("job:detail:2")).toBeNull();
    expect(readCache("other")).not.toBeNull();

    invalidateCache();
    expect(readCache("other")).toBeNull();
  });

  it("updateCache patches in place without refreshing the timestamp", () => {
    vi.useFakeTimers();
    writeCache("k", { n: 1 });
    vi.advanceTimersByTime(DEFAULT_TTL_MS + 1);
    updateCache<{ n: number }>("k", (prev) => ({ n: prev.n + 1 }));
    const hit = readCache<{ n: number }>("k");
    expect(hit?.data).toEqual({ n: 2 });
    // An optimistic patch is not evidence of freshness — the entry stays stale
    // so the next mount still revalidates against the server.
    expect(hit?.stale).toBe(true);
  });

  it("updateCache is a no-op on a key that was never cached", () => {
    updateCache<{ n: number }>("missing", (prev) => ({ n: prev.n + 1 }));
    expect(readCache("missing")).toBeNull();
  });
});
