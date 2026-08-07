import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";

/**
 * The tile shipped saying "ATS match · live" and "Recounted the moment you add
 * a change. Free." while nothing recounted: found/total came off the last scan,
 * and applying a fix only set scoreStale. A user could apply several fixes,
 * watch every row turn green, and the percentage would not move.
 *
 * Now /api/tailor/score-preview does the recount and `live` says whether it
 * actually happened. These tests pin the label to the behaviour in BOTH
 * directions, because the failure that shipped was a label promising more than
 * the code did, and the cheap way to "fix" that is to promise it again.
 */
describe("the scoreboard label tracks whether a recount happened", () => {
  const base = { grade: 85, gradedAtLabel: "2:41 PM", stale: false };

  it("does not claim live when the counts came from the last scan", () => {
    render(<TailorScoreboard {...base} found={41} total={43} />);
    expect(screen.queryByText(/·\s*live/i)).toBeNull();
    expect(screen.getByText(/counted from your last scan/i)).toBeInTheDocument();
  });

  it("claims live only once a recount has landed", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live />);
    expect(screen.getByText(/ats match · live/i)).toBeInTheDocument();
    expect(screen.getByText(/recounted as you edit/i)).toBeInTheDocument();
  });

  it("says fixes are not recounted yet when stale and not live", () => {
    render(<TailorScoreboard {...base} found={41} total={43} stale />);
    expect(screen.getByText(/not recounted yet/i)).toBeInTheDocument();
  });

  it("reports requirements the edits dropped instead of hiding them", () => {
    // A rewrite can remove a term some other requirement was relying on.
    // Reporting only gains is how an honest number turns dishonest again.
    render(<TailorScoreboard {...base} found={40} total={43} live lost={2} />);
    expect(screen.getByText(/2 requirements no longer covered/i)).toBeInTheDocument();
  });

  it("uses the singular for a single lost requirement", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live lost={1} />);
    expect(screen.getByText(/1 requirement no longer covered/i)).toBeInTheDocument();
  });

  it("keeps the two numbers separate and dated", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live />);
    expect(screen.getByText(/quality grade/i)).toBeInTheDocument();
    expect(screen.getByText(/graded by ai at 2:41 pm/i)).toBeInTheDocument();
  });

  it("shows the percentage, and only the percentage", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live />);
    expect(screen.getByText(/98/)).toBeInTheDocument();
  });
});

/**
 * The raw counts are GONE from this tile (user-directed 2026-08-07: "it is not
 * holding any value"), and this block pins their absence.
 *
 * Why a removal gets its own tests: the counts were not merely noise, they
 * DISAGREED with the queue beneath them. The fallback counts the rater's
 * keywords; the queue lists what the rater filed as missing. Nothing makes
 * those agree, so the tile could read "21 unmatched" above three rows to fix.
 * The old `unit` prop existed to label WHICH dataset a count came from — a fix
 * for the symptom. Deleting the count removes the disagreement itself, and the
 * obvious "improvement" a later edit makes is to put a helpful count back.
 */
describe("the ATS tile carries no raw counts", () => {
  const base = { grade: 85, gradedAtLabel: "2:41 PM", stale: false };

  it("does not print an unmatched count", () => {
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.queryByText(/unmatched/i)).toBeNull();
    expect(screen.queryByText(/15/)).toBeNull();
  });

  it("does not print found-of-total, on screen or to assistive tech", () => {
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.queryByText("9/24")).toBeNull();
    expect(screen.queryByLabelText(/9 of 24/i)).toBeNull();
    expect(screen.queryByLabelText(/matched/i)).toBeNull();
  });

  it("still shows the percentage the meter is drawn from", () => {
    // The figure survives; it is a direction, not a worklist. Removing it too
    // would leave the rail with no deterministic signal at all.
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.getByText(/38/)).toBeInTheDocument();
  });
});
