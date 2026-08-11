import { describe, expect, it } from "vitest";
import {
  NO_SCORE_MOVE_NOTE,
  SCORER_ONLY_DETAIL,
  WORDING_DETAIL,
  deriveCoveredQueue,
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

describe("an applied row stops asking to be fixed", () => {
  /**
   * Found by driving the real panel in a browser, not by reasoning about it.
   *
   * Applying a fix moved the keyword count and set the stale flag, and the row
   * went on sitting under "Could get you filtered out" reading "Not evidenced"
   * with a Fix button. `addressedGaps` holds the RAW labels the apply path
   * recorded and every other consumer compares them with the tolerant
   * `gapKeysMatch`; this did an exact `.has(normalizeQueueName(name))`, a
   * different key space, so it never matched. Since the union that is most of
   * the queue.
   */
  it("matches an applied label that was stored raw", () => {
    const [row] = deriveScorerQueue(
      unmatched(["CI/CD pipeline experience"]),
      EMPTY_RATER,
      new Set(["CI/CD pipeline experience"]), // exactly what ResumeBuilder stores
    );
    expect(row.status).toBe("applied");
  });

  it("matches across the drift the rest of the app already tolerates", () => {
    // Same requirement, different casing and spacing: `gapKeysMatch` handles
    // this everywhere else, and the scorer rows must not be the one surface
    // where it does not.
    const [row] = deriveScorerQueue(
      unmatched(["Kubernetes"]),
      EMPTY_RATER,
      new Set(["kubernetes "]),
    );
    expect(row.status).toBe("applied");
  });

  it("leaves an untouched requirement queued", () => {
    const [row] = deriveScorerQueue(
      unmatched(["Terraform"]),
      EMPTY_RATER,
      new Set(["Kubernetes"]),
    );
    expect(row.status).toBe("queued");
  });
});

describe("covered rows are reassurance, and never a second copy of work", () => {
  const RATINGS = {
    qualifications: {
      missing: [],
      covered: [
        { text: "Proficiency in Python", context: "Built ETL in Python at Acme." },
        { text: "Master's degree in CS", context: "MS Computer Science, UMBC." },
      ],
    },
    responsibilities: { missing: [], covered: [{ text: "Own delivery", context: "Led two launches." }] },
    keywords: {},
  };

  it("carries the rater's own evidence rather than an unsupported claim", () => {
    const [row] = deriveCoveredQueue(RATINGS);
    expect(row.status).toBe("covered");
    expect(row.verdict).toBe("covered");
    expect(row.detail).toBe("Built ETL in Python at Acme.");
  });

  it("never promises that closing it moves the number", () => {
    // It is already matched. Saying otherwise is the false promise `movesScore`
    // was added to prevent.
    for (const row of deriveCoveredQueue(RATINGS)) expect(row.movesScore).toBe(false);
  });

  it("drops a requirement the work queue is already showing", () => {
    // Found by a panel test rendering two rows for one requirement. The
    // scorer-unmatched + rater-covered class IS the "Partial match" row, and
    // that requirement is also on the rater's covered list — so without this
    // it appears twice, as work and as reassurance, with opposite verdicts.
    const queued = deriveScorerQueue(
      unmatched(["Proficiency in Python"]),
      raterView(RATINGS),
    );
    expect(queued[0].verdict).toBe("partial");
    const covered = deriveCoveredQueue(RATINGS, queued);
    expect(covered.map((c) => c.name)).not.toContain("Proficiency in Python");
    expect(covered.map((c) => c.name)).toContain("Master's degree in CS");
  });

  it("returns nothing when the rater covered nothing", () => {
    expect(deriveCoveredQueue({ qualifications: { missing: [], covered: [] }, keywords: {} })).toEqual([]);
    expect(deriveCoveredQueue(null)).toEqual([]);
  });
});

/**
 * The reported failure, as data: one résumé listing a Bachelor of Engineering
 * and two Master of Science degrees, against a posting asking for both. The
 * rater filed the bachelor's as covered and the master's as missing, so the
 * page told a man with two master's degrees that he had not evidenced one.
 *
 * The scorer matches by phrase and knows nothing about degree hierarchy, so it
 * reports both unmatched. Nothing downstream consulted the résumé, even though
 * lib/degreeRequirement.ts existed and was tested — it had zero call sites.
 */
/** Degree rows carry `type: "degree"` from extraction, which is what bands them
 *  as a blocker. The generic `unmatched()` helper omits type, so these would
 *  otherwise fall back to `keyword` and not exercise the real path. */
const degreeReqs = (names: string[]): UnmatchedRequirement[] =>
  names.map((canonical, i) => ({ id: `d${i}`, canonical, importance: "required", type: "degree" }));

const RESUME_WITH_DEGREES = [
  "EDUCATION",
  "Monroe Kings Graduate College — Master of Science, AI and Data Science",
  "University of Maryland, Baltimore County — Master of Science, Computer Science",
  "University of Mumbai — Bachelor of Engineering, Information Technology",
].join("\n");

describe("a degree the résumé holds is not a gap", () => {
  const degrees = degreeReqs(["Bachelor's degree", "Master's degree"]);
  // Verbatim from the failing run: the rater disagreed with itself.
  const rater = { missing: ["Master's degree"], covered: ["Bachelor's degree"] };

  it("drops both degree rows when the résumé evidences them", () => {
    const items = deriveScorerQueue(degrees, rater, new Set(), undefined, RESUME_WITH_DEGREES);
    expect(items).toHaveLength(0);
  });

  it("beats the rater, which called the master's missing", () => {
    const items = deriveScorerQueue(degrees, rater, new Set(), undefined, RESUME_WITH_DEGREES);
    expect(items.some((i) => i.name === "Master's degree")).toBe(false);
  });

  it("counts a higher degree as satisfying a lower ask", () => {
    const onlyMasters = "EDUCATION\nMaster of Science, Computer Science";
    const items = deriveScorerQueue(
      degreeReqs(["Bachelor's degree"]), EMPTY_RATER, new Set(), undefined, onlyMasters,
    );
    expect(items).toHaveLength(0);
  });

  /**
   * The control. Without it this suite passes if the code simply drops every
   * credential row, which would hide real gaps instead of fixing a false one.
   */
  it("KEEPS a degree the résumé does not evidence", () => {
    const noDegree = "EXPERIENCE\nSoftware Developer, Tata Communications Ltd.";
    const items = deriveScorerQueue(
      degreeReqs(["Bachelor's degree"]), EMPTY_RATER, new Set(), undefined, noDegree,
    );
    expect(items).toHaveLength(1);
    expect(items[0].verdict).toBe("not_evidenced");
  });

  it("keeps non-credential requirements untouched", () => {
    const items = deriveScorerQueue(
      unmatched(["Golang"]), EMPTY_RATER, new Set(), undefined, RESUME_WITH_DEGREES,
    );
    expect(items).toHaveLength(1);
  });

  /** Version-skew safety: the argument is new, so omitting it must change nothing. */
  it("is byte-identical for callers that pass no résumé", () => {
    expect(deriveScorerQueue(degrees, rater)).toEqual(
      deriveScorerQueue(degrees, rater, new Set(), undefined, ""),
    );
    expect(deriveScorerQueue(degrees, rater)).toHaveLength(2);
  });
});
