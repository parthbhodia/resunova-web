import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorSkillsFollowUp, mergeSkillsFollowUp } from "@/components/tailor/TailorSkillsFollowUp";

describe("TailorSkillsFollowUp", () => {
  it("says which group an added tool landed in", () => {
    render(
      <TailorSkillsFollowUp
        notice={{ kind: "added", groups: [{ category: "Cloud & Infra", tools: ["Terraform", "Kubernetes"] }] }}
        onCreateSection={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId("skills-follow-up").textContent).toMatch(/Terraform and Kubernetes/);
    expect(screen.getByTestId("skills-follow-up").textContent).toMatch(/Cloud & Infra/);
  });

  it("offers to create a Skills section when the résumé has none", () => {
    const onCreate = vi.fn();
    const onDismiss = vi.fn();
    render(
      <TailorSkillsFollowUp
        notice={{ kind: "offer", tools: ["Retool"] }}
        onCreateSection={onCreate}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText(/no Skills section/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a Skills section" }));
    expect(onCreate).toHaveBeenCalledWith(["Retool"]);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders nothing without a notice", () => {
    const { container } = render(
      <TailorSkillsFollowUp notice={null} onCreateSection={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("mergeSkillsFollowUp", () => {
  it("accumulates offers instead of keeping only the last tool list", () => {
    const first = mergeSkillsFollowUp(null, { kind: "offer", tools: ["Terraform"] });
    const second = mergeSkillsFollowUp(first, { kind: "offer", tools: ["Go", "terraform"] });
    expect(second).toEqual({ kind: "offer", tools: ["Terraform", "Go"] });
  });

  it("merges added groups by category", () => {
    const first = mergeSkillsFollowUp(null, {
      kind: "added",
      groups: [{ category: "Cloud & Infra", tools: ["Terraform"] }],
    });
    const second = mergeSkillsFollowUp(first, {
      kind: "added",
      groups: [
        { category: "Cloud & Infra", tools: ["Kubernetes"] },
        { category: "Languages", tools: ["Go"] },
      ],
    });
    expect(second).toEqual({
      kind: "added",
      groups: [
        { category: "Cloud & Infra", tools: ["Terraform", "Kubernetes"] },
        { category: "Languages", tools: ["Go"] },
      ],
    });
  });
});
