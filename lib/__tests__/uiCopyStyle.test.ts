import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Keeps em dashes out of user-facing copy.
 *
 * A count baseline rather than a file allowlist: there are still several
 * hundred across the marketing pages and long-form blog posts, and enumerating
 * 100+ files would be unreadable. The contract is the same as the lint ratchet
 * — copy may not get worse, and the number comes down as files are cleaned.
 *
 * Comments are stripped first. An em dash in a code comment is invisible to
 * users, and counting them would drown the real signal by roughly 3:1.
 *
 * See the "Writing UI copy" section of AGENTS.md.
 */

const ROOTS = ["components", "app", "lib", "hooks", "store"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "__tests__", "__snapshots__"]);

/** Surfaces already swept. Adding a dash to one of these fails the build. */
const CLEAN_SURFACES = [
  "components/app-shell",
  "components/ratings",
  "components/AuthGate.tsx",
  "components/TailoringModeModal.tsx",
];

/**
 * Total allowed elsewhere. Lower it whenever you clean a file; never raise it.
 *
 * 353 after the original tooltip/label/placeholder sweep (down from 420), then
 * re-measured to 366: the resume-examples and nav work (#176, #179) landed on
 * main between the sweep and the merge, bringing new pages with them. The
 * number moved because more app arrived, not because a change regressed it —
 * which is the ONLY reason to ever raise this. A PR that adds dashes to
 * existing copy still fails.
 *
 * Biggest remaining: LandingPage, ResumeBuilder, the tailor blog post,
 * competitorComparison, and the new resume-examples pages.
 */
const BASELINE = 345;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Remove block, JSX and line comments so only user-visible text is counted. */
function stripComments(src: string): string {
  // Normalise line endings FIRST. `.` in a JS regex does not match a carriage
  // return (it is a line terminator), so on a CRLF checkout the trailing-line
  // comment strip below cannot reach end-of-string and a trailing `//` comment
  // survives, and its em dashes get counted. That is exactly what the docblock
  // at the top of this file says must not happen, and it made the assertion
  // platform-dependent: 345 in CI, 359 on a Windows clone of the SAME commit.
  // A test that only fails on one platform teaches developers to ignore a red
  // suite, which is how a real failure hides.
  const withoutBlocks = src
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlocks
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/**
 * Spaced em/en dash used as a connector. Excludes decorative box-drawing rules
 * (── section ──) and the bare "—" empty-value placeholder, which is a single
 * token rather than a connector between words.
 */
const PROSE_DASH = /[^\s─-╿][  ][—–][  ][^\s─-╿]/g;

function countIn(file: string): number {
  return (stripComments(readFileSync(file, "utf8")).match(PROSE_DASH) ?? []).length;
}

const FILES = ROOTS.flatMap((r) => walk(r));

describe("UI copy style", () => {
  it("counts the same on CRLF and LF checkouts", () => {
    // The bug this pins: `.` never matches a carriage return, so on Windows a
    // TRAILING `//` comment survived stripping and its em dash was counted.
    // Verbatim from lib/clientCache.ts, the line that first exposed it.
    const line = "      if (!hit.stale) return; // fresh enough — no network at all";
    const lf = line + String.fromCharCode(10);
    const crlf = line + String.fromCharCode(13) + String.fromCharCode(10);
    const count = (src: string) =>
      (stripComments(src).match(PROSE_DASH) ?? []).length;

    expect(count(lf)).toBe(0);          // a comment dash is invisible to users
    expect(count(crlf)).toBe(count(lf)); // and must stay invisible on Windows
  });

  it("finds source files to check", () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it("keeps already-swept surfaces free of em dashes in copy", () => {
    const offenders = FILES
      .filter((f) => CLEAN_SURFACES.some((s) => f.startsWith(s)))
      .map((f) => [f, countIn(f)] as const)
      .filter(([, n]) => n > 0);
    expect(offenders).toEqual([]);
  });

  it("does not let the rest of the app get worse", () => {
    const total = FILES.reduce((n, f) => n + countIn(f), 0);
    expect(total).toBeLessThanOrEqual(BASELINE);
  });

  it("leaves the two legitimate typographic uses alone", () => {
    // A bare em dash standing in for an empty value, and en dashes in ranges,
    // are correct typography and must not be swept.
    expect('company || "—"'.match(PROSE_DASH)).toBeNull();
    expect("May 2022 – Present".match(PROSE_DASH)).toHaveLength(1); // spaced range still counts
    expect("p25–p75".match(PROSE_DASH)).toBeNull();
  });
});
