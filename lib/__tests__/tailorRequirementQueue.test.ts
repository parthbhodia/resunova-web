import { describe, expect, it } from "vitest";
import {
  NO_SCORE_MOVE_NOTE,
  SCORER_ONLY_DETAIL,
  WORDING_DETAIL,
  deriveScorerQueue,
  mergeQueues,
  raterView,
  sameRequirement,
  scoreMovingCount,
  type UnmatchedRequirement,
} from "@/lib/tailorRequirementQueue";
import { deriveWorkQueue } from "@/lib/tailorWorkQueue";

/**
 * The reported failure, as data: a scan reporting 24 requirements with 9
 * matched, next to a rater that named three gaps. Fifteen requirements are
 * unmatched; three rows were offered.
 */
const unmatched = (names: string[]): UnmatchedRequirement[] =>
  names.map((canonical, i) => ({ id: `c${i}`, canonical, importance: "required" }));

const EMPTY_RATER = { missing: [] as string[], covered: [] as string[] };

describe("the scorer's unmatched set reaches the queue", () => {
  it("produces a row for every unmatched requirement, not just the rater's few", () => {
    // This is the whole bug: 15 unmatched, 3 rater gaps, 3 rows shown.
    const fifteen = unmatched(
      Array.from({ length: 15 }, (_, i) => `requirement number ${i + 1}`),
    );
    const rater = {
      missing: ["requirement number 1", "requirement number 2", "requirement number 3"],
      covered: [],
    };
    expect(deriveScorerQueue(fifteen, rater)).toHaveLength(15);
  });

  it("marks a requirement both pipelines flagged as coming from both", () => {
    const items = deriveScorerQueue(unmatched(["Kubernetes orchestration"]), {
      missing: ["Kubernetes orchestration"],
      covered: [],
    });
    expect(items[0].source).toBe("both");
  });

  it("separates a wording gap from a real one", () => {
    // The résumé demonstrates it; the matcher cannot see it. Telling this user
    // they "lack" the requirement would be false, and the fix is different.
    const items = deriveScorerQueue(unmatched(["continuous integration"]), {
      missing: [],
      covered: ["continuous integration"],
    });
    expect(items[0].source).toBe("scorer");
    expect(items[0].detail).toBe(WORDING_DETAIL);
  });

  it("treats a requirement in neither rater list as simply absent", () => {
    const items = deriveScorerQueue(unmatched(["Terraform"]), EMPTY_RATER);
    expect(items[0].detail).toBe(SCORER_ONLY_DETAIL);
  });

  it("lets missing win when the rater filed the same requirement both ways", () => {
    // A rater that says both has told us nothing; the gap claim is the one that
    // must survive, or a real gap gets described as a wording problem.
    const items = deriveScorerQueue(unmatched(["data modeling"]), {
      missing: ["data modeling"],
      covered: ["data modeling"],
    });
    expect(items[0].source).toBe("both");
    expect(items[0].detail).toBe(SCORER_ONLY_DETAIL);
  });

  it("says every unmatched row moves the number, because it does", () => {
    const items = deriveScorerQueue(unmatched(["a", "bbbbbbb"]), EMPTY_RATER);
    expect(items.every((it) => it.movesScore)).toBe(true);
  });

  it("carries an already-addressed requirement in as applied", () => {
    const items = deriveScorerQueue(
      unmatched(["Kubernetes"]),
      EMPTY_RATER,
      new Set(["kubernetes"]),
    );
    expect(items[0].status).toBe("applied");
  });

  it("drops blank and duplicate concepts rather than rendering empty rows", () => {
    const items = deriveScorerQueue(
      [
        { id: "a", canonical: "Airflow" },
        { id: "b", canonical: "  " },
        { id: "c", canonical: "airflow" },
      ],
      EMPTY_RATER,
    );
    expect(items.map((it) => it.name)).toEqual(["Airflow"]);
  });
});

describe("joining the two lists", () => {
  it("merges wordings that clearly name the same requirement", () => {
    expect(sameRequirement("Kubernetes", "kubernetes")).toBe(true);
    expect(sameRequirement("Kubernetes", "Kubernetes orchestration at scale")).toBe(true);
  });

  it("refuses to merge on a short token", () => {
    // Without the length floor, "R" or "API" swallows most of the JD and the
    // wrong evidence prints under the wrong requirement.
    expect(sameRequirement("R", "Ruby on Rails")).toBe(false);
    expect(sameRequirement("API", "rapid prototyping")).toBe(false);
  });

  it("keeps genuinely different requirements apart", () => {
    expect(sameRequirement("Python", "PostgreSQL")).toBe(false);
  });
});

