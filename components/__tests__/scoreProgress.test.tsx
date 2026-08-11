/**
 * The score-progress line.
 *
 * These are mostly honesty rules rather than formatting checks: what counts as
 * a measured score, when there is nothing to claim, and that a regression is
 * reported rather than quietly dropped.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  computeScoreProgress,
  formatScoreProgress,
  scoreProgressTone,
  type ScoreProgressEntry,
} from "@/components/analyze/scoreProgress";
import { AnalyzeSidebarPinned } from "@/components/analyze/AnalyzeSidebar";

const at = (day: number) => `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`;
const run = (score: number, day: number, scoreSource?: string | null): ScoreProgressEntry =>
  ({ score, createdAt: at(day), scoreSource });

describe("what counts as progress", () => {
  it("measures from the first scan to the latest", () => {
    const p = computeScoreProgress([run(84, 20), run(72, 10), run(79, 15)]);
    expect(p).toEqual({ delta: 12, firstAt: at(10), runs: 3 });
  });

  it("does not trust the caller's ordering", () => {
    // azHistory is newest-first, but that is the store's convention, not this
    // function's contract. Same set, three orderings, one answer.
    const runs = [run(72, 10), run(84, 20)];
    const expected = { delta: 12, firstAt: at(10), runs: 2 };
    expect(computeScoreProgress(runs)).toEqual(expected);
    expect(computeScoreProgress([...runs].reverse())).toEqual(expected);
  });

  it("says nothing on a single scan", () => {
    // One scan is not a trend, and "+0 since your first scan" on a first visit
    // reads as a failure. Silence is the honest empty state.
    expect(computeScoreProgress([run(72, 10)])).toBeNull();
    expect(computeScoreProgress([])).toBeNull();
  });

  it("excludes save-edit estimates from the claim", () => {
    // An 'estimate' is the deterministic projection shown while edits are
    // pending, not a score the analyzer produced. Two real scans plus an
    // estimate must measure the two real ones.
    const p = computeScoreProgress([run(72, 10), run(95, 15, "estimate"), run(80, 20)]);
    expect(p?.delta).toBe(8);
    expect(p?.runs).toBe(2);
  });

  it("returns null when only estimates remain", () => {
    expect(computeScoreProgress([run(72, 10, "estimate"), run(95, 20, "estimate")])).toBeNull();
  });

  it("keeps the original analysis, whose source is null", () => {
    // null means "original analysis" — measured, not projected.
    expect(computeScoreProgress([run(72, 10, null), run(80, 20)])?.delta).toBe(8);
  });

  it("reports a regression rather than hiding it", () => {
    const p = computeScoreProgress([run(84, 10), run(72, 20)]);
    expect(p?.delta).toBe(-12);
    expect(formatScoreProgress(p!)).toContain("Down 12");
  });

  it("ignores entries with an unusable score or date", () => {
    const p = computeScoreProgress([
      run(72, 10),
      { score: Number.NaN, createdAt: at(12) },
      { score: 80, createdAt: "not-a-date" },
      run(84, 20),
    ]);
    expect(p).toEqual({ delta: 12, firstAt: at(10), runs: 2 });
  });
});

describe("how it reads", () => {
  it("uses words, not a bare signed number", () => {
    // "+12" next to a score ring reads as part of the score.
    const up = formatScoreProgress({ delta: 12, firstAt: at(10), runs: 3 });
    expect(up).toMatch(/^Up 12 since Jun 10$/);
    expect(up).not.toContain("+");
  });

  it("has copy for standing still that is not a zero", () => {
    expect(formatScoreProgress({ delta: 0, firstAt: at(10), runs: 2 })).toContain("Holding steady");
  });

  it("tints a dip amber, never red", () => {
    // A lower score is information, not an error state.
    expect(scoreProgressTone({ delta: -5, firstAt: at(10), runs: 2 })).toContain("amber");
    expect(scoreProgressTone({ delta: 5, firstAt: at(10), runs: 2 })).toContain("green");
  });

  it("avoids the spaced em dash the house style bans", () => {
    for (const delta of [12, 0, -3]) {
      expect(formatScoreProgress({ delta, firstAt: at(10), runs: 2 })).not.toMatch(/\s[—–]\s/);
    }
  });
});

describe("in the sidebar", () => {
  const RESULT = { overallScore: 84 } as never;

  it("shows the arc under the score once there are two measured scans", () => {
    render(<AnalyzeSidebarPinned result={RESULT} history={[run(72, 10), run(84, 20)]} />);
    expect(screen.getByText("Up 12 since Jun 10")).toBeInTheDocument();
  });

  it("shows nothing on a first scan", () => {
    render(<AnalyzeSidebarPinned result={RESULT} history={[run(84, 20)]} />);
    expect(screen.queryByText(/since Jun/)).not.toBeInTheDocument();
  });

  it("renders without a history prop at all", () => {
    // The prop is optional; existing call sites must not break.
    render(<AnalyzeSidebarPinned result={RESULT} />);
    expect(screen.queryByText(/since /)).not.toBeInTheDocument();
  });
});
