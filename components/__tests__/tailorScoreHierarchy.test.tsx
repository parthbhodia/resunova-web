import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorQueuePanel } from "@/components/tailor/TailorQueuePanel";

/**
 * The approved hierarchy: match primary, grade secondary, and the score is the
 * entry point into the queue.
 *
 * Aimed at the DECISIONS, not the pixels. The rail shipped as two equal tiles
 * with the gap count floating above them, and every part of this change is the
 * kind a later edit undoes by accident — by "balancing" the two numbers again,
 * by deleting the demoted one's meter because it looks redundant, or by
 * pulling the count back out into its own banner. Each of those has a test.
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
    expect(screen.getByText(/graded by ai at 2:41 pm/i)).toBeInTheDocument();
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

  it("keeps each number's provenance in its own card", () => {
    render(<TailorScoreboard {...base} live />);
    expect(document.querySelector('[data-score="match"]')?.textContent).toMatch(
      /recounted as you edit/i,
    );
    expect(document.querySelector('[data-score="grade"]')?.textContent).toMatch(/graded by ai/i);
  });
});

describe("the score is the way into the queue", () => {
  it("carries the blocker count and the ordering under the number", () => {
    // A count on its own is pressure; a count plus an ordering is a plan.
    render(<TailorScoreboard {...base} blockersOpen={7} otherOpen={13} onEnterQueue={vi.fn()} />);
    expect(screen.getByText("7 gaps could get you filtered out")).toBeInTheDocument();
    expect(screen.getByText(/the other 13 can wait/i)).toBeInTheDocument();
  });

  it("uses the singular for one blocker", () => {
    render(<TailorScoreboard {...base} blockersOpen={1} otherOpen={0} onEnterQueue={vi.fn()} />);
    expect(screen.getByText("1 gap could get you filtered out")).toBeInTheDocument();
  });

  it("drops the filtered-out claim when nothing is a hard requirement", () => {
    // "Could get you filtered out" is a claim about hard requirements. Reusing
    // it for the rest would tint everything red, which is what the bands exist
    // to avoid.
    render(<TailorScoreboard {...base} blockersOpen={0} otherOpen={13} onEnterQueue={vi.fn()} />);
    expect(screen.getByText("13 gaps left to review")).toBeInTheDocument();
    expect(screen.queryByText(/filtered out/i)).toBeNull();
  });

  it("says nothing when there is no open work", () => {
    // A finished queue has its own finish state; a second one here would be an
    // empty row where the user expects a summary.
    render(<TailorScoreboard {...base} blockersOpen={0} otherOpen={0} onEnterQueue={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /review/i })).toBeNull();
    expect(screen.queryByText(/left to review/i)).toBeNull();
  });

  it("takes the user to the queue when pressed", () => {
    const onEnterQueue = vi.fn();
    render(<TailorScoreboard {...base} blockersOpen={7} otherOpen={13} onEnterQueue={onEnterQueue} />);
    fireEvent.click(screen.getByRole("button", { name: /could get you filtered out/i }));
    expect(onEnterQueue).toHaveBeenCalledTimes(1);
  });

  it("names the action in the button, not only the count", () => {
    // A control whose accessible name is a number tells a screen-reader user
    // what is wrong and not what to do about it.
    render(<TailorScoreboard {...base} blockersOpen={7} otherOpen={13} onEnterQueue={vi.fn()} />);
    expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
  });

  it("still shows the count when there is nowhere to send the user", () => {
    // The design harness and any read-only mount pass no handler. The count is
    // information either way; only the affordance depends on the callback.
    render(<TailorScoreboard {...base} blockersOpen={7} otherOpen={13} />);
    expect(screen.getByText("7 gaps could get you filtered out")).toBeInTheDocument();
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

function renderPanel() {
  return render(
    <TailorQueuePanel
      ratings={ratings as never}
      addressedGaps={new Set()}
      fixAllBusy={false}
      onFixAll={vi.fn()}
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

describe("the panel wires the score to the queue", () => {
  it("counts the blockers and names what can wait", () => {
    renderPanel();
    expect(screen.getByText("2 gaps could get you filtered out")).toBeInTheDocument();
    expect(screen.getByText(/the other 3 can wait/i)).toBeInTheDocument();
  });

  it("states the count once, not once as a banner and once as an entry row", () => {
    // The free-standing banner is GONE. Restoring it alongside the entry row
    // prints the same sentence twice, which is the restatement the queue's own
    // design notes keep warning about.
    renderPanel();
    expect(screen.getAllByText(/gaps could get you filtered out/)).toHaveLength(1);
    // The band header below is a different string and stays: it labels a
    // group, it does not repeat the count.
    expect(screen.getByText("Could get you filtered out")).toBeInTheDocument();
  });

  it("scrolls the queue into view when the entry row is pressed", () => {
    const scrollIntoView = vi.fn();
    // jsdom does not implement it; the panel calls it optionally so a missing
    // implementation is a no-op rather than a thrown click.
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /could get you filtered out/i }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
