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
    expect(screen.getByText(/graded against this posting's requirements, 2:41 pm/i)).toBeInTheDocument();
  });

  it("leads with the percentage", () => {
    render(<TailorScoreboard {...base} found={42} total={43} live />);
    expect(screen.getByText(/98/)).toBeInTheDocument();
  });
});

/**
 * The raw counts render ONLY on the live path, and both halves are load-bearing.
 *
 * Hidden on the fallback because there `found`/`total` are the rater's KEYWORD
 * counts while the queue lists what the rater filed as MISSING -- nothing makes
 * those agree, and the tile once read "21 unmatched" above three rows to fix.
 * Shown when live because a recount scores the same requirement set the queue
 * is built from, and a bare percentage is unfalsifiable: 83% of 6 and 83% of
 * 200 are different situations and nothing else on screen separates them.
 *
 * Pinned in BOTH directions. The obvious later edit is to "simplify" this into
 * always-on or always-off, and each of those reintroduces one of the two bugs.
 */
describe("the ATS tile shows counts only when it recounted", () => {
  const base = { grade: 85, gradedAtLabel: "2:41 PM", stale: false };

  it("hides the counts when the numbers came from the last scan", () => {
    render(<TailorScoreboard {...base} found={22} total={23} />);
    expect(screen.queryByText("22/23")).toBeNull();
    expect(screen.queryByLabelText(/matched/i)).toBeNull();
  });

  it("shows them once a recount has landed", () => {
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.getByText("9/24")).toBeInTheDocument();
  });

  it("calls them requirements, because live can only be the recount", () => {
    // The old `unit` prop existed to disambiguate two sources. Gating on live
    // leaves one, so the word is a constant rather than a caller's choice.
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.getByLabelText("9 of 24 requirements matched")).toBeInTheDocument();
    expect(screen.queryByLabelText(/keywords matched/i)).toBeNull();
  });

  it("never prints an unmatched count, live or not", () => {
    // Deliberately NOT restored with the ratio. Even live it is a worklist
    // claim, and the queue's count is legitimately larger -- it merges
    // rater-only rows -- so the two can still disagree. found/total explains
    // the percentage above it and claims nothing about the work.
    render(<TailorScoreboard {...base} found={9} total={24} live />);
    expect(screen.queryByText(/unmatched/i)).toBeNull();
    render(<TailorScoreboard {...base} found={9} total={24} />);
    expect(screen.queryByText(/unmatched/i)).toBeNull();
  });

  it("shows the percentage on both paths", () => {
    render(<TailorScoreboard {...base} found={9} total={24} />);
    expect(screen.getByText(/38/)).toBeInTheDocument();
  });
});
