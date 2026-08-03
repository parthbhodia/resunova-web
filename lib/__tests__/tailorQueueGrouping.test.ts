import { describe, expect, it } from "vitest";
import {
  groupQueueByKind,
  QUEUE_KIND_ORDER,
  type QueueItem,
} from "@/lib/tailorWorkQueue";

const item = (id: string, kind: QueueItem["kind"]): QueueItem => ({
  id, name: id, kind, status: "queued", detail: "",
});

describe("groupQueueByKind", () => {
  it("orders groups by leverage, not by input order", () => {
    const g = groupQueueByKind([
      item("k", "keyword"),
      item("c", "contextual"),
      item("q", "qualification"),
      item("r", "responsibility"),
    ]);
    expect(g.map((x) => x.kind)).toEqual(["qualification", "responsibility", "keyword", "contextual"]);
  });

  it("drops empty groups rather than rendering a header with nothing under it", () => {
    const g = groupQueueByKind([item("q", "qualification")]);
    expect(g.map((x) => x.kind)).toEqual(["qualification"]);
  });

  it("keeps arrival order inside a group", () => {
    // The rater already returns these in priority order; regrouping must not
    // shuffle them.
    const g = groupQueueByKind([
      item("first", "keyword"), item("second", "keyword"), item("third", "keyword"),
    ]);
    expect(g[0].items.map((i) => i.id)).toEqual(["first", "second", "third"]);
  });

  it("loses nothing", () => {
    // The queue's core promise is that an item never silently disappears, so
    // grouping must be a partition.
    const items = [
      item("a", "qualification"), item("b", "keyword"),
      item("c", "contextual"), item("d", "responsibility"), item("e", "keyword"),
    ];
    const flat = groupQueueByKind(items).flatMap((g) => g.items);
    expect(flat).toHaveLength(items.length);
    expect(new Set(flat.map((i) => i.id))).toEqual(new Set(items.map((i) => i.id)));
  });

  it("returns nothing for an empty queue", () => {
    expect(groupQueueByKind([])).toEqual([]);
  });

  it("covers every kind the queue can produce", () => {
    // A new QueueKind without an entry here would render ungrouped and vanish.
    const one = QUEUE_KIND_ORDER.map((k) => item(k, k));
    expect(groupQueueByKind(one)).toHaveLength(QUEUE_KIND_ORDER.length);
  });
});
