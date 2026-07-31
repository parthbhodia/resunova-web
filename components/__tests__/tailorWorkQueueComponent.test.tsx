import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
