import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorFixExpansion, type FixExpansionState, type FixSuggestion } from "@/components/tailor/TailorFixExpansion";
import { TailorScoreboard } from "@/components/tailor/TailorScoreboard";
import type { QueueItem } from "@/lib/tailorWorkQueue";

const item: QueueItem = {
  id: "qualification:reviews",
  name: "Lead design reviews",
  kind: "qualification",
  status: "queued",
  detail: "",
};

const suggestion: FixSuggestion = {
  id: "gf1",
  section: "Work Experience",
  employer: "Ecclon LLC",
  original: "Led weekly design reviews and documented the approach we picked",
  suggested: "Led weekly design reviews, evaluating API trade-offs, and documented the approach we picked",
  reason: "Adds the review context the posting asks for.",
  priority: "high",
};

const ready: FixExpansionState = { phase: "ready", suggestions: [suggestion] };

function renderExpansion(props: Partial<React.ComponentProps<typeof TailorFixExpansion>> = {}) {
  return render(
    <TailorFixExpansion
      item={item}
      state={ready}
      onApply={vi.fn()}
      onIgnore={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe("the confirm step", () => {
  it("asks the user to agree with a sentence built from their own bullet", () => {
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.getByText(/check this is true/i)).toBeInTheDocument();
    expect(screen.getByText(/at ecclon llc, you led weekly design reviews/i)).toBeInTheDocument();
  });

  it("says where the sentence came from", () => {
    // The claim "nothing here was invented" is only safe because the sentence
    // is the résumé bullet in a frame. If that ever stops being true this copy
    // has to go with it.
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.getByText(/read from your resume/i)).toBeInTheDocument();
  });

  it("costs zero typing on the default path", () => {
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /yes, that's right/i }));
    expect(screen.getByRole("button", { name: /add to resume/i })).toBeInTheDocument();
  });

  it("does not spend a call when the user simply agrees", () => {
    // Agreeing with a sentence read out of the résumé tells the model nothing
    // it did not already have.
    const onRewriteWithFacts = vi.fn();
    renderExpansion({ onRewriteWithFacts });
    fireEvent.click(screen.getByRole("button", { name: /yes, that's right/i }));
    expect(onRewriteWithFacts).not.toHaveBeenCalled();
  });

  it("reveals the fields only when the user says it is wrong", () => {
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    expect(screen.getByLabelText(/where did you do this/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what did you do/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what changed/i)).toBeInTheDocument();
  });

  it("marks only the claim field required", () => {
    // Where and outcome are nice to have. Without `what` there is nothing to
    // vouch for, so that one is the only hard requirement.
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    expect(screen.getByLabelText(/what did you do/i)).toBeRequired();
    expect(screen.getByLabelText(/where did you do this/i)).not.toBeRequired();
    expect(screen.getByLabelText(/what changed/i)).not.toBeRequired();
  });

  it("sends the correction back so the rewrite can be grounded in it", () => {
    const onRewriteWithFacts = vi.fn();
    renderExpansion({ onRewriteWithFacts });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    fireEvent.change(screen.getByLabelText(/what changed/i), {
      target: { value: "shipped two weeks earlier" },
    });
    fireEvent.click(screen.getByRole("button", { name: /use this and rewrite/i }));
    expect(onRewriteWithFacts).toHaveBeenCalledWith(
      expect.objectContaining({ where: "Ecclon LLC", outcome: "shipped two weeks earlier" }),
    );
  });

  it("is absent entirely when the caller cannot use the facts", () => {
    // No handler ⇒ no confirm step, and the flow is byte-identical to before.
    renderExpansion();
    expect(screen.queryByText(/check this is true/i)).toBeNull();
    expect(screen.getByRole("button", { name: /add to resume/i })).toBeInTheDocument();
  });

  it("is skipped when there is no résumé bullet to quote", () => {
    renderExpansion({
      onRewriteWithFacts: vi.fn(),
      state: { phase: "ready", suggestions: [{ ...suggestion, original: "" }] },
    });
    expect(screen.queryByText(/check this is true/i)).toBeNull();
  });
});

describe("the ATS meter", () => {
  const base = { grade: 85, gradedAtLabel: "2:41 PM", stale: false };

  // "shows what is still open" and the assistive-tech count test lived here and
  // are gone with the counts themselves (user-directed 2026-08-07). The claim
  // they defended -- that the tile names the part you can act on -- turned out
  // to be the problem: the number it named disagreed with the queue that
  // actually lists the work. `tailorLiveCoverage.test.tsx` now pins the
  // absence. What survives here is everything about the METER, which is
  // unchanged.

  it("says nothing about unmatched requirements", () => {
    render(<TailorScoreboard {...base} found={40} total={43} />);
    expect(screen.queryByText(/unmatched/i)).toBeNull();
  });

  it("draws no threshold line", () => {
    // Every "shortlist threshold" number available to us is a competitor's
    // published guidance or folklore, not something measured on this corpus.
    // Drawing one would state as fact something nobody here can source.
    const { container } = render(<TailorScoreboard {...base} found={40} total={43} />);
    expect(container.textContent).not.toMatch(/target|threshold|shortlist/i);
  });

  it("renders no meter when there is nothing to measure", () => {
    render(<TailorScoreboard {...base} found={0} total={0} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
