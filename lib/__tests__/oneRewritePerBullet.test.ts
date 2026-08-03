import { describe, expect, it } from "vitest";
import { keepFirstRewritePerBullet } from "@/lib/fixEverything";

/**
 * The reported damage, as data.
 *
 * Every run in a pass sees the same pristine résumé, so several runs return a
 * rewrite of the SAME bullet. The apply path fuzzy-matches on `original`; once
 * the first has replaced that line the second no longer matches and gets
 * appended instead. One bullet ended up carrying three copies of its own tail
 * and the résumé ran 533px past page one.
 */

const BULLET =
  "Built an AI-powered resume builder with a Python backend that tailors resumes to job descriptions.";

describe("a bullet is spent once it has been rewritten", () => {
  it("keeps one rewrite and drops the rest for the same line", () => {
    const { kept } = keepFirstRewritePerBullet(
      [
        { original: BULLET, suggested: `${BULLET} Using rule-based heuristics.` },
        { original: BULLET, suggested: `${BULLET} Contributed to documentation.` },
        { original: BULLET, suggested: `${BULLET} Ensuring WCAG 2.1 AA criteria.` },
      ],
      new Set(),
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].suggested).toContain("rule-based heuristics");
  });

  it("carries the spent bullets forward across runs", () => {
    // The pass is a loop of separate requests; the guard is only useful if the
    // set threads through it.
    const first = keepFirstRewritePerBullet([{ original: BULLET, suggested: "A" }], new Set());
    const second = keepFirstRewritePerBullet([{ original: BULLET, suggested: "B" }], first.used);
    expect(second.kept).toHaveLength(0);
  });

  it("leaves rewrites of different bullets alone", () => {
    const { kept } = keepFirstRewritePerBullet(
      [
        { original: "Bullet one.", suggested: "Bullet one, extended." },
        { original: "Bullet two.", suggested: "Bullet two, extended." },
      ],
      new Set(),
    );
    expect(kept).toHaveLength(2);
  });

  it("matches the same line written with different whitespace or case", () => {
    const { kept } = keepFirstRewritePerBullet(
      [
        { original: "Led   design REVIEWS.", suggested: "a" },
        { original: "led design reviews.", suggested: "b" },
      ],
      new Set(),
    );
    expect(kept).toHaveLength(1);
  });

  it("drops a suggestion with no original rather than letting it append", () => {
    // Nothing to match means the apply path grows the résumé from nowhere.
    const { kept } = keepFirstRewritePerBullet(
      [{ original: "", suggested: "an orphan clause" }, { original: "  ", suggested: "another" }],
      new Set(),
    );
    expect(kept).toHaveLength(0);
  });

  it("does not mutate the set it was given", () => {
    const used = new Set<string>();
    keepFirstRewritePerBullet([{ original: BULLET, suggested: "x" }], used);
    expect(used.size).toBe(0);
  });
});
