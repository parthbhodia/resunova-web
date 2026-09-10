"use client";

/**
 * The scans-left quota. One reading, for every surface that shows it.
 *
 * WHY A SHARED STORE
 * ------------------
 * `AppSidebar` and `AppBottomNav` are BOTH mounted at all times — CSS decides
 * which one you see, not React. Two components each running their own fetch
 * would mean two requests per paint and two states that can disagree about the
 * same number. One module-level store, one in-flight request, N subscribers.
 *
 * Three components used to fetch `/api/scan-limit-status` independently on a
 * single page load — this nav, `FreeScanWelcomeBanner`, and Analyze's own
 * session hook — so one screen asked the same question three times and each
 * answer aged separately. They all read from here now, which is also why a scan
 * updates the nav badge immediately: `setScansRemaining` writes THROUGH the
 * store, instead of one component knowing a fresher number than its neighbour.
 *
 * WHY AN EXPLICIT `error` STATE
 * -----------------------------
 * The pill this replaces did `catch {}` and returned null on anything it could
 * not read. A dead backend, an expired token and a genuinely unlimited account
 * all produced the identical blank sidebar — so the badge going missing told
 * you nothing about which had happened. The states below are disjoint on
 * purpose: `unlimited` means we asked and there is no count to show, `error`
 * means we asked and could not find out. Only the first one is silent.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { apiFetch, scanLimitFrom, type ScanLimitStatus } from "@/lib/apiClient";

export type ScansRemainingState =
  /** Nothing metered for this caller. Nothing to show, no problem. */
  | { kind: "idle" }
  | { kind: "loading" }
  /** Admin / Pro / university. Deliberately renders nothing — a count of ∞ is noise. */
  | { kind: "unlimited"; plan: string | null }
  /**
   * Signed out, and scanning needs an account. Its own kind rather than `error`:
   * this is a complete, correct answer, and rendering the outage chip to every
   * guest would cry wolf exactly the way `catch {}` used to. The nav shows
   * nothing for it (no account to budget for); Analyze asks them to sign in.
   */
  | { kind: "requires_sign_in" }
  | {
      kind: "metered";
      remaining: number;
      limit: number;
      resetAt: string | null;
      /**
       * A per-IP guest allowance rather than an account quota. Not produced
       * today (guests are refused, see `requires_sign_in`) but reachable the
       * moment a policy meters them instead; the nav still declines to render
       * it, because there would be no account to budget for.
       */
      anonymous: boolean;
    }
  /** We asked and could not find out. Renders, so an outage is never silent. */
  | { kind: "error" };

/** How long a reading stays fresh before a focus/mount triggers a refetch. */
const TTL_MS = 60_000;

/**
 * Map a `/api/scan-limit-status` body onto a state.
 *
 * Exported for tests: this is where the "unlimited vs unknown" distinction is
 * actually decided, and it is the part worth pinning.
 *
 * A 2xx that is enforced but carries no numbers is an ERROR, not an unlimited
 * plan — the backend omits `limit`/`remaining` only when it also says why
 * (`unlimited`, or `requiresSignIn`), so a payload with none of the three is a
 * contract break we should surface rather than quietly render as "you're fine".
 */
export function scansStateFromStatus(body: unknown): ScansRemainingState {
  const status = scanLimitFrom(body);
  if (status.unlimited) return { kind: "unlimited", plan: status.plan };
  // Before `error`, because this payload legitimately carries no numbers: a
  // guest has no quota, and treating that as a contract break would put an
  // "unavailable" chip in front of every signed-out visitor.
  if (status.requiresSignIn) return { kind: "requires_sign_in" };
  if (!status.enforced) return { kind: "idle" };
  if (status.remaining == null || status.limit == null) return { kind: "error" };
  return {
    kind: "metered",
    remaining: status.remaining,
    limit: status.limit,
    resetAt: status.resetAt,
    anonymous: status.anonymous,
  };
}

/* ── store ────────────────────────────────────────────────────── */

type Cached = {
  state: ScansRemainingState;
  /** The full payload. Home reads `usedLast7Days` from it; the nav states
   *  carry only what a badge needs, and widening them for one consumer would
   *  put a weekly total into a type about today's remaining count. */
  status: ScanLimitStatus | null;
  at: number;
  owner: string | null;
};

let cached: Cached | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(s: ScansRemainingState) => void>();

function publish(
  state: ScansRemainingState,
  owner: string | null,
  status: ScanLimitStatus | null = null,
): void {
  cached = { state, status, at: Date.now(), owner };
  for (const fn of listeners) fn(state);
}

/**
 * One round trip.
 *
 * Runs signed out too: the endpoint answers a guest with `requiresSignIn`, which
 * Analyze turns into a sign-in ask. `apiFetch` simply omits the Authorization
 * header when there is no session, so the guest and account cases are the same
 * request. The nav decides not to render anything for a guest; the store does
 * not decide that for it.
 *
 * A 401 resolves to `idle`, not `error`: we sent a token and were told it is
 * not good, which means signed out — the same state as never having had one.
 * Painting "unavailable" through every sign-out would cry wolf. Any other
 * non-2xx throws, and the caller turns that into `error`.
 */
