import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";

const items: QueueItem[] = [
  { id: "qualification:a", name: "CI/CD", kind: "qualification", status: "queued", detail: "" },
  { id: "keyword:b", name: "Kubernetes", kind: "keyword", status: "queued", detail: "" },
  { id: "contextual:c", name: "advertisers", kind: "contextual", status: "queued", detail: "" },
];

describe("TailorWorkQueue working state", () => {
  it("spins every row in the workingIds set (wave passes spin whole batches)", () => {
    render(
      <TailorWorkQueue
        items={items}
        workingIds={new Set(["qualification:a", "keyword:b"])}
        fixAllBusy
      />,
    );
    expect(screen.getAllByLabelText("working")).toHaveLength(2);
    // The contextual row is not in any batch's flight — it stays a plain dot.
    expect(screen.getAllByLabelText("queued")).toHaveLength(1);
  });

  it("still supports the single workingId used by the preview demo", () => {
    render(<TailorWorkQueue items={items} workingId="keyword:b" />);
    expect(screen.getAllByLabelText("working")).toHaveLength(1);
  });

  it("keeps one-by-one review while offering a real selected batch", () => {
    const onFixSelected = vi.fn();
    const onItemAction = vi.fn();
    render(
      <TailorWorkQueue
        items={items}
        onFixAll={vi.fn()}
        onFixSelected={onFixSelected}
        onItemAction={onItemAction}
      />,
    );

    fireEvent.click(screen.getByLabelText("Select CI/CD"));
    fireEvent.click(screen.getByRole("button", { name: "Improve selected (1)" }));
    expect(onFixSelected).toHaveBeenCalledWith([items[0]]);

    fireEvent.click(screen.getAllByRole("button", { name: "Review fix" })[0]);
    expect(onItemAction).toHaveBeenCalledWith(items[0], "fix");
  });
});

/**
 * Grouping by consequence. Two earlier axes were tried and dropped: the
 * required/preferred split, killed by measurement (94.6% of concepts come back
 * "required", and 9 of 15 production scans had no non-required concept at
 * all), and kind, which named the rater's field at the user instead of telling
 * them what the gap costs.
 */
describe("the queue groups by what the gap costs", () => {
  const items: QueueItem[] = [
    { id: "k:go", name: "Go", kind: "keyword", status: "queued", detail: "" },
    { id: "q:degree", name: "Master's degree", kind: "qualification", status: "queued", detail: "" },
    { id: "r:review", name: "Review code", kind: "responsibility", status: "queued", detail: "" },
  ];

  it("heads each band with its consequence, not its source field", () => {
    render(<TailorWorkQueue items={items} />);
    expect(screen.getByText("Could get you filtered out")).toBeInTheDocument();
    expect(screen.getByText("Worth adding")).toBeInTheDocument();
    // The taxonomy words are gone from the headers.
    expect(screen.queryByText("Qualifications")).toBeNull();
    expect(screen.queryByText("What the role does")).toBeNull();
  });

  it("puts hard requirements in one band, however the rater filed them", () => {
    // A qualification and a responsibility read the same to a screener.
    render(<TailorWorkQueue items={items} />);
    expect(screen.getAllByText("Could get you filtered out")).toHaveLength(1);
    expect(screen.getByText("· 2")).toBeInTheDocument();
  });

  it("shows no header for a band with nothing in it", () => {
    render(<TailorWorkQueue items={[items[0]]} />);
    expect(screen.queryByText("Could get you filtered out")).toBeNull();
    expect(screen.getByText("Worth adding")).toBeInTheDocument();
  });

  it("counts what is open, so a handled band stops accusing you", () => {
    render(
      <TailorWorkQueue
        items={[{ ...items[1], status: "applied" }, { ...items[2], status: "ignored" }]}
      />,
    );
    expect(screen.getByText("Could get you filtered out")).toBeInTheDocument();
    expect(screen.getByText("· all set")).toBeInTheDocument();
  });

  it("still renders every row", () => {
    // Grouping is a partition: an item must never disappear into a header.
    render(<TailorWorkQueue items={items} />);
    for (const it of items) expect(screen.getByText(it.name)).toBeInTheDocument();
  });
});
