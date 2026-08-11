import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorChangeLog } from "@/components/tailor/TailorChangeLog";
import type { ResumeChange } from "@/lib/tailorChangeLog";

const ONE: ResumeChange = {
  bulletIndex: 0,
  original: "Built and deployed backend services in Python.",
  applied: "Built and deployed backend services in Python on Kubernetes.",
  requirements: ["Kubernetes"],
};

const SHARED: ResumeChange = {
  bulletIndex: 1,
  original: "Ran the release pipeline.",
  applied: "Ran the release pipeline on Kubernetes with Terraform.",
  requirements: ["Kubernetes", "Terraform"],
};

describe("the change log", () => {
  it("renders nothing before anything has changed", () => {
    const { container } = render(<TailorChangeLog changes={[]} onUndo={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("counts the changes in its heading", () => {
    render(<TailorChangeLog changes={[ONE, SHARED]} onUndo={vi.fn()} />);
    expect(screen.getByText("2 changes to your résumé")).toBeInTheDocument();
  });

  it("names what each change covers without expanding it", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    expect(screen.getByText("Covers Kubernetes")).toBeInTheDocument();
  });

  it("shows the original line only on request", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    expect(screen.queryByText(ONE.original)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "What changed" }));
    expect(screen.getByText(ONE.original)).toBeInTheDocument();
  });
});

describe("undo", () => {
  it("asks before reverting", () => {
    const onUndo = vi.fn();
    render(<TailorChangeLog changes={[ONE]} onUndo={onUndo} />);
    fireEvent.click(screen.getByRole("button", { name: "What changed" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(onUndo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Undo it" }));
    expect(onUndo).toHaveBeenCalledWith(ONE);
  });

  it("can be backed out of", () => {
    const onUndo = vi.fn();
    render(<TailorChangeLog changes={[ONE]} onUndo={onUndo} />);
    fireEvent.click(screen.getByRole("button", { name: "What changed" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onUndo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Undo this change" })).toBeInTheDocument();
  });

  it("warns when one undo reopens more than one requirement", () => {
    // The trap: two fixes merged into one bullet, so reverting costs both. A
    // confirm that hid this would silently destroy work the user believed was
    // independent.
    render(<TailorChangeLog changes={[SHARED]} onUndo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "What changed" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(
      screen.getByText("Puts the original line back and reopens all 2 requirements."),
    ).toBeInTheDocument();
  });

  it("does not claim plural consequences for a single requirement", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "What changed" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(screen.getByText("Puts the original line back.")).toBeInTheDocument();
  });
});