describe("merging scorer rows with rater rows", () => {
  const scorer = deriveScorerQueue(unmatched(["Kubernetes"]), EMPTY_RATER);
  const raterOnly = [
    {
      id: "qualification:five years of python",
      name: "five years of Python",
      kind: "qualification" as const,
      status: "queued" as const,
      detail: "You show Python once.",
    },
  ];

  it("puts the rows that move the number first", () => {
    const merged = mergeQueues(scorer, raterOnly);
    expect(merged[0].name).toBe("Kubernetes");
  });

  it("keeps a rater gap the scorer counts as matched", () => {
    // A term appearing once satisfies the matcher but not the claim. Dropping
    // these to make the two lists agree would delete real signal.
    const merged = mergeQueues(scorer, raterOnly);
    expect(merged.map((it) => it.name)).toContain("five years of Python");
  });

  it("says plainly that a rater-only row will not move the percentage", () => {
    const merged = mergeQueues(scorer, raterOnly);
    const row = merged.find((it) => it.name === "five years of Python")!;
    expect(row.movesScore).toBe(false);
    expect(row.detail).toContain(NO_SCORE_MOVE_NOTE);
  });

  it("shows one requirement once, not twice under two wordings", () => {
    const merged = mergeQueues(scorer, [
      { ...raterOnly[0], id: "qualification:kubernetes", name: "Kubernetes" },
    ]);
    expect(merged).toHaveLength(1);
  });

  it("counts only the open rows that move the number", () => {
    const merged = mergeQueues(
      [
        ...deriveScorerQueue(unmatched(["Kubernetes", "Terraform"]), EMPTY_RATER),
        ...deriveScorerQueue(unmatched(["Airflow"]), EMPTY_RATER, new Set(["airflow"])),
      ],
      raterOnly,
    );
    // Two open + one applied + one rater-only that cannot move it.
    expect(scoreMovingCount(merged)).toBe(2);
  });
});

describe("reading the rater payload", () => {
  it("collects missing and covered across both requirement blocks", () => {
    const view = raterView({
      qualifications: {
        missing: [{ text: "Kubernetes" }],
        covered: [{ text: "Python" }],
      },
      responsibilities: {
        missing: [{ text: "on-call rotation" }],
        covered: [{ text: "code review" }],
      },
    });
    expect(view.missing).toEqual(["Kubernetes", "on-call rotation"]);
    expect(view.covered).toEqual(["Python", "code review"]);
  });

  it("survives the shapes the rater actually emits", () => {
    // Production crashed on a non-string `text`; this payload is deliberately
    // ugly. One bad item must cost that item, never the report.
    const view = raterView({
      qualifications: { missing: ["bare string", { text: 42 }, null, { text: "ok" }] },
      responsibilities: null,
    });
    expect(view.missing).toEqual(["bare string", "ok"]);
    expect(view.covered).toEqual([]);
  });

  it("returns empty views for junk instead of throwing", () => {
    expect(raterView(null).missing).toEqual([]);
    expect(raterView("nonsense").covered).toEqual([]);
  });
});

describe("the end-to-end shape of the reported bug", () => {
  it("turns a 3-row queue into one that accounts for every unmatched requirement", () => {
    const ratings = {
      overall_score: 38,
      job_title: { matched: false, jd_title: "Data Engineer", resume_title: "Analyst", score: 40 },
      qualifications: {
        missing: [{ text: "Kubernetes", analysis: "No container work shown." }],
        covered: [{ text: "Python" }],
      },
      responsibilities: {
        missing: [{ text: "mentor engineers", analysis: "No mentoring shown." }],
        covered: [],
      },
      keywords: { direct_skills: { missing: ["Terraform"] }, contextual: { missing: [] } },
    };
    const raterRows = deriveWorkQueue(ratings as never, new Set());
    expect(raterRows).toHaveLength(3); // the queue as it shipped

    const scorerRows = deriveScorerQueue(
      unmatched(["Kubernetes", "Terraform", "Airflow", "Snowflake", "dbt", "data modeling"]),
      raterView(ratings),
    );
    const merged = mergeQueues(scorerRows, raterRows);

    // Six scored requirements plus the one rater gap the scorer cannot see.
    expect(merged).toHaveLength(7);
    expect(merged.map((it) => it.name)).toContain("mentor engineers");
    expect(scoreMovingCount(merged)).toBe(6);
  });
});

