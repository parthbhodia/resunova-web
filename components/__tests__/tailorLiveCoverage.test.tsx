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

  it("shows the raw counts so the percentage stays checkable", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live />);
    expect(screen.getByText(/42 of 43 keywords/i)).toBeInTheDocument();
    expect(screen.getByText(/98%/)).toBeInTheDocument();
  });
});
