import { describe, expect, it } from "vitest";
import {
  CONTEXTUAL_DETAIL,
  deriveWorkQueue,
  queueCounts,
  queueItemId,
  withStatus,
} from "@/lib/tailorWorkQueue";
import type { RatingsData } from "@/lib/types";

function ratings(overrides: Partial<RatingsData> = {}): RatingsData {
  return {
    match_score: 48,
    criteria: [],
    whats_working: [],
    gaps: [],
    verdict: "Fair",
    overall_score: 48,
    job_title: { matched: false, jd_title: "SWE III", resume_title: "Fullstack", score: 25, detail: "" },
    qualifications: {
      score: 40,
      covered: [],
      missing: [
        { text: "CI/CD pipeline experience", analysis: "No CI/CD mention; bridge from the SOCOM tooling." },
        { text: "Master's degree or PhD", analysis: "MS in CS covers the spirit of this." },
      ],
    },
    responsibilities: {
      score: 55,
      covered: [],
      missing: [{ text: "Improve developer workflows", context: "Closest match: internal IPT tool." }],
    },
    keywords: {
      direct_skills: { found: ["Python"], missing: ["Kubernetes", "Bazel"] },
      contextual: { found: [], missing: ["advertisers", "publishers"] },
      found_count: 63,
      total_count: 69,
    },
    ...overrides,
  };
}

describe("deriveWorkQueue", () => {
  it("flattens all three surfaces into one priority-ordered list", () => {
    const q = deriveWorkQueue(ratings(), new Set());
    expect(q.map((i) => i.kind)).toEqual([
      "qualification", "qualification", "responsibility", "keyword", "keyword",
      "contextual", "contextual",
    ]);
    expect(q.every((i) => i.status === "queued")).toBe(true);
  });

  it("contextual keywords are a separate honesty class, never a rewrite target", () => {
    const q = deriveWorkQueue(ratings(), new Set());
    const ctx = q.filter((i) => i.kind === "contextual");
    expect(ctx.map((i) => i.name)).toEqual(["advertisers", "publishers"]);
    expect(ctx.every((i) => i.detail === CONTEXTUAL_DETAIL)).toBe(true);
  });

  it("items the user already addressed arrive as applied, not queued", () => {
    const q = deriveWorkQueue(ratings(), new Set(["ci/cd pipeline experience"]));
    expect(q.find((i) => i.name === "CI/CD pipeline experience")?.status).toBe("applied");
    expect(q.find((i) => i.name === "Kubernetes")?.status).toBe("queued");
  });

  it("supports the legacy flat keywords shape", () => {
    const legacy = ratings();
    legacy.keywords = { missing: ["Terraform"], found: [], found_count: 1, total_count: 2 };
    const q = deriveWorkQueue(legacy, new Set());
    expect(q.find((i) => i.name === "Terraform")?.kind).toBe("keyword");
  });

  it("returns empty for legacy non-detailed ratings", () => {
    expect(
      deriveWorkQueue(
        { match_score: 50, criteria: [], whats_working: [], gaps: [], verdict: "" },
        new Set(),
      ),
    ).toEqual([]);
  });

  it("dedupes an item that appears in two lists under one id", () => {
    const r = ratings();
    r.keywords!.direct_skills!.missing.push("Kubernetes");
    const q = deriveWorkQueue(r, new Set());
    expect(q.filter((i) => i.id === queueItemId("keyword", "Kubernetes"))).toHaveLength(1);
  });
});

describe("withStatus / queueCounts", () => {
  it("every item ends in an explicit terminal state and the counts agree", () => {
    let q = deriveWorkQueue(ratings(), new Set());
    q = withStatus(q, queueItemId("qualification", "CI/CD pipeline experience"), "applied", "Woven into the SOCOM bullet");
    q = withStatus(q, queueItemId("keyword", "Kubernetes"), "needs_review", "Verify: mirrors the JD, not your history");
    q = withStatus(q, queueItemId("contextual", "advertisers"), "not_coverable", "Employer-domain word");

    const c = queueCounts(q);
    expect(c).toEqual({ total: 7, applied: 1, needsReview: 1, notCoverable: 1, ignored: 0, open: 4 });
    // The reason travels with the state — a skipped item explains itself.
    expect(q.find((i) => i.name === "advertisers")?.detail).toBe("Employer-domain word");
  });

  it("ignored is its own terminal state: counted, out of open, never conflated with not_coverable", () => {
    let q = deriveWorkQueue(ratings(), new Set());
    q = withStatus(q, queueItemId("keyword", "Kubernetes"), "ignored", "Ignored. It stays here if you change your mind.");
    const c = queueCounts(q);
    expect(c.ignored).toBe(1);
    expect(c.notCoverable).toBe(0);
    expect(c.open).toBe(c.total - 1);
  });

  it("withStatus is immutable", () => {
    const q = deriveWorkQueue(ratings(), new Set());
    const next = withStatus(q, q[0].id, "applied");
    expect(q[0].status).toBe("queued");
    expect(next[0].status).toBe("applied");
  });
});
