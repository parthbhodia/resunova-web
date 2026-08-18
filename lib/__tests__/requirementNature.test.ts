import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { deriveWorkQueue, requirementNature, type QueueItem } from "@/lib/tailorWorkQueue";
import type { RatingsData } from "@/lib/types";
import { SCORER_ONLY_DETAIL, WORDING_DETAIL, deriveScorerQueue } from "@/lib/tailorRequirementQueue";
import { TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";

/**
 * The nature chip (founder-asked 2026-08-15: "add the chips on why language,
 * qualification was needed here"). A row named "Python" and one named
 * "Bachelor's degree" are different kinds of ask, and the extraction already
 * knew which — the queue collected the type and never showed it.
 *
 * The claims pinned here, each the honest half of a pair:
 *  - the chip comes from the requirement's OWN type, never re-derived from
 *    text, and rater rows may claim only their kind;
 *  - `keyword` kind without a type gets NO chip — a bare "Keyword" chip
 *    beside a keyword verdict restates it;
 *  - the type's why LEADS the generic scorer detail, and details that already
 *    lead with their own why (blockers, wording gaps) are untouched;
 *  - the chip is display-only — a span, never a button. The dimension chips
 *    died as a second filter taxonomy; this must not grow back into one.
 */

const EMPTY_RATER = { missing: [], covered: [] };

function typed(canonical: string, type?: string) {
  return { id: `c:${canonical}`, canonical, importance: "required", type };
}

describe("requirementNature", () => {
  it("names both extractor vocabularies", () => {
    // The jobs-pipeline extractor types concepts as language/framework; the
    // tailor extractor uses technical_skill/tool/degree/… — a tailor run
    // started from the Jobs feed carries the former.
    expect(requirementNature("language")?.label).toBe("Language");
    expect(requirementNature("framework")?.label).toBe("Framework");
    expect(requirementNature("technical_skill")?.label).toBe("Skill");
    expect(requirementNature("degree")?.label).toBe("Degree");
  });

  it("falls back to the kind only where the kind says something", () => {
    expect(requirementNature(undefined, "qualification")?.label).toBe("Qualification");
    expect(requirementNature(undefined, "responsibility")?.label).toBe("Duty");
    // A bare "Keyword" chip beside the keyword verdict is a restatement, and
    // the contextual band's own header already labels its rows.
    expect(requirementNature(undefined, "keyword")).toBeNull();
    expect(requirementNature(undefined, "contextual")).toBeNull();
    expect(requirementNature("mystery_type", "keyword")).toBeNull();
  });

  it("carries a why only for types whose row detail does not already lead with one", () => {
    // Credentials lead with BLOCKER_REASON and contextual rows with
    // CONTEXTUAL_DETAIL — one why per row, owned by one branch.
    expect(requirementNature("language")?.why).toMatch(/word for word/i);
    expect(requirementNature("degree")?.why).toBe("");
    expect(requirementNature("soft_skill")?.why).toBe("");
  });
});

describe("the scorer producer stamps nature from the extraction type", () => {
  it("a language row wears Language and its why leads the detail", () => {
    const [row] = deriveScorerQueue([typed("Python", "language")], EMPTY_RATER);
    expect(row.nature).toBe("Language");
    expect(row.detail.startsWith("The posting names this language")).toBe(true);
    // The benefit copy survives after the why — the score claim is coupled to
    // movesScore and these rows all carry it.
    expect(row.detail).toContain(SCORER_ONLY_DETAIL);
  });

  it("an untyped scorer keyword row is byte-identical to before", () => {
    const [row] = deriveScorerQueue([typed("Terraform")], EMPTY_RATER);
    expect(row.nature).toBeUndefined();
    expect(row.detail).toBe(SCORER_ONLY_DETAIL);
  });

  it("a wording gap keeps WORDING_DETAIL unstacked but still wears its chip", () => {
    const [row] = deriveScorerQueue(
      [typed("Go", "language")],
      { missing: [], covered: ["Go"] },
    );
    expect(row.nature).toBe("Language");
    expect(row.detail).toBe(WORDING_DETAIL);
  });

  it("a credential row keeps its BLOCKER_REASON lead, never a second why", () => {
    const [row] = deriveScorerQueue([typed("Bachelor's degree", "degree")], EMPTY_RATER);
    expect(row.nature).toBe("Degree");
    expect(row.detail.startsWith("A degree is usually a yes/no question")).toBe(true);
  });
});

describe("the rater producer claims only its kind", () => {
  function ratings(): RatingsData {
    return {
      match_score: 48,
      criteria: [],
      whats_working: [],
      gaps: [],
      verdict: "Fair",
      overall_score: 48,
      job_title: { matched: false, jd_title: "SWE", resume_title: "Dev", score: 25, detail: "" },
      qualifications: {
        score: 40,
        covered: [],
        missing: [{ text: "5 years of Go", analysis: "x" }],
      },
      responsibilities: { score: 55, covered: [], missing: [{ text: "Improve workflows", context: "x" }] },
      keywords: {
        direct_skills: { found: [], missing: ["Kubernetes"] },
        contextual: { found: [], missing: ["advertisers"] },
        found_count: 1,
        total_count: 2,
      },
    } as RatingsData;
  }

  it("qualification → Qualification, responsibility → Duty, keyword rows bare", () => {
    const q = deriveWorkQueue(ratings(), new Set());
    const byKind = (k: string) => q.find((it) => it.kind === k);
    expect(byKind("qualification")?.nature).toBe("Qualification");
    expect(byKind("responsibility")?.nature).toBe("Duty");
    expect(byKind("keyword")?.nature).toBeUndefined();
    expect(byKind("contextual")?.nature).toBeUndefined();
  });
});

describe("the chip on screen", () => {
  const rows: QueueItem[] = [
    { id: "k:python", name: "Python", kind: "keyword", status: "queued", detail: "d", nature: "Language" },
    { id: "k:bare", name: "Terraform", kind: "keyword", status: "queued", detail: "d" },
  ];

  it("renders the nature as a quiet span, and only where one was stamped", () => {
    render(
      React.createElement(TailorWorkQueue, { items: rows, onFixAll: vi.fn(), fixAllBusy: false }),
    );
    const chip = screen.getByText("Language");
    expect(chip).toBeInTheDocument();
    // Display-only: never a button, never pressable — the dimension chips
    // died as a second filter taxonomy and this must not regrow into one.
    expect(chip.closest("button")).toBeNull();
    expect(screen.queryByRole("button", { name: "Language" })).toBeNull();
    // The bare row grew no chip.
    expect(document.querySelectorAll("[data-nature-chip]")).toHaveLength(1);
  });
});
