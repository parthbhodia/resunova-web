import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TailorChangeLog } from "@/components/tailor/TailorChangeLog";
import {
  deriveResumeChanges,
  survivingUnverifiedTerms,
  type ResumeChange,
} from "@/lib/tailorChangeLog";

/**
 * Marking what rests on the candidate's word, after the fix has landed.
 *
 * ⚠️ WHY THIS EXISTS. Aggressive is the default tailoring mode
 * (`DEFAULT_TAILORING_MODE`, founder-directed 2026-10-26): the product WRITES
 * additions the résumé does not evidence rather than dropping them, and the
 * server marks them with `unverified_terms`. The version picker badges them —
 * and that badge disappears the moment the fix is applied. After a bulk pass
 * the change log was the only record left, and it drew a grounded rewrite and
 * one riding on an unevidenced tool identically.
 *
 * Founder, 2026-11-27: "keep it aggressive for real and have them be the judge
 * of it if they want to keep it or not." You cannot judge what you have to
 * open a row to see, which is why the mark is on the COLLAPSED row.
 */

const BULLETS = [
  { originalBullet: "Built and deployed backend services in Python." },
  { originalBullet: "Led the migration of the reporting stack." },
];

function changeFor(overrides: Record<number, string>, action: Record<string, unknown>) {
  return deriveResumeChanges(
    [{ name: "Kubernetes", status: "applied" }] as never,
    [{ label: "Kubernetes", ...action }] as never,
    overrides,
    BULLETS as never,
  );
}

describe("a term the résumé does not back is only claimed while it is there", () => {
  it("keeps a term the applied line still contains", () => {
    expect(survivingUnverifiedTerms(["Kubernetes"], "Shipped it on Kubernetes.")).toEqual([
      "Kubernetes",
    ]);
  });

  /**
   * ⚠️ THE CASE THAT MAKES THIS MORE THAN A PASS-THROUGH. The user can edit a
   * suggestion before applying it, including deleting the very word the server
   * flagged. Carrying the server's list verbatim would then warn about a word
   * that is not in the document — the same false claim the mark exists to
   * prevent, pointing the other way.
   */
  it("drops a term the user edited out before applying", () => {
    expect(survivingUnverifiedTerms(["Kubernetes"], "Shipped it on bare metal.")).toEqual([]);
  });

  it("matches regardless of case and spacing", () => {
    expect(survivingUnverifiedTerms(["CI/CD  pipelines"], "Owned the ci/cd pipelines.")).toEqual([
      "CI/CD  pipelines",
    ]);
  });

  it("never lists the same word twice", () => {
    expect(survivingUnverifiedTerms(["Go", "go", " Go "], "Wrote Go services.")).toEqual(["Go"]);
  });

  it("is empty when the server flagged nothing", () => {
    expect(survivingUnverifiedTerms(undefined, "Anything at all.")).toEqual([]);
  });
});

describe("the derived change carries the mark", () => {
  it("marks a fix whose applied line keeps the unevidenced term", () => {
    const rows = changeFor(
      { 0: "Built and deployed backend services in Python on Kubernetes." },
      { appliedText: "Built and deployed backend services in Python on Kubernetes.", unverifiedTerms: ["Kubernetes"] },
    );
    const row = rows.find((r: ResumeChange) => r.bulletIndex === 0);
    expect(row?.unverifiedTerms).toEqual(["Kubernetes"]);
  });

  it("leaves a grounded fix unmarked", () => {
    const rows = changeFor(
      { 0: "Built and deployed backend services in Python and Django." },
      { appliedText: "Built and deployed backend services in Python and Django." },
    );
    const row = rows.find((r: ResumeChange) => r.bulletIndex === 0);
    expect(row?.unverifiedTerms).toEqual([]);
  });

  /**
   * ⚠️ A hand edit is the user's own words by definition. An override with no
   * queue row behind it has no server mark to carry, and inventing one would
   * warn someone about a sentence they wrote themselves.
   */
  it("never marks a hand edit", () => {
    const rows = deriveResumeChanges(
      [],
      [],
      { 1: "Led the migration of the reporting stack to Kubernetes." },
      BULLETS as never,
    );
    expect(rows[0]?.kind).toBe("edit");
    expect(rows[0]?.unverifiedTerms).toEqual([]);
  });
});

/**
 * ⚠️ A SOURCE PIN, because `ResumeBuilder` is ~7,000 lines and no unit test
 * mounts it. A mutation that stops the apply path putting the terms on the
 * receipt turns nothing red: every layer below still works perfectly on data
 * it never receives, and the mark silently stops appearing. This repo has
 * shipped that exact shape before (the education `onAddEducation` gate, which
 * its own changelog records as "not test-pinned").
 */
describe("the apply path feeds the mark", () => {
  it("puts the applied suggestions' unverified terms on the receipt", () => {
    const src = readFileSync(
      join(process.cwd(), "components/ResumeBuilder.tsx"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""); // comments quote the field; strip them
    expect(src).toMatch(/unverified_terms\s*\?\?\s*\[\]/);
    expect(src).toMatch(/unverifiedTerms:\s*appliedUnverified/);
  });
});

describe("the panel lets you judge without opening the row", () => {
  const MARKED: ResumeChange = {
    key: "bullet:0",
    kind: "fix",
    bulletIndex: 0,
    original: "Built and deployed backend services in Python.",
    applied: "Built and deployed backend services in Python on Kubernetes.",
    requirements: ["Kubernetes"],
    unverifiedTerms: ["Kubernetes"],
  };
  const CLEAN: ResumeChange = { ...MARKED, key: "bullet:1", bulletIndex: 1, unverifiedTerms: [] };

  function draw(changes: ResumeChange[]) {
    render(<TailorChangeLog changes={changes} onUndo={vi.fn()} onSee={vi.fn()} />);
  }

  it("marks the row before it is expanded", () => {
    draw([MARKED]);
    expect(screen.getByTestId("your-word")).toBeInTheDocument();
  });

  it("does not mark a grounded change", () => {
    draw([CLEAN]);
    expect(screen.queryByTestId("your-word")).toBeNull();
  });

  /** "Your word" says a decision is needed; it does not say about what. */
  it("names the exact words once opened", () => {
    draw([MARKED]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByTestId("your-word-detail").textContent).toContain("Kubernetes");
  });
});
