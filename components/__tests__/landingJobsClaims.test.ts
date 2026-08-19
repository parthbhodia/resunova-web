import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { JOBS_ENABLED } from "@/lib/featureFlags";

/**
 * The landing page carried three hardcoded claims about the size of the jobs
 * board: "250k+ Jobs on the board" in the hero ticker, "250,000+ jobs on the
 * board - refreshed daily" in the Jobs band, and a "Browse 250,000+ jobs" CTA.
 *
 * Every one was a string literal. Nothing computed them, nothing rechecked
 * them, and the corpus they described stopped being refreshed when the
 * extraction worker was stopped -- so "refreshed daily" was false on the page
 * while it was being served.
 *
 * Worse, the band's CTA navigated to `/?view=jobs`, which JOBS_ENABLED now
 * routes to the Home dashboard. A visitor read "A job board that reads your
 * resume", pressed a button promising 250,000 jobs, and landed somewhere with
 * no jobs on it. Hiding the nav entry is not the same as retiring the pitch.
 *
 * Two invariants, and the first deliberately does NOT lift when Jobs returns:
 * a count that is wrong today is still wrong after the flag flips, so gating
 * it would hide the problem rather than fix it. Re-earning that sentence means
 * computing the number from the corpus, not retyping a literal.
 */

const SRC = readFileSync(join(process.cwd(), "components/LandingPage.tsx"), "utf8");

/** The [stat, label] pairs rendered by the hero ticker. */
function tickerStats(): Array<[string, string]> {
  const start = SRC.indexOf("[...Array(4)].flatMap");
  expect(start, "the landing stats ticker should exist").toBeGreaterThan(-1);
  const end = SRC.indexOf("]).map(", start);
  expect(end, "the ticker array should be closed").toBeGreaterThan(start);
  return [...SRC.slice(start, end).matchAll(/\[\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\]/g)].map(
    (m) => [m[1], m[2]] as [string, string],
  );
}

/**
 * Words that turn a ticker label into a claim about how many postings we hold.
 * "Job seekers so far" is deliberately NOT caught: that counts our users, which
 * is a number we can actually source.
 */
const BOARD_SIZE_CLAIM = /\b(board|postings?|listings?|openings?)\b/i;

describe("landing jobs claims", () => {
  it("still renders a stats ticker", () => {
    // Guards the assertion below: an empty parse would pass it vacuously.
    expect(tickerStats().length).toBeGreaterThan(3);
  });

  it("counts users in the ticker, never postings", () => {
    const stats = tickerStats();
    expect(stats.some(([, label]) => /seekers/i.test(label))).toBe(true);
    expect(stats.filter(([, label]) => BOARD_SIZE_CLAIM.test(label))).toEqual([]);
  });

  it("states no hardcoded corpus size, gated or not", () => {
    // Case-INSENSITIVE on purpose. The second occurrence was lower-case, and a
    // case-sensitive search reported the page clean while the claim was still
    // being served.
    expect(SRC).not.toMatch(/jobs on the board/i);
    expect(SRC).not.toMatch(/refreshed daily/i);
    // Any big round figure sitting next to a jobs noun, however it is worded.
    expect(SRC).not.toMatch(/\d[\d,.]*\s*k?\+\s*(jobs|postings|listings|openings)\b/i);
  });

  it("renders the jobs band only when the jobs board is enabled", () => {
    // The band's CTA goes to `/?view=jobs`, which falls through to the Home
    // dashboard while the flag is off. Ungated, it is a promise the app cannot
    // keep.
    expect(SRC).toMatch(/\{JOBS_ENABLED && <JobsBand/);
    expect(SRC).not.toMatch(/(?<!JOBS_ENABLED && )<JobsBand C=/);
  });
});
