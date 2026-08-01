import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorStrengthsCard } from "@/components/tailor/TailorStrengthsCard";
import { TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";

describe("TailorStrengthsCard", () => {
  it("shows the verdict, strengths and fit factors", () => {
    render(
      <TailorStrengthsCard
        verdict="Fair fit, strong LLM depth."
        strengths={["Production LLM systems", "Security clearance work"]}
        fitFactors={[{ text: "Hybrid in Sunnyvale", analysis: "Expect a relocation question." }]}
      />,
    );
    const card = screen.getByTestId("strengths-card");
    expect(card.textContent).toContain("Working in your favor");
    expect(card.textContent).toContain("Fair fit, strong LLM depth.");
    expect(card.textContent).toContain("Production LLM systems");
    expect(card.textContent).toContain("Expect a relocation question.");
  });

  it("collapses long lists behind Show more", () => {
    render(
      <TailorStrengthsCard
        strengths={["a", "b", "c", "d", "e"]}
      />,
    );
    expect(screen.queryByText("e")).toBeNull();
    fireEvent.click(screen.getByText("Show 2 more"));
    expect(screen.getByText("e")).toBeTruthy();
  });

  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<TailorStrengthsCard strengths={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("finish banner interview handoff", () => {
  it("offers Prep for the interview once the pass is done", () => {
    const onInterviewPrep = vi.fn();
    const items: QueueItem[] = [
      { id: "keyword:k8s", name: "Kubernetes", kind: "keyword", status: "applied", detail: "" },
    ];
    render(
      <TailorWorkQueue items={items} passRan onInterviewPrep={onInterviewPrep} />,
    );
    fireEvent.click(screen.getByText("Prep for the interview"));
    expect(onInterviewPrep).toHaveBeenCalled();
    expect(screen.getByText(/carry over/)).toBeTruthy();
  });
});
