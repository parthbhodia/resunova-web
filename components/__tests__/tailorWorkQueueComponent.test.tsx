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
    // The contextual row is not in any batch's flight, and it is not a
    // selectable gap either, so it carries the context mark rather than a
    // status dot claiming it is "queued" for work nobody will do to it.
    expect(screen.getAllByLabelText("context")).toHaveLength(1);
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

    fireEvent.click(screen.getAllByRole("button", { name: "Fix this" })[0]);
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
    expect(screen.getByText("2")).toBeInTheDocument();
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
    expect(screen.getByText("all set")).toBeInTheDocument();
  });

  it("still renders every row", () => {
    // Grouping is a partition: an item must never disappear into a header.
    render(<TailorWorkQueue items={items} />);
    for (const it of items) expect(screen.getByText(it.name)).toBeInTheDocument();
  });
});

/**
 * Select all, per band. Field-asked ("add select all option for both the
 * sections"): ticking fourteen keyword rows one checkbox at a time to feed
 * "Improve selected" is busywork. The control is BAND-scoped in both
 * directions, and it governs only rows the bulk pass would actually attempt —
 * a checked row the button ignores is a lie.
 */
describe("select all per band", () => {
  const bandItems: QueueItem[] = [
    { id: "qualification:q1", name: "Production observability", kind: "qualification", status: "queued", detail: "" },
    { id: "qualification:q2", name: "Distributed systems", kind: "qualification", status: "queued", detail: "" },
    // A credential renders a checkbox but the pass skips it by design, so
    // select-all must leave it alone.
    { id: "qualification:phd", name: "PhD", kind: "qualification", status: "queued", detail: "" },
    { id: "keyword:k1", name: "Golang", kind: "keyword", status: "queued", detail: "" },
    { id: "keyword:k2", name: "TypeScript", kind: "keyword", status: "queued", detail: "" },
    { id: "keyword:k3", name: "CSS", kind: "keyword", status: "queued", detail: "" },
    // Finished work is a receipt, not a target.
    { id: "keyword:done", name: "Terraform", kind: "keyword", status: "applied", detail: "" },
    { id: "contextual:ctx", name: "advertisers", kind: "contextual", status: "queued", detail: "" },
  ];

  it("selects only its own band's selectable rows", () => {
    render(<TailorWorkQueue items={bandItems} onFixAll={vi.fn()} onFixSelected={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Select all in Could get you filtered out"));
    // Two real qualifications; the credential stays out, and no keyword moves.
    expect(screen.getByRole("button", { name: "Improve selected (2)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Select PhD")).not.toBeChecked();
    expect(screen.getByLabelText("Select Golang")).not.toBeChecked();
  });

  it("hands the bulk pass exactly the band it selected", () => {
    const onFixSelected = vi.fn();
    render(<TailorWorkQueue items={bandItems} onFixAll={vi.fn()} onFixSelected={onFixSelected} />);
    fireEvent.click(screen.getByLabelText("Select all in Worth adding"));
    fireEvent.click(screen.getByRole("button", { name: "Improve selected (3)" }));
    expect(onFixSelected).toHaveBeenCalledWith([bandItems[3], bandItems[4], bandItems[5]]);
  });

  it("clears only its own band, keeping the other band's selection", () => {
    render(<TailorWorkQueue items={bandItems} onFixAll={vi.fn()} onFixSelected={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Select all in Could get you filtered out"));
    fireEvent.click(screen.getByLabelText("Select all in Worth adding"));
    expect(screen.getByRole("button", { name: "Improve selected (5)" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Clear selection in Could get you filtered out"));
    expect(screen.getByRole("button", { name: "Improve selected (3)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Select Golang")).toBeChecked();
  });

  it("does not offer select-all where there is nothing worth batching", () => {
    // One selectable row has its own checkbox; advisory bands have none.
    const thin: QueueItem[] = [
      { id: "qualification:q1", name: "Production observability", kind: "qualification", status: "queued", detail: "" },
      { id: "keyword:k1", name: "Golang", kind: "keyword", status: "queued", detail: "" },
      { id: "keyword:k2", name: "TypeScript", kind: "keyword", status: "queued", detail: "" },
      { id: "contextual:ctx", name: "advertisers", kind: "contextual", status: "queued", detail: "" },
    ];
    render(<TailorWorkQueue items={thin} onFixAll={vi.fn()} />);
    const selectAlls = screen.getAllByRole("button", { name: /Select all in/ });
    expect(selectAlls).toHaveLength(1);
    expect(selectAlls[0]).toHaveAccessibleName("Select all in Worth adding");
  });
});