async function fetchState(): Promise<{
  state: ScansRemainingState;
  owner: string | null;
  status: ScanLimitStatus | null;
}> {
  let owner: string | null = null;
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    owner = data.session?.user?.id ?? null;
  } catch {
    // No Supabase config (marketing-only build) — no API to ask either.
    return { state: { kind: "idle" }, owner: null, status: null };
  }

  const resp = await apiFetch("/api/scan-limit-status");
  if (resp.status === 401) return { state: { kind: "idle" }, owner: null, status: null };
  if (!resp.ok) throw new Error(`scan-limit-status ${resp.status}`);
  const body = await resp.json();
  return { state: scansStateFromStatus(body), owner, status: scanLimitFrom(body) };
}

/** A reading worth keeping through a failed refresh — an actual answer about
 *  this account, as opposed to "not asked yet" or "asked and failed". */
function isRealReading(s: ScansRemainingState | undefined): boolean {
  return s?.kind === "metered" || s?.kind === "unlimited";
}

async function load(force: boolean): Promise<void> {
  if (inFlight) return inFlight;
  // An error is never allowed to go stale-but-fresh-enough: the next focus or
  // mount must re-ask, or the chip sticks for a full TTL after recovery.
  const usable = cached && cached.state.kind !== "error";
  if (!force && usable && Date.now() - cached!.at < TTL_MS) return;

  const hadReading = isRealReading(cached?.state);
  inFlight = (async () => {
    try {
      const { state, owner, status } = await fetchState();
      publish(state, owner, status);
    } catch (err) {
      // House rule (see lib/clientCache.ts): a failed BACKGROUND refresh keeps
      // what is already painted — the last count was real and under a minute
      // old. Only a COLD failure, where we have never had a reading, is allowed
      // to replace the badge with the unavailable chip.
      console.warn("[scans] quota lookup failed:", err);
      if (!hadReading) publish({ kind: "error" }, null);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Drop the cached count — call when the signed-in user changes. */
export function resetScansRemaining(): void {
  cached = null;
  for (const fn of listeners) fn({ kind: "loading" });
}

/**
 * Write a fresh count straight into the store, no refetch.
 *
 * A scan response already carries the post-scan remaining count, so re-asking
 * the server for a number we were just handed is a wasted round trip — and,
 * worse, until the refetch lands the view that ran the scan and the nav badge
 * hold different numbers. Writing through means every surface moves together.
 *
 * No-ops unless the current reading is metered: an unlimited plan has no count
 * to lower, and inventing one out of an `error` would replace "we don't know"
 * with a number we cannot source.
 */
export function setScansRemaining(remaining: number | null): void {
  if (remaining == null || !cached || cached.state.kind !== "metered") return;
  const next = Math.max(0, remaining);
  publish(
    { ...cached.state, remaining: next },
    cached.owner,
    cached.status ? { ...cached.status, remaining: next } : null,
  );
}

/**
 * The full payload, awaiting the shared request rather than starting a new one.
 *
 * For callers that need more than a badge (Home wants `usedLast7Days`) or that
 * fetch imperatively alongside other requests, where a hook does not fit.
 * Returns null when there is nothing to report — a guest with no API, a
 * marketing build, or a failed lookup.
 */
export async function loadScanLimitStatus(): Promise<ScanLimitStatus | null> {
  await load(false);
  return cached?.status ?? null;
}

/* ── hook ─────────────────────────────────────────────────────── */

/**
 * The current quota, plus a `retry` for the error chip.
 *
 * Refetches on window focus so the number is right after a scan run in another
 * tab, and drops the cache when the account changes so one user's count can
 * never paint for the next.
 */
export function useScansRemaining(): {
  state: ScansRemainingState;
  retry: () => void;
} {
  const [state, setState] = useState<ScansRemainingState>(
    () => cached?.state ?? { kind: "loading" },
  );

  useEffect(() => {
    listeners.add(setState);
    if (cached) setState(cached.state);
    void load(false);

    const onFocus = () => void load(false);
    window.addEventListener("focus", onFocus);

    let unsubscribe: (() => void) | undefined;
    try {
      const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        const next = session?.user?.id ?? null;
        // Only a genuinely different account invalidates. supabase-js re-emits
        // SIGNED_IN for the SAME user on tab refocus (see the admin-dashboard
        // entry in CLAUDE.md); treating that as a switch would refetch on every
        // focus and flash the badge back to loading.
        if (cached && cached.owner !== next) {
          resetScansRemaining();
          void load(true);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      /* no Supabase config — nothing to watch */
    }

    return () => {
      listeners.delete(setState);
      window.removeEventListener("focus", onFocus);
      unsubscribe?.();
    };
  }, []);

  const retry = useCallback(() => {
    void load(true);
  }, []);

  return { state, retry };
}
