/**
 * A scan that outlives the component that started it.
 *
 * Starting an analysis costs the user a scan against their daily limit and
 * takes 20-30s of LLM time. The request itself was never the problem: it is a
 * plain fetch with no abort, so it completes whether or not anyone is watching.
 * The problem is where the result went. Every setState after the await belonged
 * to a component, so if that component unmounted while the scan was in flight —
 * a tab switch that re-emits auth, a view change, a stray remount — the answer
 * arrived to nobody. The server had done the work and charged for it, and the
 * user was left looking at an empty page with one fewer scan.
 *
 * So the promise and its outcome live here, at module scope, outside React.
 * A component that mounts and finds a run in this slot adopts it: it shows the
 * loader for one still running, or takes the result of one that finished while
 * it was away. Nothing is re-requested and nothing is charged twice.
 *
 * One slot per kind, because a user runs one analysis at a time. Starting a new
 * run replaces the slot; the displaced promise is left to settle on its own
 * rather than aborted, since its cost is already sunk and its result may still
 * be worth having.
 */

export type RunKind = "analyze" | "tailor";

export type RunState<T> =
  | { status: "running" }
  | { status: "done"; result: T }
  | { status: "error"; error: unknown };

interface Slot<T> {
  id: number;
  promise: Promise<T>;
  state: RunState<T>;
  /** When the run SETTLED. Used to expire a stale result, not a running one:
   *  a slow scan is still wanted, an answer from twenty minutes ago is not. */
  settledAt: number | null;
  listeners: Set<(s: RunState<T>) => void>;
}

/**
 * How long a finished result stays adoptable. Generous on purpose: the whole
 * point is that the user already paid for this, so erring toward showing it
 * costs nothing, while erring toward dropping it costs them a scan.
 */
export const RUN_RESULT_TTL_MS = 15 * 60 * 1000;

const slots = new Map<RunKind, Slot<unknown>>();

let nextId = 1;

/**
 * Start a run, or return the one already in flight for this kind.
 *
 * `now` is injected so expiry is testable without faking timers.
 */
export function startRun<T>(
  kind: RunKind,
  work: () => Promise<T>,
  now: number = Date.now(),
): Promise<T> {
  const existing = slots.get(kind) as Slot<T> | undefined;
  // Re-entrancy guard: a double-click or a remount that races the click must
  // not buy a second scan.
  if (existing && existing.state.status === "running") return existing.promise;

  const id = nextId++;
  const promise = work();
  const slot: Slot<T> = {
    id,
    promise,
    state: { status: "running" },
    settledAt: null,
    listeners: new Set(),
  };
  slots.set(kind, slot as Slot<unknown>);

  const settle = (state: RunState<T>) => {
    // A newer run has taken the slot; let the old one settle into nothing
    // rather than overwrite a fresher answer.
    const current = slots.get(kind) as Slot<T> | undefined;
    if (!current || current.id !== id) return;
    current.state = state;
    current.settledAt = Date.now();
    for (const fn of current.listeners) fn(state);
  };

  promise.then(
    (result) => settle({ status: "done", result }),
    (error) => settle({ status: "error", error }),
  );
  // The caller still awaits the real promise; the slot is bookkeeping.
  void now;
  return promise;
}

/**
 * What a mounting component should show, or null when there is nothing to
 * adopt. An expired result is dropped so a fresh visit starts clean.
 */
export function peekRun<T>(kind: RunKind, now: number = Date.now()): RunState<T> | null {
  const slot = slots.get(kind) as Slot<T> | undefined;
  if (!slot) return null;
  if (slot.state.status !== "running" && slot.settledAt !== null
      && now - slot.settledAt > RUN_RESULT_TTL_MS) {
    slots.delete(kind);
    return null;
  }
  return slot.state;
}

/** Subscribe to a running slot. Returns an unsubscribe, or null if nothing is
 *  running to subscribe to. */
export function subscribeRun<T>(
  kind: RunKind,
  fn: (state: RunState<T>) => void,
): (() => void) | null {
  const slot = slots.get(kind) as Slot<T> | undefined;
  if (!slot || slot.state.status !== "running") return null;
  slot.listeners.add(fn as (s: RunState<unknown>) => void);
  return () => { slot.listeners.delete(fn as (s: RunState<unknown>) => void); };
}

/**
 * Forget a run once its result has been taken up by the UI.
 *
 * Without this, navigating away and back would re-adopt an answer the user has
 * already seen and possibly edited, silently reverting their work.
 */
export function clearRun(kind: RunKind): void {
  slots.delete(kind);
}

/** Test seam only. */
export function __resetRuns(): void {
  slots.clear();
  nextId = 1;
}
