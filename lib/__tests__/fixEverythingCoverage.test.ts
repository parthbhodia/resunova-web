import { describe, expect, it } from "vitest";
import {
  MAX_GAPS_PER_BATCH,
  planQueueRuns,
  uncoverableReason,
  type GapBatch,
} from "@/lib/fixEverything";

/**
 * "Improve N gaps" has to attempt N things.
 *
 * The shipped pass filtered the user's selection down to the rater's batches,
 * so every row that came from the deterministic scorer was dropped without a
 * request — and then reported back as "couldn't be written from your real
 * experience", which blamed the résumé for a row nothing was tried on.
 */

const raterBatches: GapBatch[] = [
  {
    type: "responsibility",
    label: "responsibilities",
    gaps: ["participate in or lead design reviews"],
    notes: "design reviews: no evidence found",
  },
];

describe("a pass covers every row the user selected", () => {
  it("attempts a requirement the rater never mentioned", () => {
    // The whole reported bug in one case: this name is not in any batch.
    const { runs } = planQueueRuns(["front-end frameworks"], raterBatches);
    expect(runs).toHaveLength(1);
    expect(runs[0].gaps).toEqual(["front-end frameworks"]);
  });

  it("produces one run per name, rater-known or not", () => {
    const names = ["participate in or lead design reviews", "front-end frameworks", "Terraform"];
    const { runs } = planQueueRuns(names, raterBatches);
    expect(runs.map((r) => r.gaps[0])).toEqual(names);
  });

  it("keeps the rater's type and notes where it has them", () => {
    // Framing matters to the prompt: a responsibility is asked for differently
    // from a keyword, and the rater's analysis is the bridge material.
    const { runs } = planQueueRuns(["participate in or lead design reviews"], raterBatches);
    expect(runs[0].type).toBe("responsibility");
    expect(runs[0].notes).toContain("no evidence found");
  });

  it("falls back to the least presumptuous framing for an unknown name", () => {
    const { runs } = planQueueRuns(["Terraform"], raterBatches);
    expect(runs[0].type).toBe("qualification");
  });

  it("carries the queue row's own detail when the rater has none", () => {
    const { runs } = planQueueRuns(["Snowflake"], [], (n) =>
      n === "Snowflake" ? "The scanner did not find this anywhere." : "",
    );
    expect(runs[0].notes).toContain("The scanner did not find this");
  });

  it("does not cap the pass at the per-batch limit", () => {
    // take() bounds a BATCH so one prompt stays focused. It must not bound how
    // many rows a pass attempts, or rows past the eighth silently never run.
    const many = Array.from({ length: MAX_GAPS_PER_BATCH + 6 }, (_, i) => `requirement ${i + 1}`);
    const { runs } = planQueueRuns(many, []);
    expect(runs).toHaveLength(many.length);
  });

  it("dedupes and ignores blanks rather than firing wasted requests", () => {
    const { runs } = planQueueRuns(["Go", "go", "  ", "Go"], []);
    expect(runs.map((r) => r.gaps[0])).toEqual(["Go"]);
  });
});

describe("requirements no rewrite can ever close", () => {
  it("names a degree as a credential instead of attempting it", () => {
    // Spending a call here returns nothing, and the empty result was being
    // reported as a fact about the user's experience.
    expect(uncoverableReason("Bachelor's degree")).toMatch(/credential/i);
    expect(uncoverableReason("Master's degree or PhD in Computer Science")).toMatch(/credential/i);
  });

  it("routes those out of the runs and into an explained list", () => {
    const { runs, uncoverable } = planQueueRuns(
      ["Bachelor's degree", "front-end frameworks"],
      [],
    );
    expect(runs.map((r) => r.gaps[0])).toEqual(["front-end frameworks"]);
    expect(uncoverable.map((u) => u.name)).toEqual(["Bachelor's degree"]);
  });

  it("still attempts a years-of-experience requirement", () => {
    // The years cannot be invented, but the skill inside them may well be
    // evidenced somewhere the matcher missed. Wrongly blocking costs a real
    // fix, so this errs toward attempting.
    expect(uncoverableReason("5 years of experience with Java")).toBeNull();
    expect(uncoverableReason("object-oriented programming with Java")).toBeNull();
  });

  it("does not block an ordinary skill that merely mentions a field", () => {
    expect(uncoverableReason("data structures/algorithms")).toBeNull();
    expect(uncoverableReason("developing accessible technologies")).toBeNull();
    expect(uncoverableReason("launching software products")).toBeNull();
  });
});

describe("a run's notes describe its own gap, never its siblings", () => {
  /**
   * The 2026-08-13 field failure, verbatim shape: the rater's keyword batch
   * note enumerated every missing keyword, so each per-keyword call shipped
   * the word "Go" — and the server refused SEVEN fixable keywords ("Cursor",
   * "EKS", "S3", …) because the résumé lacks Go. One unfixable keyword
   * poisoned every sibling. The enumeration also invited the model to weave
   * in terms the validators then rejected.
   */
  const KEYWORDS = ["Go", "Cursor", "EKS", "EC2", "S3", "CDK", "CloudFormation", "VPC"];
  const keywordBatch: GapBatch[] = [
    {
      type: "keyword",
      label: "keywords",
      gaps: [...KEYWORDS],
      notes: `These keywords from the posting are missing: ${KEYWORDS.join(", ")}.`,
    },
  ];

  it("does not ship the sibling enumeration on a per-keyword run", () => {
    const { runs } = planQueueRuns(["Cursor"], keywordBatch);
    expect(runs).toHaveLength(1);
    expect(runs[0].notes).not.toContain("Go");
    expect(runs[0].notes).toContain("Cursor");
  });

  it("no run in a pass names another run's gap", () => {
    const { runs } = planQueueRuns(KEYWORDS, keywordBatch);
    for (const run of runs) {
      const own = run.gaps[0];
      for (const other of KEYWORDS) {
        if (other === own) continue;
        expect(run.notes).not.toContain(other);
      }
    }
  });

  it("still carries the rater's own line for THIS gap from a multi-gap batch", () => {
    // Qual/resp batch notes are per-gap "gap: analysis" lines; the line that
    // names this gap is genuine bridge material and must survive the cut.
    const batches: GapBatch[] = [
      {
        type: "qualification",
        label: "qualifications",
        gaps: ["Kubernetes", "mentor engineers"],
        notes: "Kubernetes: no container work shown\nmentor engineers: no mentoring evidence",
      },
    ];
    const { runs } = planQueueRuns(["Kubernetes"], batches);
    expect(runs[0].notes).toBe("Kubernetes: no container work shown");
    expect(runs[0].notes).not.toContain("mentor");
  });
});
