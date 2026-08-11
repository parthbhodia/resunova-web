/**
 * Where a score stands.
 *
 * These pin the honesty rules, not the arithmetic: that the claim names whose
 * résumés it is comparing against, that a bad standing is printed rather than
 * hidden, that a half-parsed payload renders nothing, and that the sidebar
 * never stacks this on top of the progress line.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  fetchScoreStanding,
  formatScoreStanding,
  scoreStandingDetail,
  standingFrom,
  type ScoreStanding,
} from "@/lib/scoreStanding";
import ScoreStandingLine from "@/components/analyze/ScoreStandingLine";
import { AnalyzeSidebarPinned } from "@/components/analyze/AnalyzeSidebar";
import { invalidateCache } from "@/lib/clientCache";
import type { ScoreProgressEntry } from "@/components/analyze/scoreProgress";

const apiResponse = vi.fn();
const requested: string[] = [];

vi.mock("@/lib/apiClient", () => ({
  apiFetch: (path: string) => {
    requested.push(path);
    const r = apiResponse();
    return Promise.resolve({
      ok: r.ok !== false,
      status: r.status ?? 200,
      json: () => Promise.resolve(r.body),
    });
  },
}));

const standing = (over: Partial<ScoreStanding> = {}): ScoreStanding =>
  ({ percentile: 68, sampleSize: 214, median: 71, ...over });

beforeEach(() => {
  invalidateCache();
  apiResponse.mockReset();
  requested.length = 0;
});

describe("parsing what the API sent", () => {
  it("reads a complete standing", () => {
    expect(standingFrom({ percentile: 68, sampleSize: 214, median: 71.4 }))
      .toEqual({ percentile: 68, sampleSize: 214, median: 71.4 });
  });

  it.each([
    ["null", null],
    ["not an object", "68%"],
    ["a missing percentile", { sampleSize: 214, median: 71 }],
    ["a missing sample size", { percentile: 68, median: 71 }],
    ["a missing median", { percentile: 68, sampleSize: 214 }],
    ["a stringified number", { percentile: "68", sampleSize: 214, median: 71 }],
    ["NaN", { percentile: Number.NaN, sampleSize: 214, median: 71 }],
    ["an empty population", { percentile: 68, sampleSize: 0, median: 71 }],
  ])("refuses %s", (_label, raw) => {
    // A partially-parsed standing would print a confident sentence around a
    // missing number, which is worse than printing nothing at all.
    expect(standingFrom(raw)).toBeNull();
  });
});

describe("how the claim is worded", () => {
  it("says whose résumés it is comparing against", () => {
    // "Top 20% of résumés" would imply a universal benchmark. This is a
    // self-selected sample of people who came to a résumé scoring tool, and the
    // copy has to say so.
    expect(formatScoreStanding(standing())).toContain("of résumés we've scored");
  });

  it("leads with the percentile at or above the median", () => {
    expect(formatScoreStanding(standing({ percentile: 68 }))).toBe(
      "Stronger than 68% of résumés we've scored",
    );
  });

  it("prints a low standing rather than hiding it", () => {
    // Suppressing unflattering percentiles while showing flattering ones turns
    // a measurement into a compliment.
    const line = formatScoreStanding(standing({ percentile: 12, median: 71 }));
    expect(line).toContain("Stronger than 12%");
  });

  it("names the median only when the score is below it", () => {
    // Below the median the median IS the actionable half: it turns a verdict
    // into a target. Above it, it is noise next to the percentile.
    expect(formatScoreStanding(standing({ percentile: 12, median: 71 }))).toContain("median is 71");
    expect(formatScoreStanding(standing({ percentile: 68, median: 71 }))).not.toContain("median");
  });

  it("discloses the sample size and the first-scan rule on hover", () => {
    // The population rule is the non-obvious part: comparing against each
    // person's FIRST scan is what keeps the bar from drifting up with
    // engagement. A reader deciding whether to believe the number needs it.
    const detail = scoreStandingDetail(standing());
    expect(detail).toContain("214");
    expect(detail).toContain("first scan");
  });

  it("avoids the spaced em dash the house style bans", () => {
    for (const percentile of [12, 50, 99]) {
      expect(formatScoreStanding(standing({ percentile }))).not.toMatch(/\s[—–]\s/);
    }
  });
});

describe("fetching it", () => {
  it("asks for the score it was given", async () => {
    apiResponse.mockReturnValue({ body: { standing: standing() } });
    await fetchScoreStanding(84.4);
    expect(requested[0]).toBe("/api/score-standing?score=84");
  });

  it("treats a null standing as an answer, not a failure", async () => {
    // The API returns {standing: null} when it does not hold enough scores to
    // say anything worth printing. That is a 200 and must not throw.
    apiResponse.mockReturnValue({ body: { standing: null } });
    await expect(fetchScoreStanding(84)).resolves.toBeNull();
  });

  it("raises on a failed request instead of inventing a standing", async () => {
    apiResponse.mockReturnValue({ ok: false, status: 500, body: {} });
    await expect(fetchScoreStanding(84)).rejects.toThrow();
  });
});

describe("the line itself", () => {
  it("renders the standing once it arrives", async () => {
    apiResponse.mockReturnValue({ body: { standing: standing({ percentile: 68 }) } });
    render(<ScoreStandingLine score={84} />);
    await waitFor(() => expect(screen.getByText(/Stronger than 68%/)).toBeInTheDocument());
  });

  it("renders nothing when there is nothing to say", async () => {
    apiResponse.mockReturnValue({ body: { standing: null } });
    const { container } = render(<ScoreStandingLine score={84} />);
    await waitFor(() => expect(apiResponse).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the request fails", async () => {
    // An outage must not leave a broken fragment under the ring.
    apiResponse.mockReturnValue({ ok: false, status: 503, body: {} });
    const { container } = render(<ScoreStandingLine score={84} />);
    await waitFor(() => expect(apiResponse).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("is not tinted green or red", async () => {
    // Colouring a percentile restates it as a verdict about the person. The
    // ring above is already the judgement; this is the reference class.
    apiResponse.mockReturnValue({ body: { standing: standing({ percentile: 12 }) } });
    render(<ScoreStandingLine score={40} />);
    const line = await screen.findByText(/Stronger than 12%/);
    expect(line.getAttribute("style")).toContain("var(--muted)");
    expect(line.getAttribute("style")).not.toMatch(/green|red|amber/);
  });
});

describe("which line the sidebar carries", () => {
  const RESULT = { overallScore: 84 } as never;
  const at = (day: number) => `2026-06-${String(day).padStart(2, "0")}T12:00:00.000Z`;
  const run = (score: number, day: number): ScoreProgressEntry => ({ score, createdAt: at(day) });

  it("shows the percentile on a first scan", async () => {
    // No arc to draw yet, and this is the visit where a bare number means
    // least: the cohort that scans once and never comes back.
    apiResponse.mockReturnValue({ body: { standing: standing() } });
    render(<AnalyzeSidebarPinned result={RESULT} history={[run(84, 20)]} />);
    await waitFor(() => expect(screen.getByText(/Stronger than 68%/)).toBeInTheDocument());
  });

  it("prefers the arc once there are two measured scans, and never stacks both", async () => {
    // Someone's own progress beats a comparison against strangers, and two
    // quiet lines under one ring is a stack nobody reads.
    apiResponse.mockReturnValue({ body: { standing: standing() } });
    render(<AnalyzeSidebarPinned result={RESULT} history={[run(72, 10), run(84, 20)]} />);
    expect(screen.getByText("Up 12 since Jun 10")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Stronger than/)).not.toBeInTheDocument());
    expect(apiResponse).not.toHaveBeenCalled();
  });
});
