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
      // The covered band is reached by STATUS, not by kind, so it needs an
      // item of its own here or the exhaustiveness claim is only about kinds.
      { ...item("cov", "qualification"), status: "covered" as const },
    ];
    expect(groupQueueBySeverity(all)).toHaveLength(QUEUE_BAND_ORDER.length);
  });
});

describe("the covered band", () => {
  const covered = (name: string) => ({
    id: `qualification:${name}`,
    name,
    kind: "qualification" as const,
    status: "covered" as const,
    detail: "Evidence sentence.",
  });

  it("sorts last, so reassurance never sits above work", () => {
    const groups = groupQueueBySeverity([
      covered("Python"),
      { id: "k:go", name: "Go", kind: "keyword" as const, status: "queued" as const, detail: "" },
    ]);
    expect(groups.map((g) => g.band)).toEqual(["boost", "covered"]);
  });

  it("collects covered items whatever kind they are", () => {
    // Status wins over kind here: what a covered requirement IS stops
    // mattering once the résumé satisfies it, and filing by kind would
    // scatter reassurance through the work bands.
    const groups = groupQueueBySeverity([
      covered("Python"),
      { ...covered("Own delivery"), kind: "responsibility" as const, id: "r:own" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].band).toBe("covered");
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].open).toBe(0);
  });
});

describe("no work row is hidden, and no header undercounts", () => {
  // The reported bug: on a 24-requirement posting the queue rendered five rows
  // across two bands and printed "COULD GET YOU FILTERED OUT · 2" above seven
  // real blockers, because the flat list was sliced BEFORE grouping. Hiding
  // work is bad; under-reporting it while looking complete is worse.
  const many = (kind: QueueItem["kind"], n: number) =>
    Array.from({ length: n }, (_, i) => item(`${kind}${i}`, kind));

  it("shows every blocker and every keyword without an expand", () => {
    const g = groupQueueBySeverity([...many("qualification", 7), ...many("keyword", 13)]);
    const blocker = g.find((x) => x.band === "blocker")!;
    const boost = g.find((x) => x.band === "boost")!;
    expect(blocker.items).toHaveLength(7);
    expect(boost.items).toHaveLength(13);
    expect(blocker.hidden).toBe(0);
    expect(boost.hidden).toBe(0);
  });

  it("counts the whole band in the header, not the rows that survived a cap", () => {
    const g = groupQueueBySeverity(many("contextual", 6));
    const ctx = g.find((x) => x.band === "context")!;
    expect(ctx.open).toBe(6); // the header number
    expect(ctx.items).toHaveLength(3); // what is rendered
    expect(ctx.hidden).toBe(3);
  });

  it("collapses only the advisory bands", () => {
    const g = groupQueueBySeverity([
      ...many("qualification", 6),
      ...many("keyword", 6),
      ...many("contextual", 6),
    ]);
    const hiddenByBand = Object.fromEntries(g.map((x) => [x.band, x.hidden]));
    expect(hiddenByBand.blocker).toBe(0);
    expect(hiddenByBand.boost).toBe(0);
    expect(hiddenByBand.context).toBeGreaterThan(0);
  });

  it("expands everything when asked", () => {
    const g = groupQueueBySeverity(many("contextual", 6), true);
    expect(g[0].items).toHaveLength(6);
    expect(g[0].hidden).toBe(0);
  });
});
