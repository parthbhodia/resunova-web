/**
 * "Are you actually getting better?" — the one thing the Analyze rail never said.
 *
 * The history rail lists past scores as separate numbers, so a user who has
 * scanned four times sees four unrelated figures and no arc. For a product
 * whose entire promise is that your résumé improves, that is the missing
 * feeling: every visit starts from zero. This turns the list into a movement.
 *
 * Pure and infra-free so the rules below can be tested without mounting the
 * Analyze workspace.
 */

/** The subset of `AnalyzeRecord` this needs. Kept structural so callers can
 *  pass the real record without a mapping step. */
export type ScoreProgressEntry = {
  score: number;
  createdAt: string;
  /** 'estimate' = deterministic save-edits projection; 'llm'/null = measured. */
  scoreSource?: string | null;
};

export type ScoreProgress = {
  /** Latest measured score minus the earliest. Negative is reported, not hidden. */
  delta: number;
  /** ISO timestamp of the earliest measured scan. */
  firstAt: string;
  /** How many measured scans the delta spans. Always >= 2. */
  runs: number;
};

/**
 * Movement between a user's first and latest **measured** score, or `null`
 * when there is nothing honest to say.
 *
 * Three rules, each of which is a claim about honesty rather than formatting:
 *
 * 1. **Estimates are excluded.** `scoreSource === 'estimate'` is the
 *    deterministic projection shown while edits are pending, not a score the
 *    analyzer produced. Building a progress claim on a projection would be
 *    exactly the unfalsifiable number this codebase refuses elsewhere.
 * 2. **Fewer than two measured scans returns null.** One scan is not a trend,
 *    and "+0 since your first scan" on a first visit reads as a failure.
 *    Showing nothing is the honest empty state.
 * 3. **A regression is returned, not suppressed.** If the score went down the
 *    user is entitled to know; the renderer's job is to say so without
 *    scolding, not to hide it.
 *
 * Order-independent: entries are sorted by date rather than trusting the
 * caller's ordering (`azHistory` is newest-first, but that is the store's
 * convention, not this function's contract).
 */
export function computeScoreProgress(entries: readonly ScoreProgressEntry[]): ScoreProgress | null {
  const measured = entries
    .filter((e) => e.scoreSource !== "estimate" && Number.isFinite(e.score))
    .map((e) => ({ score: e.score, createdAt: e.createdAt, at: Date.parse(e.createdAt) }))
    .filter((e) => Number.isFinite(e.at));

  if (measured.length < 2) return null;

  measured.sort((a, b) => a.at - b.at);
  const first = measured[0];
  const latest = measured[measured.length - 1];

  return {
    delta: Math.round(latest.score - first.score),
    firstAt: first.createdAt,
    runs: measured.length,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "Jun 10" for the first-scan date.
 *
 * Local fields are correct here, unlike the bare-`YYYY-MM-DD` case that
 * `formatPublishedAt` warns about: `createdAt` is a full timestamptz, so the
 * user's own calendar day is the one they mean.
 *
 * Exported because Home prints the same first-scan date beside this line's
 * sibling copy; two formatters would eventually disagree about the same day.
 */
export function shortDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/**
 * One line of copy for a progress reading.
 *
 * Deliberately not "+12" / "-5": a bare signed number next to a score ring
 * reads as part of the score. Words say what moved and over what span.
 */
export function formatScoreProgress(progress: ScoreProgress): string {
  const when = shortDate(progress.firstAt);
  const since = when ? ` since ${when}` : " since your first scan";

  if (progress.delta > 0) return `Up ${progress.delta}${since}`;
  if (progress.delta < 0) return `Down ${Math.abs(progress.delta)}${since}`;
  return `Holding steady${since}`;
}

/** Which ink the line takes. A dip is amber, never red: it is information, not an error. */
export function scoreProgressTone(progress: ScoreProgress): string {
  if (progress.delta > 0) return "var(--green-ink, #047857)";
  if (progress.delta < 0) return "var(--amber-ink, #b45309)";
  return "var(--muted)";
}
