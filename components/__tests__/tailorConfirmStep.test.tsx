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

/**
 * REVERSED 2026-08-14, founder-directed ("why do we ask if this is true? if
 * it is mentioned in the resume it is obv true"): the confirm GATE is gone.
 * It quoted the user's own résumé back at them and asked them to vouch for
 * it, and its Yes button did nothing but dismiss itself — the suggestions
 * were already generated behind it. What survives, as optional affordances
 * on the result: provenance (the bullet is shown and labelled as read from
 * the résumé) and the correct-it path (extraction can misread a document,
 * and a corrected fact re-grounds the rewrite).
 */
describe("the confirm step", () => {
  it("never asks the user to vouch for their own résumé", () => {
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.queryByText(/check this is true/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /yes, that's right/i })).toBeNull();
    // The result is simply THERE — no checkpoint in front of it.
    expect(screen.getByRole("button", { name: /add to résumé/i })).toBeInTheDocument();
  });

  it("says where the rewrite's source came from", () => {
    // The claim "nothing here was invented" is only safe because the shown
    // bullet is read out of the résumé. If that ever stops being true this
    // copy has to go with it.
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.getByText(/read from your résumé/i)).toBeInTheDocument();
  });

  it("costs zero typing and zero extra clicks on the default path", () => {
    renderExpansion({ onRewriteWithFacts: vi.fn() });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: /add to résumé/i })).toBeInTheDocument();
  });

  it("does not spend a call when the correction form is left unchanged", () => {
    // Same guarantee the old Yes button carried, at the new geometry: an
    // untouched form tells the model nothing it did not already have.
    const onRewriteWithFacts = vi.fn();
    renderExpansion({ onRewriteWithFacts });
    fireEvent.click(screen.getByRole("button", { name: /not quite/i }));
    fireEvent.click(screen.getByRole("button", { name: /use this and rewrite/i }));
    expect(onRewriteWithFacts).not.toHaveBeenCalled();
    // And the form closed back to the result rather than dead-ending.
    expect(screen.getByRole("button", { name: /add to résumé/i })).toBeInTheDocument();
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

  it("offers no correction link when the caller cannot use the facts", () => {
    renderExpansion();
    expect(screen.queryByRole("button", { name: /not quite/i })).toBeNull();
    expect(screen.getByRole("button", { name: /add to résumé/i })).toBeInTheDocument();
  });

  it("offers no correction link when there is no résumé bullet to ground it", () => {
    renderExpansion({
      onRewriteWithFacts: vi.fn(),
      state: { phase: "ready", suggestions: [{ ...suggestion, original: "" }] },
    });
    expect(screen.queryByRole("button", { name: /not quite/i })).toBeNull();
  });
});

describe("the ATS meter", () => {
  const base = { grade: 85, gradedAtLabel: "2:41 PM", stale: false };

  // "shows what is still open" lived here and is gone with the unmatched flag
  // (user-directed 2026-08-07). The claim it defended -- that the tile names
  // the part you can act on -- was the problem: that number disagreed with the
  // queue that actually lists the work. The found/total ratio survives on the
  // live path only; `tailorLiveCoverage.test.tsx` owns that rule. What is left
  // here is the METER, unchanged.

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
