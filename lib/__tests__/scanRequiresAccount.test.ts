import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nothing user-visible may promise a scan without an account.
 *
 * Scanning requires signing in (founder decision, 2026-09-10). The marketing
 * surface was built on the opposite promise and said so in eleven places — the
 * landing hero, its CTA micro-copy, the announcement banner, a job-detail CTA,
 * five blog call-to-actions and the home page's own meta description. Shipping
 * the gate while any of those survived would be a false claim on the pages that
 * bring people here, which is the same defect class as the phantom "CV layout"
 * the template gallery once advertised.
 *
 * WHY AN EXACT SET RATHER THAN A COUNT: several claims are still TRUE, because
 * the template builder, the template gallery and browsing examples genuinely
 * need no sign-up. A budget would let a new false claim replace a true one and
 * stay green. Every no-account claim in the tree therefore has to appear below
 * WITH A REASON, and anything else fails — so adding one forces the author to
 * say which surface it is about.
 *
 * "No credit card" is deliberately NOT matched: it is true on every surface,
 * paid or free, and matching it would bury the signal.
 */

const ROOTS = ["components", "app", "lib", "hooks", "store"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "__tests__", "__snapshots__"]);

/** A claim that something needs no account. Excludes "no credit card". */
const NO_ACCOUNT_CLAIM = /\bno[\s-]+(?:account|sign[-\s]?up|signup|login)\b/i;

/**
 * The claims that are true, and why.
 *
 * Keyed by the trimmed source line so a REWORDING has to be re-justified rather
 * than inheriting an old file's exemption.
 */
const TRUE_CLAIMS: Array<{ line: string; because: string }> = [
  {
    line: `title: "Free Resume Templates & Builder — No Sign-Up Required",`,
    because: "the template builder, which needs no account and never scans",
  },
  {
    line: `"Build and download a professional ATS-friendly resume PDF for free — no sign-up required.",`,
    because: "same page: building and downloading a PDF, not scanning",
  },
  {
    line: `"Browse free ATS-friendly resume templates and open any of them in the builder with one click. No sign-up required.",`,
    because: "/templates browses and opens the builder",
  },
  {
    line: "description: `Browse ${TOTAL_RESUME_EXAMPLES}+ real, scored resume examples across ${TOTAL_RESUME_CATEGORIES} careers, each built from the skills employers actually ask for. Free to tailor your own — no sign-up required.`,",
    because: "browsing examples and opening them in the builder",
  },
  {
    line: `{ value: "Free", label: "no sign-up to browse" },`,
    because: "browsing the examples marketplace",
  },
  {
    line: "Score your resume, tailor it to a job description, and download an ATS-friendly PDF (all free, no sign-up",
    because: "already scoped on the next line to 'for the template builder'",
  },
  {
    line: '? "Opens the example above in the résumé builder with your own name and contact details left blank. Replace the sample experience with yours, pick a template, and download an ATS-clean PDF. Free, no signup."',
    because: "opens the builder from a role example; no scan involved",
  },
  {
    line: ": `Opens the résumé builder with the skills most requested in ${role.label.toLowerCase()} postings already lined up. Add your own experience, pick a template, and download an ATS-clean PDF. Free, no signup.`}",
    because: "same CTA, the no-example branch",
  },
  {
    line: 'resunova: "Free template builder, no sign-up required",',
    because: "comparison table row about the template builder",
  },
  {
    line: 'resunova: "Free template builder, ATS-friendly PDF, no watermark, no sign-up required",',
    because: "comparison table row about the template builder",
  },
  {
    line: 'resunova: "Free template builder, ATS-friendly PDF, no sign-up required",',
    because: "comparison table row about the template builder",
  },
  {
    line: 'resunova: "Free template builder with ATS-safe layouts, no sign-up required",',
    because: "comparison table row about the template builder",
  },
  {
    line: `a: "Yes. The Template Builder creates an ATS-safe resume from a blank start, no existing PDF required, and it's free with no sign-up needed to try it.",`,
    because: "FAQ answer naming the Template Builder explicitly",
  },
];

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

/** Drop comments: an explanation of the rule is not a claim made to a user. */
function stripComments(src: string): string {
  const withoutBlocks = src
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlocks
    .split("\n")
    .map((line) => (/^\s*(\/\/|\*)/.test(line) ? "" : line.replace(/\/\/.*$/, "")))
    .join("\n");
}

function claimsInTree(): Array<{ file: string; line: string }> {
  const found: Array<{ file: string; line: string }> = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      for (const raw of lines) {
        const line = raw.trim();
        if (NO_ACCOUNT_CLAIM.test(line)) found.push({ file, line });
      }
    }
  }
  return found;
}

describe("no user-visible copy promises a scan without an account", () => {
  it("every no-account claim in the tree is a declared, true one", () => {
    const declared = new Set(TRUE_CLAIMS.map((c) => c.line));
    const undeclared = claimsInTree().filter((c) => !declared.has(c.line));

    expect(
      undeclared.map((c) => `${c.file}: ${c.line}`),
      "A no-account claim that is not declared in TRUE_CLAIMS. Scanning requires "
        + "an account, so either fix the copy or, if the claim is about the "
        + "template builder / browsing, add it above with the reason.",
    ).toEqual([]);
  });

  it("the regex it relies on actually matches the claims it is guarding against", () => {
    // A guard whose pattern cannot see the thing it forbids is indistinguishable
    // from a clean tree — these are the exact strings that used to ship.
    for (const claim of [
      "AI bullet rewrites + 8-dimension résumé scoring. No account needed. Start free.",
      "Start free · No account to scan · ATS-safe",
      "No account needed to scan · Sign in only to save your analysis",
      "free, no account needed.",
      "Free — no signup required to start.",
      "no account needed for the first scan.",
      "no signup for your first scan.",
      "Start with no account.",
    ]) {
      expect(NO_ACCOUNT_CLAIM.test(claim), claim).toBe(true);
    }
  });

  it("does not match a no-credit-card claim, which stays true everywhere", () => {
    expect(NO_ACCOUNT_CLAIM.test("Free · no credit card")).toBe(false);
    expect(NO_ACCOUNT_CLAIM.test("No credit card to scan.")).toBe(false);
  });

  it("every declared claim still exists, so the list cannot rot", () => {
    const present = new Set(claimsInTree().map((c) => c.line));
    const missing = TRUE_CLAIMS.filter((c) => !present.has(c.line)).map((c) => c.line);
    expect(missing, "declared as a true claim but no longer in the tree — delete it").toEqual([]);
  });
});
