/**
 * Shapes and small pure helpers for the admin "Extension" tab.
 *
 * ⚠️ The backend (`services/extension_usage.py`) has already decided what these
 * numbers may CLAIM, and the view must not undo any of it:
 *
 *  1. A null rate (`appliedPct`, `requiredOpenPct`, `undoPct`, `attachedPct`)
 *     means SUPPRESSED: the denominator was under `minDenominator`. Render the
 *     count alone, never "0%" and never a fallback.
 *  2. `tracker` and `events` are DIFFERENT PEOPLE. The tracker is recorded for
 *     every connected account when a form is filled; events exist only for
 *     people who pressed Accept. Never divide one by the other, and never sum
 *     their account counts.
 *  3. A fill is not an application. `byStatus` keeps all six statuses in a fixed
 *     order, zeros included, and `reachedApplied` counts applied-or-later only.
 *  4. `byDay` / `fillsByDay` already contain every day in the window, zero where
 *     nothing happened. Draw them as given; do not skip the empty days.
 */

export interface UsageCountRow {
  key: string;
  label: string;
  count: number;
  accounts: number;
}

export interface UsageStatusRow {
  key: string;
  label: string;
  count: number;
}

export interface UsageDay {
  day: string;
  count: number;
}

export interface ExtensionUsageResponse {
  windowDays: number;
  includeStaff: boolean;
  staffExcluded: number;
  minDenominator: number;
  accounts: {
    everConnected: number;
    connectedNow: number;
    seenInWindow: number;
    sessionsTotal: number;
    choseAccept: number;
  };
  tracker: {
    recordedTotal: number;
    recordedInWindow: number;
    accounts: number;
    byStatus: UsageStatusRow[];
    reachedApplied: number;
    appliedPct: number | null;
    byDay: UsageDay[];
  };
  events: {
    total: number;
    accounts: number;
    byName: UsageCountRow[];
    fills: {
      count: number;
      accounts: number;
      filled: number;
      skipped: number;
      requiredTotal: number;
      requiredOpen: number;
      requiredOpenPct: number | null;
      undone: number;
      undoPct: number | null;
    };
    bySite: UsageCountRow[];
    attach: UsageCountRow[];
    attachedPct: number | null;
    problems: UsageCountRow[];
    panel: UsageCountRow[];
    fillsByDay: UsageDay[];
  };
  cached?: boolean;
}

/** True when there is no extension activity of any kind in what was counted. */
export function isEmptyUsage(d: ExtensionUsageResponse): boolean {
  return (
    d.accounts.everConnected === 0 &&
    d.accounts.sessionsTotal === 0 &&
    d.tracker.recordedTotal === 0 &&
    d.events.total === 0
  );
}

export interface DayBar {
  day: string;
  count: number;
  /** 0..1 of the plot height, with a visible floor for any non-zero day. */
  ratio: number;
}

/**
 * Bar heights for a per-day series, scaled to the series' own maximum.
 *
 * A day with activity always gets a visible sliver (a 1-in-30 day must not
 * round to nothing), and a day without any gets none: the backend has already
 * filled the window, so a flat stretch here is real, not missing.
 */
export function dayBars(series: UsageDay[], floor = 0.06): DayBar[] {
  const max = series.reduce((m, p) => Math.max(m, p.count), 0);
  return series.map((p) => ({
    day: p.day,
    count: p.count,
    ratio: max > 0 && p.count > 0 ? Math.max(floor, p.count / max) : 0,
  }));
}

export function sumDays(series: UsageDay[]): number {
  return series.reduce((n, p) => n + p.count, 0);
}
