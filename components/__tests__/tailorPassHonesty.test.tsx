import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/**
 * The screenshot, as a test.
 *
 * Nineteen rows, every one stamped "This one couldn't be written from your real
 * experience", under a green band reading ALL SET. Most of those rows were never
 * sent to the model: the pass ran over the rater's shortlist while the queue
 * showed the wider scorer union. The copy blamed the résumé for our omission.
 */

const rows: QueueItem[] = [
  { id: "q:bachelor", name: "Bachelor's degree", kind: "qualification", status: "not_coverable", detail: "x" },
  { id: "q:fe", name: "front-end frameworks", kind: "qualification", status: "not_coverable", detail: "x" },
  { id: "q:dsa", name: "data structures/algorithms", kind: "qualification", status: "not_coverable", detail: "x" },
];

describe("a band we could not write for is not a win", () => {
  it("does not render ALL SET over dead requirements", () => {
    render(<TailorWorkQueue items={rows} onFixAll={vi.fn()} fixAllBusy={false} />);
    expect(screen.queryByText(/all set/i)).toBeNull();
  });

  it("says plainly that there is nothing left to try", () => {
    render(<TailorWorkQueue items={rows} onFixAll={vi.fn()} fixAllBusy={false} />);
    expect(screen.getByText(/none left to try/i)).toBeInTheDocument();
  });

  it("still says all set when the endings were the user's own", () => {
    const done: QueueItem[] = [
      { ...rows[0], status: "applied" },
      { ...rows[1], status: "ignored" },
    ];
    render(<TailorWorkQueue items={done} onFixAll={vi.fn()} fixAllBusy={false} />);
    expect(screen.getByText(/all set/i)).toBeInTheDocument();
  });
});

describe("the pass attempts exactly what its label promises", () => {
  it("hands the whole selectable queue to the fix handler, not a subset", () => {
    // "Improve 3 blockers" used to call onFixAll(), which re-derived the work
    // from the rater's narrower list. The button now passes the rows it counted.
    const open: QueueItem[] = [
      { id: "a", name: "front-end frameworks", kind: "qualification", status: "queued", detail: "" },
      { id: "b", name: "Terraform", kind: "qualification", status: "queued", detail: "" },
      { id: "c", name: "advertisers", kind: "contextual", status: "queued", detail: "" },
    ];
    const onFixSelected = vi.fn();
    render(
      <TailorWorkQueue
        items={open}
        onFixAll={vi.fn()}
        onFixSelected={onFixSelected}
        fixAllBusy={false}
      />,
    );
    screen.getByRole("button", { name: /improve 2 blockers/i }).click();
    expect(onFixSelected).toHaveBeenCalledTimes(1);
    // Two blockers named, two blockers handed over. Contextual is excluded by
    // design and the header says so.
    expect(onFixSelected.mock.calls[0][0].map((i: QueueItem) => i.name))
      .toEqual(["front-end frameworks", "Terraform"]);
  });
});
