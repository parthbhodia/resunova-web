import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorWorkQueue, isLongTitle } from "@/components/tailor/TailorWorkQueue";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import { TailorStrengthsCard, leadSentence } from "@/components/tailor/TailorStrengthsCard";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/**
 * The v7 rail, pinned where the design made a decision that is easy to undo by
 * accident: things REMOVED, and copy that has to keep matching what the code
 * actually does. A redesign that only adds is safe; the removals are the ones a
 * later change quietly puts back.
 */

const LONG_RESPONSIBILITY =
  "Review code developed by other developers and provide feedback to ensure best practices (e.g., style guidelines, checking code in, accuracy, testability, and efficiency).";

const items: QueueItem[] = [
  { id: "r:review", name: LONG_RESPONSIBILITY, kind: "responsibility", status: "queued", detail: "No code review shown." },
  { id: "q:docs", name: "Contribute to documentation", kind: "qualification", status: "queued", detail: "" },
  { id: "c:oop", name: "object-oriented programming", kind: "contextual", status: "queued", detail: "Employer context." },
];

function renderQueue(override: Partial<React.ComponentProps<typeof TailorWorkQueue>> = {}) {
  return render(
    <TailorWorkQueue items={items} onFixAll={vi.fn()} fixAllBusy={false} {...override} />,
  );
}

describe("what v7 removed stays removed", () => {
  it("has no standing red warning banner over the list", () => {
    // It restated what the red stripe on every blocker row and the exclusion
    // note already say. Three copies of one idea competing for one glance is
    // how a warning stops being read.
    renderQueue();
    expect(screen.queryByText(/keep every claim true/i)).toBeNull();
  });

  it("hides the outcome counts until one of them is nonzero", () => {
    // On a fresh scan the row read "0 added · 0 need review · 0 left out",
    // which is three zeroes above a header that already said "3 to review".
    renderQueue();
    expect(screen.queryByText("added")).toBeNull();

    renderQueue({
      items: [{ ...items[0], status: "applied" }, items[1], items[2]],
    });
    expect(screen.getAllByText("added").length).toBeGreaterThan(0);
  });
});

describe("the queue header says what the pass will actually do", () => {
  it("counts what the pass covers, not everything on screen", () => {
    // "Improve all 3" was false: a bulk pass skips contextual rows by design.
    // "blockers" was false too once rows band by their own type — the pass
    // covers the blocker and keyword bands both.
    renderQueue();
    expect(screen.getByRole("button", { name: /improve 2 gaps/i })).toBeInTheDocument();
  });

  it("uses the singular for one gap", () => {
    renderQueue({ items: [items[0], items[2]] });
    expect(screen.getByRole("button", { name: /improve 1 gap$/i })).toBeInTheDocument();
  });

  it("names what a pass leaves out instead of letting the count not add up", () => {
    renderQueue();
    expect(screen.getByText(/1 employer-context item below isn't included/i)).toBeInTheDocument();
  });

  it("says nothing about exclusions when there are none", () => {
    renderQueue({ items: [items[0], items[1]] });
    expect(screen.queryByText(/isn't included/i)).toBeNull();
  });
});

describe("a long requirement stays one row", () => {
  it("keeps the full text reachable on hover", () => {
    // Truncation that loses the words is not truncation, it is deletion.
    renderQueue();
    expect(screen.getByTitle(LONG_RESPONSIBILITY)).toBeInTheDocument();
  });

  it("offers More on a clipped title and the reason on an intact one", () => {
    renderQueue();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /why this matters/i })).toBeInTheDocument();
  });

  it("gives back the clipped words when More is pressed", () => {
    renderQueue();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    // Once as the clipped title, once in full underneath.
    expect(screen.getAllByText(LONG_RESPONSIBILITY).length).toBeGreaterThan(1);
  });

  it("draws the threshold where a rail-width title stops fitting", () => {
    expect(isLongTitle("object-oriented programming")).toBe(false);
    expect(isLongTitle(LONG_RESPONSIBILITY)).toBe(true);
  });
});

describe("a contextual row is marked, not left blank", () => {
  it("carries a context mark rather than a checkbox it cannot use", () => {
    renderQueue();
    expect(screen.getByLabelText("context")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /object-oriented/i })).toBeNull();
  });
});

describe("the score tiles", () => {
  const base = { grade: 75, gradedAtLabel: "2:41 PM", stale: false };

  it("still discloses where the number came from, which the mockup omits", () => {
    // The tile shipped once claiming "live" while nothing recounted. The
    // redesign is a visual language, not permission to stop saying this.
    render(<TailorScoreboard {...base} found={22} total={23} />);
    expect(screen.getByText(/counted from your last scan/i)).toBeInTheDocument();
    render(<TailorScoreboard {...base} found={22} total={23} live />);
    expect(screen.getByText(/recounted as you edit/i)).toBeInTheDocument();
  });

  it("puts a target on the grade we produce and never on the ATS meter", () => {
    // A "shortlist threshold" on the ATS number would be folklore we cannot
    // source. The grade is our own judgement, so a bar on it is ours to set.
    const { container } = render(<TailorScoreboard {...base} found={22} total={23} />);
    const markers = container.querySelectorAll('[style*="opacity: 0.35"]');
    expect(markers).toHaveLength(1);
  });

  it("shows a dash rather than a zero when there is nothing to score", () => {
    render(<TailorScoreboard grade={null} gradedAtLabel={null} stale={false} found={0} total={0} />);
    expect(screen.getAllByText("—").length).toBe(2);
  });
});

describe("the strengths card", () => {
  it("drops the verdict's advice sentence, which the queue already owns", () => {
    // In the field report that sentence named the two blocker rows verbatim.
    const verdict =
      "Your resume demonstrates strong alignment with the minimum qualifications of a Software Engineer. To further strengthen your application, consider highlighting code reviews and documentation contributions.";
    render(<TailorStrengthsCard verdict={verdict} strengths={["Full-stack range"]} fitFactors={[]} />);
    expect(screen.getByText(/strong alignment with the minimum qualifications/i)).toBeInTheDocument();
    expect(screen.queryByText(/to further strengthen/i)).toBeNull();
  });

  it("counts what it is claiming", () => {
    render(<TailorStrengthsCard verdict="" strengths={["a", "b"]} fitFactors={[]} />);
    expect(screen.getByText(/2 things already working in your favor/i)).toBeInTheDocument();
  });

  it("keeps a one-sentence verdict whole", () => {
    expect(leadSentence("You are a strong match for this posting overall.")).toBe(
      "You are a strong match for this posting overall.",
    );
  });

  it("does not cut at an abbreviation", () => {
    // "Inc." would otherwise reduce the line to two words.
    const v = "You worked at Acme Inc. and shipped three production systems there.";
    expect(leadSentence(v)).toBe(v);
  });

  it("survives an empty or missing verdict", () => {
    expect(leadSentence(undefined)).toBe("");
    expect(leadSentence("   ")).toBe("");
  });
});
