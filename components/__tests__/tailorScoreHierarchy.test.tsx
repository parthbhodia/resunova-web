import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";

/**
 * The approved hierarchy: match primary, grade secondary, one orientation block
 * — and the failure count lives with the work, not with the numbers.
 *
 * Aimed at the DECISIONS, not the pixels. The rail shipped as two equal tiles
 * with the gap count floating above them, then as two tiles with the count
 * folded into the first, and every part of this is the kind a later edit undoes
 * by accident — by "balancing" the two numbers again, by deleting the demoted
 * one's meter because it looks redundant, or by pulling the count back up into
 * the block that is supposed to orient rather than alarm. Each of those has a
 * test.
 */

const base = { grade: 75, gradedAtLabel: "2:41 PM", stale: false, found: 9, total: 24 };

/** The figure span: its direct text is the number, the unit is a child. */
function figure(value: string): HTMLElement {
  return screen.getByText(value);
}

describe("the match leads and the grade follows", () => {
  it("sets the match figure larger than the grade figure", () => {
    // The hierarchy has to be in the render, not only in the comment. Equal
    // billing is what invited the user to work on whichever number they liked,
    // and only one of the two answers to the queue below.
    render(<TailorScoreboard {...base} />);
    const match = Number.parseFloat(figure("38").style.fontSize);
    const grade = Number.parseFloat(figure("75").style.fontSize);
    expect(match).toBeGreaterThan(grade);
  });

  it("demotes the grade without deleting anything it said", () => {
    // Secondary means quieter, not less honest. The obvious "cleanup" is to
    // reduce this to a bare number once it stops being a hero tile.
    render(<TailorScoreboard {...base} onRecheck={vi.fn()} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
    expect(screen.getByText(/graded against this posting's requirements, 2:41 pm/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /re-check/i })).toBeInTheDocument();
  });

  it("keeps the stale note with the number it is about", () => {
    render(<TailorScoreboard {...base} stale />);
    const grade = document.querySelector('[data-score="grade"]');
    expect(grade?.textContent).toMatch(/résumé changed since grading/i);
  });

  it("puts the one target marker inside the grade card and not the match card", () => {
    // Stronger than counting markers: a marker moved onto the ATS meter would
    // keep the count at one while stating as fact a shortlist threshold nobody
    // here can source.
    const { container } = render(<TailorScoreboard {...base} />);
    expect(container.querySelectorAll('[style*="opacity: 0.35"]')).toHaveLength(1);
    expect(container.querySelector('[data-score="grade"] [style*="opacity: 0.35"]')).not.toBeNull();
    expect(container.querySelector('[data-score="match"] [style*="opacity: 0.35"]')).toBeNull();
  });

  it("keeps each number's provenance with the number it is about", () => {
    render(<TailorScoreboard {...base} live />);
    expect(document.querySelector('[data-score="match"]')?.textContent).toMatch(
      /recounted as you edit/i,
    );
    expect(document.querySelector('[data-score="grade"]')?.textContent).toMatch(/graded against this posting/i);
  });

  it("reads as one orientation block, not two cards to pick between", () => {
    // The demotion was being fought by the frame around it: a second border
    // says "here is another thing to decide about". The obvious undo is to
    // give the grade its own card back for symmetry.
    const { container } = render(<TailorScoreboard {...base} />);
    const match = container.querySelector('[data-score="match"]') as HTMLElement;
    const grade = container.querySelector('[data-score="grade"]') as HTMLElement;
    expect(match.parentElement).toBe(grade.parentElement);
    expect(match.style.border).toBe("");
    expect(grade.style.border).toBe("");
  });
});

describe("the orientation block does not carry the failure count", () => {
  // The peak was buried under it. Someone arrives having just got a tailored
  // résumé, and the first strong thing on the page was a red count of what is
  // wrong — inside the block whose job is "where do I stand". The count belongs
  // at the top of the work; see the queue header tests below.
  it("says nothing about blockers or gaps left", () => {
    const text = render(<TailorScoreboard {...base} />).container.textContent ?? "";
    expect(text).not.toMatch(/filtered out/i);
    expect(text).not.toMatch(/blocker/i);
    expect(text).not.toMatch(/left to review/i);
  });

  it("offers no second way into a queue that is already the next thing on screen", () => {
    render(<TailorScoreboard {...base} />);
    expect(screen.queryByRole("button", { name: /review/i })).toBeNull();
  });
});

/**
 * The seam, driven through the REAL panel.
 *
 * The unit tests above prove the scoreboard renders an entry row given counts.
 * These prove the panel computes those counts and wires the row to the queue —
 * which is the half the user experiences, and the half this repo keeps finding
 * bugs in.
 */
const ratings = {
  overall_score: 38,
  match_score: 38,
  job_title: { matched: false, jd_title: "Data Engineer", resume_title: "Analyst", score: 40 },
  qualifications: {
    score: 40,
    missing: [
      { text: "Kubernetes in production", analysis: "No container work shown." },
      { text: "5 years of Python", analysis: "Tenure not evidenced." },
    ],
    covered: [],
  },
  responsibilities: { score: 35, missing: [], covered: [] },
  keywords: {
    found_count: 9,
    total_count: 24,
    direct_skills: { found: [], missing: ["Terraform", "Snowflake", "dbt"] },
    contextual: { found: [], missing: [] },
  },
  whats_working: [],
  gaps: [],
  verdict: "",
};

function renderPanel(onFixSelected?: (items: readonly { name: string }[]) => void) {
  return render(
    <TailorQueuePanel
      ratings={ratings as never}
      addressedGaps={new Set()}
      fixAllBusy={false}
      onFixAll={vi.fn()}
      onFixSelected={onFixSelected as never}
      fetchFixSuggestions={vi.fn().mockResolvedValue([])}
      applyFixSuggestion={vi.fn().mockResolvedValue(undefined)}
      ignoredNames={new Set()}
      onToggleIgnored={vi.fn()}
      stale={false}
      onRecheck={vi.fn()}
      recheckBusy={false}
    />,
  );
}

describe("the queue heads itself with the ranking", () => {
  it("tells the user where to start and what can wait", () => {
    // A count on its own is pressure; a count plus an ordering is a plan.
    renderPanel();
    expect(screen.getByText("Start with the blockers")).toBeInTheDocument();
    expect(screen.getByText(/2 hard requirements this posting screens on\./i)).toBeInTheDocument();
    expect(screen.getByText(/the other 3 can wait/i)).toBeInTheDocument();
  });

  it("makes no claim about the candidate that the rows themselves refuse to make", () => {
    // The header used to read "...that your résumé does not evidence yet",
    // asserting for a whole band what a keyword scanner cannot establish for
    // one row. A header cannot say what the rows under it are declining to say.
    renderPanel();
    const header = screen.getByText(/hard requirements this posting screens on/i)
      .closest("div")?.textContent ?? "";
    expect(header).not.toMatch(/does not evidence|you lack|not evidenced/i);
  });

  it("gives an instruction above a strip that gives a label, never the same sentence twice", () => {
    // This is the constraint that has survived all three homes for this count:
    // a header repeating the band strip directly beneath it printed one idea
    // twice in a row. An instruction and a label are different jobs.
    renderPanel();
    expect(screen.getAllByText(/could get you filtered out/i)).toHaveLength(1);
    expect(screen.getByText("Could get you filtered out")).toBeInTheDocument();
  });

  it("aims the primary control at the blockers, not at all nineteen rows", () => {
    // The screen opens with every row at the same weight, so the first thing
    // asked of someone who just arrived is to triage. Nothing is hidden to fix
    // that — the control is aimed instead.
    renderPanel();
    expect(screen.getByRole("button", { name: "Fix 2 blockers" })).toBeInTheDocument();
  });

  it("attempts exactly the set it counted", () => {
    // The button names a count, so it has to hand over that set. This repo has
    // shipped the other version: "Improve 19 blockers" attempted three, because
    // the label and the target were computed from different lists. Aiming the
    // control at the blockers without aiming the label with it is the same bug
    // pointing the other way — a promise of two that quietly runs five.
    const onFixSelected = vi.fn();
    renderPanel(onFixSelected);
    fireEvent.click(screen.getByRole("button", { name: "Fix 2 blockers" }));
    expect(onFixSelected).toHaveBeenCalledTimes(1);
    expect(onFixSelected.mock.calls[0][0].map((i: { name: string }) => i.name)).toEqual([
      "Kubernetes in production",
      "5 years of Python",
    ]);
  });

  it("keeps the rest of the work on screen while it is not the primary path", () => {
    // The tempting version of "one decision at a time" is to collapse the
    // keyword band. Hiding work is the bug this queue exists to end.
    renderPanel();
    for (const name of ["Terraform", "Snowflake", "dbt"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
