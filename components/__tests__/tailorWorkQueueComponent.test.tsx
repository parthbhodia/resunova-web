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
