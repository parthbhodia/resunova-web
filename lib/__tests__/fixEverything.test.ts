import { describe, expect, it } from "vitest";
import {
  collectUnaddressedGaps, countGaps, batchGapName, batchGapNotes, MAX_GAPS_PER_BATCH,
  appendBulletLine, suggestionIsUsable, uncoverableReason, inventedBulletPermission,
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

  it("lets aggressive mode invent one new bullet under an existing role", () => {
    const q = collectUnaddressedGaps(ratings(), NONE)[0];
    const notes = batchGapNotes(q, "aggressive");
    expect(notes).toContain("what was accomplished, the result it produced, and how it was done");
    expect(notes.toLowerCase()).toContain("invent one new bullet");
    expect(notes.toLowerCase()).not.toContain("never invent");
    expect(notes).toContain("empty original");
  });

  it("gives the model no template text it could echo into a bullet", () => {
    // Field report: the old prompt named the "Google XYZ formula" with [X]/[Y]/[Z]
    // slots, and a bullet shipped ending "using XYZ methodology."
    const notes = batchGapNotes(collectUnaddressedGaps(ratings(), NONE)[0], "aggressive");
    expect(notes).not.toMatch(/\bXYZ\b|\[[XYZ]\]/);
  });

  it("sends no instruction word the server would demand in every rewrite", () => {
    // The server's extract_gap_target_terms treats any CamelCase or 3+ letter
    // all-caps token in gap_notes as a required posting term. "XYZ" and "MAY"
    // in this text made it drop every rewrite that did not contain both:
    // a nine-row pass applied one fix, and that one said "using XYZ methodology".
    const camelOrCaps = /\b[A-Z][a-zA-Z0-9]*(?:[A-Z][a-z0-9]*)+\b/g;
    for (const mode of ["aggressive", "honest"] as const) {
      expect(inventedBulletPermission(mode).match(camelOrCaps)).toBeNull();
    }
    const q = collectUnaddressedGaps(ratings(), NONE)[0];
    const instructions = batchGapNotes(q, "aggressive").slice(q.notes.length);
    expect(instructions.match(camelOrCaps)).toBeNull();
  });

  it("lets aggressive mode retitle an existing role toward the posting", () => {
    const q = collectUnaddressedGaps(ratings(), NONE)[0];
    const notes = batchGapNotes(q, "aggressive");
    expect(notes).toContain("suggested_role");
    expect(notes.toLowerCase()).toContain("retitle");
  });
});

describe("suggestionIsUsable", () => {
  it("drops a rewrite that introduces template placeholders", () => {
    const original = "Built ResuNova, a résumé platform.";
    expect(
      suggestionIsUsable({ original, suggested: `${original.slice(0, -1)} using XYZ methodology.` }),
    ).toBe(false);
    expect(suggestionIsUsable({ original: "", suggested: "Cut latency by [X] by caching reads." })).toBe(false);
    expect(suggestionIsUsable({ original, suggested: "Built ResuNova; grew usage by [metric]." })).toBe(false);
  });

  it("keeps a placeholder-looking word the original already had", () => {
    expect(
      suggestionIsUsable({ original: "Led QA at XYZ Corp.", suggested: "Led release QA at XYZ Corp for 3 products." }),
    ).toBe(true);
  });

  it("keeps an ordinary rewrite", () => {
    expect(
      suggestionIsUsable({ original: "Built the API.", suggested: "Built the billing API in FastAPI." }),
    ).toBe(true);
  });
});

describe("uncoverableReason", () => {
  it("blocks a degree requirement that names no level", () => {
    expect(uncoverableReason("CS degree")).not.toBeNull();
    expect(uncoverableReason("Degree in Computer Science or related field")).not.toBeNull();
  });

  it("does not block a 'degree of' phrasing", () => {
    expect(uncoverableReason("high degree of ownership")).toBeNull();
  });
});

describe("appendBulletLine", () => {
  it("adds a bullet and refuses a duplicate", () => {
    const once = appendBulletLine("EXPERIENCE\n• Built the API.", "Owned on-call for a small team.");
    expect(once).toContain("• Owned on-call for a small team.");
    expect(appendBulletLine(once, "Owned on-call for a small team.")).toBe(once);
  });
});
