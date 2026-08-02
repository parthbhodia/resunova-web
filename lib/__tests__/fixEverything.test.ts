import { describe, expect, it } from "vitest";
import {
  collectUnaddressedGaps, countGaps, batchGapName, batchGapNotes, MAX_GAPS_PER_BATCH,
  orderedConcurrent,
} from "@/lib/fixEverything";
import type { RatingsData } from "@/lib/types";

function ratings(over: Partial<RatingsData> = {}): RatingsData {
  return {
    match_score: 52, criteria: [], whats_working: [], gaps: [], verdict: "",
    overall_score: 52,
    job_title: { matched: false, jd_title: "SWE", resume_title: "Dev", score: 35, detail: "" },
    qualifications: {
      score: 40,
      covered: [],
      missing: [
        { text: "2 years building developer tools", context: "not documented", status: "missing" },
        { text: "Experience developing accessible technologies", context: "no a11y work", status: "missing" },
      ],
    },
    responsibilities: {
      score: 33, covered: [],
      missing: [{ text: "Review code developed by other developers", context: "no code review", status: "missing" }],
    },
    keywords: {
      found_count: 7, total_count: 13,
      direct_skills: { found: ["Python"], missing: ["C++", "Go"] },
      contextual: { found: [], missing: ["performance analysis"] },
    },
    ...over,
  } as RatingsData;
}

const NONE = new Set<string>();

describe("collectUnaddressedGaps", () => {
  it("groups every open gap into one batch per type", () => {
    const batches = collectUnaddressedGaps(ratings(), NONE);
    expect(batches.map((b) => b.type)).toEqual(["qualification", "responsibility", "keyword"]);
    expect(countGaps(batches)).toBe(6);
  });

  it("merges direct and contextual keywords into a single keyword batch", () => {
    const kw = collectUnaddressedGaps(ratings(), NONE).find((b) => b.type === "keyword");
    expect(kw?.gaps).toEqual(["C++", "Go", "performance analysis"]);
  });

  it("skips gaps the user already addressed", () => {
    // Running the pass twice must not re-fix what was already applied.
    const batches = collectUnaddressedGaps(ratings(), new Set(["C++", "Review code developed by other developers"]));
    expect(batches.find((b) => b.type === "responsibility")).toBeUndefined();
    expect(batches.find((b) => b.type === "keyword")?.gaps).toEqual(["Go", "performance analysis"]);
  });

  it("clears short symbol-bearing keywords too", () => {
    // Regression tie-in: gapKeysMatch used to fail on C++/Go, so these could
    // never be filtered out and every pass would re-request them.
    const batches = collectUnaddressedGaps(ratings(), new Set(["C++", "Go"]));
    expect(batches.find((b) => b.type === "keyword")?.gaps).toEqual(["performance analysis"]);
  });

  it("omits a type entirely when it has nothing open", () => {
    const r = ratings({ responsibilities: { score: 100, covered: [], missing: [] } } as Partial<RatingsData>);
    expect(collectUnaddressedGaps(r, NONE).map((b) => b.type)).toEqual(["qualification", "keyword"]);
  });

  it("caps a batch so the prompt stays targeted", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      text: `Missing requirement number ${i}`, context: "", status: "missing" as const,
    }));
    const r = ratings({ qualifications: { score: 10, covered: [], missing: many } } as Partial<RatingsData>);
    const q = collectUnaddressedGaps(r, NONE).find((b) => b.type === "qualification");
    expect(q?.gaps).toHaveLength(MAX_GAPS_PER_BATCH);
  });

  it("returns nothing for absent or non-detailed ratings", () => {
    expect(collectUnaddressedGaps(null, NONE)).toEqual([]);
    expect(collectUnaddressedGaps(undefined, NONE)).toEqual([]);
    expect(collectUnaddressedGaps({ match_score: 50 } as RatingsData, NONE)).toEqual([]);
  });

  it("returns nothing when every gap is addressed", () => {
    const all = new Set([
      "2 years building developer tools", "Experience developing accessible technologies",
      "Review code developed by other developers", "C++", "Go", "performance analysis",
    ]);
    expect(collectUnaddressedGaps(ratings(), all)).toEqual([]);
  });
});

describe("batch request shape", () => {
  it("keeps every member in the gap name so each can be marked addressed", () => {
    // The apply path matches these labels to clear chips; a batch that hid its
    // members would leave them all showing as still missing.
    const kw = collectUnaddressedGaps(ratings(), NONE).find((b) => b.type === "keyword")!;
    const name = batchGapName(kw);
    for (const g of kw.gaps) expect(name).toContain(g);
  });

  it("tells the model to leave a gap uncovered rather than fabricate", () => {
    const q = collectUnaddressedGaps(ratings(), NONE)[0];
    expect(batchGapNotes(q).toLowerCase()).toContain("never invent");
    expect(batchGapNotes(q)).toContain("qualifications");
  });
});

describe("orderedConcurrent", () => {
  /** Resolves after `ms`, recording when it started and finished. */
  const timed = (log: string[], ms: number) => (item: string) => {
    log.push(`start:${item}`);
    return new Promise<string>((resolve) =>
      setTimeout(() => { log.push(`end:${item}`); resolve(`done:${item}`); }, ms),
    );
  };

  it("yields results in the original order even when they finish out of order", async () => {
    const items = ["a", "b", "c", "d"];
    // 'a' is the slowest, so completion order is d, c, b, a.
    const delays: Record<string, number> = { a: 40, b: 30, c: 20, d: 10 };
    const seen: string[] = [];
    for await (const { item } of orderedConcurrent(
      items,
      (it: string) => new Promise((r) => setTimeout(() => r(it), delays[it])),
      4,
    )) {
      seen.push(item);
    }
    expect(seen).toEqual(["a", "b", "c", "d"]);
  });

  it("overlaps the fetches rather than running them end to end", async () => {
    const log: string[] = [];
    const items = ["a", "b", "c", "d"];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of orderedConcurrent(items, timed(log, 10), 4)) { /* drain */ }

    // All four start before the first one finishes. Sequentially this would read
    // start:a end:a start:b end:b ... — the regression this test exists to catch.
    const firstEnd = log.findIndex((e) => e.startsWith("end:"));
    const startsBeforeFirstEnd = log.slice(0, firstEnd).filter((e) => e.startsWith("start:"));
    expect(startsBeforeFirstEnd).toHaveLength(4);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 9 }, (_, i) => `g${i}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of orderedConcurrent(
      items,
      () => {
        active += 1;
        peak = Math.max(peak, active);
        return new Promise<number>((r) => setTimeout(() => { active -= 1; r(1); }, 5));
      },
      3,
    )) { /* drain */ }
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1); // and it genuinely did overlap
  });

  it("keeps going when one item resolves empty", async () => {
    const items = ["a", "b", "c"];
    const out: string[][] = [];
    for await (const { result } of orderedConcurrent(
      items,
      async (it: string) => (it === "b" ? [] : [it]),
      2,
    )) {
      out.push(result);
    }
    expect(out).toEqual([["a"], [], ["c"]]);
  });

  it("runs each item exactly once", async () => {
    const calls: number[] = [];
    const items = Array.from({ length: 7 }, (_, i) => i);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of orderedConcurrent(
      items,
      async (_item: number, i: number) => { calls.push(i); return i; },
      3,
    )) { /* drain */ }
    expect(calls.sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("handles fewer items than the concurrency limit", async () => {
    const seen: number[] = [];
    for await (const { result } of orderedConcurrent([1, 2], async (n: number) => n * 10, 8)) {
      seen.push(result);
    }
    expect(seen).toEqual([10, 20]);
  });
});
