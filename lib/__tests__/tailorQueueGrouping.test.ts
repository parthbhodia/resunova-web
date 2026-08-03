import { describe, expect, it } from "vitest";
import {
  groupQueueBySeverity,
  QUEUE_BAND_ORDER,
  type QueueItem,
} from "@/lib/tailorWorkQueue";

const item = (
  id: string,
  kind: QueueItem["kind"],
  status: QueueItem["status"] = "queued",
): QueueItem => ({ id, name: id, kind, status, detail: "" });

describe("groupQueueBySeverity", () => {
  it("bands by what the gap costs, not by which rater field it came from", () => {
    // Qualifications and responsibilities read the same to a screener: a hard
    // requirement you do not evidence. Splitting them apart is the taxonomy
    // leaking into the UI.
    const g = groupQueueBySeverity([
      item("k", "keyword"),
      item("c", "contextual"),
      item("q", "qualification"),
      item("r", "responsibility"),
    ]);
    expect(g.map((x) => x.band)).toEqual(["blocker", "boost", "context"]);
    expect(g[0].items.map((i) => i.id).sort()).toEqual(["q", "r"]);
  });

  it("orders bands by consequence, not by input order", () => {
    const g = groupQueueBySeverity([item("c", "contextual"), item("q", "qualification")]);
    expect(g.map((x) => x.band)).toEqual(["blocker", "context"]);
  });

  it("counts what is still open, not the size of the band", () => {
    // A header that says four things could filter you out, when you have
    // already handled three, is the same overcounting the queue exists to end.
    const g = groupQueueBySeverity([
      item("a", "qualification", "applied"),
      item("b", "qualification", "ignored"),
      item("c", "qualification", "queued"),
    ]);
    expect(g[0].open).toBe(1);
    expect(g[0].items).toHaveLength(3);
  });

  it("counts needs_review as still open", () => {
    // A change landed but carries a claim the user has not verified. That is
    // not done, and calling it done is exactly the wrong direction to be wrong.
    const g = groupQueueBySeverity([item("a", "qualification", "needs_review")]);
    expect(g[0].open).toBe(1);
    expect(g[0].tone).toBe("crit");
  });

  it("turns a band good when every ending was the user's own", () => {
    // applied = a change landed; ignored = they decided. Both are outcomes
    // they own, and a band of those is genuinely done.
    const g = groupQueueBySeverity([
      item("a", "qualification", "applied"),
      item("b", "responsibility", "ignored"),
    ]);
    expect(g[0].open).toBe(0);
    expect(g[0].tone).toBe("good");
  });

  it("does not call a band of dead requirements all set", () => {
    // The reported bug: nineteen rows we could not write for, nothing open,
    // rendered green under "ALL SET". Nothing is open because nothing is
    // possible, which is the opposite of fine — you can still be filtered out
    // on every one of them.
    const g = groupQueueBySeverity([
      item("a", "qualification", "not_coverable"),
      item("b", "responsibility", "not_coverable"),
    ]);
    expect(g[0].open).toBe(0);
    expect(g[0].tone).not.toBe("good");
  });

  it("does not go good while a single dead requirement remains", () => {
    const g = groupQueueBySeverity([
      item("a", "qualification", "applied"),
      item("b", "responsibility", "not_coverable"),
    ]);
    expect(g[0].tone).not.toBe("good");
  });

  it("keeps a handled band visible rather than dropping it", () => {
    // Rows must not vanish from under the user as they fix them.
    const g = groupQueueBySeverity([item("a", "keyword", "applied")]);
    expect(g).toHaveLength(1);
    expect(g[0].items.map((i) => i.id)).toEqual(["a"]);
  });

  it("tones open bands by severity", () => {
    const g = groupQueueBySeverity([
      item("q", "qualification"),
      item("k", "keyword"),
      item("c", "contextual"),
    ]);
    expect(g.map((x) => x.tone)).toEqual(["crit", "warn", "muted"]);
  });

  it("drops empty bands rather than rendering a header with nothing under it", () => {
    const g = groupQueueBySeverity([item("q", "qualification")]);
    expect(g.map((x) => x.band)).toEqual(["blocker"]);
  });

  it("keeps arrival order inside a band", () => {
    // The rater already returns these in priority order; regrouping must not
    // shuffle them.
    const g = groupQueueBySeverity([
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
    const flat = groupQueueBySeverity(items).flatMap((g) => g.items);
    expect(flat).toHaveLength(items.length);
    expect(new Set(flat.map((i) => i.id))).toEqual(new Set(items.map((i) => i.id)));
  });

  it("returns nothing for an empty queue", () => {
    expect(groupQueueBySeverity([])).toEqual([]);
  });

  it("covers every band the queue can produce", () => {
    // A kind mapped to no band would render ungrouped and vanish.
    const all = [
      item("q", "qualification"), item("r", "responsibility"),
      item("k", "keyword"), item("c", "contextual"),
    ];
    expect(groupQueueBySeverity(all)).toHaveLength(QUEUE_BAND_ORDER.length);
  });
});
