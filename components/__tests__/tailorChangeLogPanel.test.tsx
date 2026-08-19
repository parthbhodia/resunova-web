import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorChangeLog, restingChips } from "@/components/tailor/TailorChangeLog";
import type { ResumeChange } from "@/lib/tailorChangeLog";

const ONE: ResumeChange = {
  key: "bullet:0",
  kind: "fix",
  bulletIndex: 0,
  original: "Built and deployed backend services in Python.",
  applied: "Built and deployed backend services in Python on Kubernetes.",
  requirements: ["Kubernetes"],
};

const SHARED: ResumeChange = {
  key: "bullet:1",
  kind: "fix",
  bulletIndex: 1,
  original: "Ran the release pipeline.",
  applied: "Ran the release pipeline on Kubernetes with Terraform.",
  requirements: ["Kubernetes", "Terraform"],
};

const EDIT: ResumeChange = {
  key: "bullet:2",
  kind: "edit",
  bulletIndex: 2,
  original: "Led migration of legacy services.",
  applied: "Led migration of legacy services, cutting spend 31%.",
  requirements: [],
};

const SKILL: ResumeChange = {
  key: "skill:terraform",
  kind: "skill",
  bulletIndex: -1,
  original: "",
  applied: "Terraform",
  requirements: ["Terraform"],
};

const openRow = (name: RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("the change log", () => {
  it("renders nothing before anything has changed", () => {
    const { container } = render(<TailorChangeLog changes={[]} onUndo={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("counts the changes in its heading", () => {
    render(<TailorChangeLog changes={[ONE, SHARED]} onUndo={vi.fn()} />);
    expect(screen.getByText("2 changes to your résumé")).toBeInTheDocument();
  });

  it("leads with the requirement, not the sentence", () => {
    // The old panel led every row with the rewritten bullet — nine truncated
    // sentences that all start alike, with "Covers X" demoted to a caption.
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    // The sentence survives as the caption, framed as location.
    expect(screen.getByText(`in "${ONE.original}"`)).toBeInTheDocument();
    expect(screen.queryByText(/^Covers /)).toBeNull();
  });

  it("shows the added words without expanding anything", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    const chips = screen.getAllByTestId("added-chip").map((c) => c.textContent);
    expect(chips).toContain("on");
  });

  it("drops a chip that just repeats the row's title", () => {
    // A "Kubernetes" chip beside a "Kubernetes" title is noise, not signal.
    expect(restingChips(ONE, "Kubernetes")).toEqual(["on"]);
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    expect(
      screen.getAllByTestId("added-chip").map((c) => c.textContent),
    ).not.toContain("Kubernetes");
  });

  it("shows the original line only when the row is opened", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    expect(screen.queryByText(ONE.original)).toBeNull();
    openRow(/Kubernetes/);
    expect(screen.getByText(ONE.original)).toBeInTheDocument();
  });

  it("offers See-it inside the open row and hands back the change", () => {
    const onSee = vi.fn();
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} onSee={onSee} />);
    expect(screen.queryByRole("button", { name: /see it in your résumé/i })).toBeNull();
    openRow(/Kubernetes/);
    fireEvent.click(screen.getByRole("button", { name: /see it in your résumé/i }));
    expect(onSee).toHaveBeenCalledWith(ONE);
  });
});

describe("provenance", () => {
  it("groups the user's own edits under their own label", () => {
    render(<TailorChangeLog changes={[ONE, EDIT]} onUndo={vi.fn()} />);
    expect(screen.getByText("Your own edits")).toBeInTheDocument();
    expect(screen.getByText("You rewrote a line")).toBeInTheDocument();
  });

  it("draws no group label when every change is the user's own", () => {
    // A label over the whole list labels nothing.
    render(<TailorChangeLog changes={[EDIT]} onUndo={vi.fn()} />);
    expect(screen.queryByText("Your own edits")).toBeNull();
  });

  it("renders a Skills-section add as its own kind of row", () => {
    // Today's shipped panel omits these entirely, while its header promises
    // "every edit that will be in the file you download".
    render(<TailorChangeLog changes={[SKILL]} onUndo={vi.fn()} />);
    expect(screen.getByText("Terraform")).toBeInTheDocument();
    expect(screen.getByText("added to your Skills section")).toBeInTheDocument();
  });

  it("offers no See-it on a skills row", () => {
    // The preview resolver only finds bullets; a link that scrolls nowhere is
    // a dead click.
    render(<TailorChangeLog changes={[SKILL]} onUndo={vi.fn()} onSee={vi.fn()} />);
    openRow(/Terraform/);
    expect(screen.queryByRole("button", { name: /see it in your résumé/i })).toBeNull();
  });
});

describe("undo", () => {
  it("asks before reverting", () => {
    const onUndo = vi.fn();
    render(<TailorChangeLog changes={[ONE]} onUndo={onUndo} />);
    openRow(/Kubernetes/);
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(onUndo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Undo it" }));
    expect(onUndo).toHaveBeenCalledWith(ONE);
  });

  it("can be backed out of", () => {
    const onUndo = vi.fn();
    render(<TailorChangeLog changes={[ONE]} onUndo={onUndo} />);
    openRow(/Kubernetes/);
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
    openRow(/Kubernetes & Terraform/);
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(
      screen.getByText("Puts the original line back and reopens all 2 requirements."),
    ).toBeInTheDocument();
  });

  it("does not claim plural consequences for a single requirement", () => {
    render(<TailorChangeLog changes={[ONE]} onUndo={vi.fn()} />);
    openRow(/Kubernetes/);
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(screen.getByText("Puts the original line back.")).toBeInTheDocument();
  });

  it("names the skills consequence on a skills row", () => {
    // "Puts the original line back" would be false — there is no line; the
    // revert removes the term and reopens the requirement.
    const onUndo = vi.fn();
    render(<TailorChangeLog changes={[SKILL]} onUndo={onUndo} />);
    openRow(/Terraform/);
    fireEvent.click(screen.getByRole("button", { name: "Undo this change" }));
    expect(
      screen.getByText("Removes it from your Skills section and reopens the requirement."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo it" }));
    expect(onUndo).toHaveBeenCalledWith(SKILL);
  });
});
