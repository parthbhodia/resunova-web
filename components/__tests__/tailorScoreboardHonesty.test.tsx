import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";

/**
 * The scoreboard used to label the keyword count "ATS match · live" and promise
 * it was "Recounted the moment you add a change. Free."
 *
 * Neither was true. `found`/`total` come from `ratings.keywords` on the last
 * scan, and `applyGapFixes` explicitly does not rescore — it sets `scoreStale`
 * and optimistically moves the item to covered. So a user could apply several
 * fixes, watch every row turn green, and the percentage would not move, under a
 * label that said live.
 *
 * These tests pin the corrected wording. They should start failing the moment
 * /api/tailor/score-preview lands and the number genuinely does update per
 * apply — at which point the copy changes with it, deliberately, rather than
 * drifting back by accident.
 */
describe("TailorScoreboard honesty", () => {
  const base = {
    found: 41,
    total: 43,
    grade: 85,
    gradedAtLabel: "2:41 PM",
  };

  it("does not claim the coverage number is live", () => {
    render(<TailorScoreboard {...base} stale={false} />);
    expect(screen.queryByText(/·\s*live/i)).toBeNull();
    expect(screen.queryByText(/recounted the moment/i)).toBeNull();
  });

  it("says where the number came from when nothing has changed", () => {
    render(<TailorScoreboard {...base} stale={false} />);
    expect(screen.getByText(/counted from your last scan/i)).toBeInTheDocument();
  });

  it("says the score is not rechecked once fixes are applied", () => {
    render(<TailorScoreboard {...base} stale />);
    expect(screen.getByText(/not rechecked yet/i)).toBeInTheDocument();
  });

  it("never promises the recount is free, because there is no recount", () => {
    const { container } = render(<TailorScoreboard {...base} stale={false} />);
    // "Free" here would imply an instant zero-cost update the code does not do.
    // The Re-check button correctly says it costs a scan; that stays.
    const coverageTile = container.firstElementChild?.firstElementChild;
    expect(coverageTile?.textContent ?? "").not.toMatch(/\bfree\b/i);
  });

  it("keeps the quality grade separate and dated", () => {
    render(<TailorScoreboard {...base} stale={false} />);
    // The two numbers must never read as one blended score.
    expect(screen.getByText(/quality grade/i)).toBeInTheDocument();
    expect(screen.getByText(/graded by ai at 2:41 pm/i)).toBeInTheDocument();
  });

  it("still shows the raw counts so the percentage is checkable", () => {
    render(<TailorScoreboard {...base} stale={false} />);
    expect(screen.getByText(/41 of 43 keywords/i)).toBeInTheDocument();
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });
});
