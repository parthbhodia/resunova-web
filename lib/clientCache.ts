/**
 * A tiny module-level cache for client-fetched data, plus a
 * stale-while-revalidate hook built on top of it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every view under `RouterView` is UNMOUNTED when the user switches `?view=`,
 * so component state does not survive a page switch (see the admin-dashboard
 * entry in CLAUDE.md). Without a cache above the component tree, coming back
 * to a surface means a blank pane + a full refetch — the "reload lag" that
 * makes an app feel unfinished.
 *
 * Several surfaces already solved this ad hoc (`cohortCache`, `_panelCache`,
 * JobsFeed's `feedCache`). This module is the shared version of that pattern:
 *
 *   - `readCache` / `writeCache` — direct access for imperative flows.
 *   - `useCachedResource`        — declarative: instant paint from cache,
 *                                  silent refresh behind it, stale data kept
 *                                  when a BACKGROUND refresh fails.
 *
 * Entries are per-tab and in-memory only. Nothing here is persistence — it is
 * a paint accelerator, so a stale read must never be treated as authoritative
 * for a write.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Entry<T> = {
  data: T;
  /** epoch ms when this entry was written */
  at: number;
};

const store = new Map<string, Entry<unknown>>();

/** Default freshness window. Older entries still paint, but trigger a refresh. */
export const DEFAULT_TTL_MS = 60_000;

export function readCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): { data: T; stale: boolean } | null {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return null;
  return { data: hit.data, stale: Date.now() - hit.at > ttlMs };
}

export function writeCache<T>(key: string, data: T): void {
  store.set(key, { data, at: Date.now() });
}

/** Drop one key, every key under a prefix, or (no args) the whole cache. */
export function invalidateCache(keyOrPrefix?: string, { prefix = false } = {}): void {
  if (keyOrPrefix == null) {
    store.clear();
    return;
  }
  if (!prefix) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(keyOrPrefix)) store.delete(k);
  }
}

/**
 * Patch a cached value in place — for optimistic updates, so the next mount
 * paints the post-mutation state instead of the pre-mutation one.
 * No-ops when the key is not cached (nothing to keep in sync).
 */
export function updateCache<T>(key: string, updater: (prev: T) => T): void {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return;
  store.set(key, { data: updater(hit.data), at: hit.at });
}

export type CachedResource<T> = {
  /** Cached or freshly-loaded value; null until the first load resolves. */
  data: T | null;
  /** True only on a COLD load (no cached value to paint) — gate skeletons on this. */
  loading: boolean;
  /** True while a background refresh runs over already-painted data. */
  refreshing: boolean;
  /** Set only when there is nothing to show; a failed background refresh keeps stale data. */
  error: string | null;
  /** Force a refetch (e.g. a Retry button). */
  refresh: () => Promise<void>;
  /** Replace the value locally + in the cache, without a fetch (optimistic updates). */
  mutate: (next: T | ((prev: T | null) => T)) => void;
};

/**
 * Paint from cache immediately, refresh behind it.
 *
 * `key` doubles as the cache key and the identity of the request: change it
 * (filters, user id, …) and the hook re-loads. Pass `null` to stay idle — the
 * standard "no session yet, don't fetch" case.
 */
export function useCachedResource<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  { ttlMs = DEFAULT_TTL_MS, enabled = true }: { ttlMs?: number; enabled?: boolean } = {},
): CachedResource<T> {
  const active = enabled && key != null;
  const cached = active ? readCache<T>(key, ttlMs) : null;

  const [data, setData] = useState<T | null>(cached?.data ?? null);
  const [loading, setLoading] = useState(active && !cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the fetcher out of the effect deps — callers pass inline closures and
  // we do not want a new function identity to re-trigger the load.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(
    async (cacheKey: string, signal: AbortSignal, hadData: boolean) => {
      if (hadData) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await fetcherRef.current(signal);
        if (signal.aborted) return;
        writeCache(cacheKey, next);
        setData(next);
        setError(null);
      } catch (e) {
        if (signal.aborted || (e as Error)?.name === "AbortError") return;
        // A failed BACKGROUND refresh keeps what is already on screen; only a
        // cold failure is allowed to surface an error state.
        if (!hadData) setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!active || key == null) {
      setLoading(false);
      return;
    }
    const hit = readCache<T>(key, ttlMs);
    if (hit) {
      setData(hit.data);
      setLoading(false);
      setError(null);
      if (!hit.stale) return; // fresh enough — no network at all
    } else {
      setData(null);
    }
    const ac = new AbortController();
    void load(key, ac.signal, Boolean(hit));
    return () => ac.abort();
  }, [active, key, ttlMs, load]);

  const refresh = useCallback(async () => {
    if (key == null) return;
    const ac = new AbortController();
    await load(key, ac.signal, data != null);
  }, [key, load, data]);

  const mutate = useCallback(
    (next: T | ((prev: T | null) => T)) => {
      setData((prev) => {
        const value = typeof next === "function" ? (next as (p: T | null) => T)(prev) : next;
        if (key != null) writeCache(key, value);
        return value;
      });
    },
    [key],
  );

  return { data, loading, refreshing, error, refresh, mutate };
}