describe("banding comes from the requirement's own type", () => {
  /** One requirement carrying an extraction type. */
  const typed = (canonical: string, type: string): UnmatchedRequirement =>
    ({ id: `t:${canonical}`, canonical, importance: "required", type });

  it("does not file every row under one heading", () => {
    // These shipped all-qualification, so a degree, a tool and a soft skill
    // landed in the same band under "Could get you filtered out". Nineteen
    // equally-urgent blockers is not a priority order, and it erased the one
    // thing the headers exist to say: these are different problems.
    const rows = deriveScorerQueue(
      [
        typed("MS in Computer Science", "degree"),
        typed("Terraform", "tool"),
        typed("excellent communication", "soft_skill"),
      ],
      EMPTY_RATER,
    );
    expect(rows.map((r) => r.kind)).toEqual(["qualification", "keyword", "contextual"]);
  });

  it("bands credentials and tenure as blockers", () => {
    for (const t of ["degree", "certification", "license", "experience"]) {
      expect(deriveScorerQueue([typed("x y z", t)], EMPTY_RATER)[0].kind)
        .toBe("qualification");
    }
  });

  it("bands named skills, tools and duties as keywords", () => {
    for (const t of ["technical_skill", "tool", "responsibility"]) {
      expect(deriveScorerQueue([typed("x y z", t)], EMPTY_RATER)[0].kind)
        .toBe("keyword");
    }
  });

  it("falls back to keyword, not to the loudest band", () => {
    // The old default was qualification, so any type nobody had thought about
    // shouted. A wrong quiet default costs less than a wrong loud one, and a
    // backend predating the field sends no type at all.
    expect(deriveScorerQueue([typed("x y z", "something_new")], EMPTY_RATER)[0].kind)
      .toBe("keyword");
    expect(deriveScorerQueue(unmatched(["no type at all"]), EMPTY_RATER)[0].kind)
      .toBe("keyword");
  });

  it("gives a contextual row the explainer, not a to-do", () => {
    // "The scanner did not find this" reads as work to do. For an employer
    // domain word, writing it in is usually the wrong move.
    const [row] = deriveScorerQueue([typed("fintech domain", "domain_knowledge")], EMPTY_RATER);
    expect(row.kind).toBe("contextual");
    expect(row.detail).not.toBe(SCORER_ONLY_DETAIL);
  });

  it("keeps the posting's order rather than regrouping by band", () => {
    // The server preserves extraction order on purpose; grouping happens at
    // render time, so this list must not be resorted on the way through.
    const rows = deriveScorerQueue(
      [typed("Terraform", "tool"), typed("PhD", "degree"), typed("Airflow", "tool")],
      EMPTY_RATER,
    );
    expect(rows.map((r) => r.name)).toEqual(["Terraform", "PhD", "Airflow"]);
  });
});

describe("the merge combines the two lists rather than discarding one", () => {
  it("keeps the rater's filing when extraction sent no type", () => {
    // Found by a panel test going red, not by reasoning. The merge keeps the
    // SCORER's row and drops the rater's for a requirement on both lists, so
    // an untyped scorer row was demoting a requirement the rater had filed as
    // a qualification down to a keyword — the merge losing information it was
    // supposed to be combining.
    const ratings = {
      qualifications: { missing: [{ text: "Kubernetes" }], covered: [] },
      responsibilities: { missing: [{ text: "mentor engineers" }], covered: [] },
      keywords: {},
    };
    const rows = deriveScorerQueue(
      unmatched(["Kubernetes", "mentor engineers"]), // no `type` on either
      raterView(ratings),
    );
    expect(rows.map((r) => r.kind)).toEqual(["qualification", "responsibility"]);
  });

  it("lets extraction's type win over where the rater filed it", () => {
    // `type` is a claim about what the requirement IS; the rater's list is only
    // which side of its comparison it wrote the item under.
    const ratings = {
      qualifications: { missing: [{ text: "Terraform" }], covered: [] },
      responsibilities: { missing: [], covered: [] },
      keywords: {},
    };
    const [row] = deriveScorerQueue(
      [{ id: "c0", canonical: "Terraform", importance: "required", type: "tool" }],
      raterView(ratings),
    );
    expect(row.kind).toBe("keyword");
  });
});
