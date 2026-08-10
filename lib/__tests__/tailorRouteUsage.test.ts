import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { TAILOR_ROUTE, tailorHref } from "@/lib/tailorRoute";

/**
 * No hand-rolled tailor URLs.
 *
 * Fourteen call sites each invented `/?view=builder&flow=tailor`, so shipping
 * the redesign behind a new route left it reachable from two of them. That is
 * not fourteen oversights, it is one structural problem, and patching the
 * fourteen guarantees a fifteenth — the same argument that produced
 * `apiFetch()` and the test that pins it.
 *
 * Written to fail if anyone reintroduces a literal.
 */

const ROOTS = ["components", "lib", "hooks", "app"];
const SKIP_FILES = new Set(["tailorRoute.ts", "tailorRouteUsage.test.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e === ".next") continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e) && !SKIP_FILES.has(e)) out.push(full);
  }
  return out;
}

/** A NAVIGATION to the tailor flow, not prose about it. */
const LITERAL = /(?:href|push|replace|ctaHref)\s*[=(]\s*[`"']\/\?view=builder/;

describe("every route into Tailor goes through tailorHref()", () => {
  it("has no hand-rolled tailor URL anywhere", () => {
    const offenders: string[] = [];
    for (const file of ROOTS.flatMap((r) => walk(r))) {
      const src = readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        if (LITERAL.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    // AppShell keeps ONE literal for non-tailor flows; `flow=tailor` is
    // branched off above it. Anything else is a new hardcoded destination.
    //
    // `join()` emits the platform separator, so the exemption has to compare
    // on a normalised path: with a raw `startsWith("components/AppShell.tsx")`
    // this passed on CI and failed on every Windows checkout, which teaches a
    // developer that a red local suite is normal — exactly how the uiCopyStyle
    // failure went unnoticed for two weeks.
    const normalised = offenders.map((o) => o.split(sep).join("/"));
    expect(normalised.filter((o) => !o.startsWith("components/AppShell.tsx"))).toEqual([]);
  });

  it("points at the redesign, not the classic surface", () => {
    // If this ever flips back, every entry point flips with it — which is the
    // whole point of there being one.
    expect(TAILOR_ROUTE).toBe("/tailor-2/");
    expect(tailorHref()).toBe("/tailor-2/?flow=tailor");
  });

  it("carries the params the receiving flow reads", () => {
    expect(tailorHref({ intentJob: true })).toContain("intent=job");
    expect(tailorHref({ base: "my folder" })).toContain("base=my+folder");
    expect(tailorHref({ fromAnalyze: true })).toContain("fromAnalyze=1");
    // flow stays explicit: a URL that says what it does survives being pasted
    // into a bug report.
    expect(tailorHref({ intentJob: true })).toContain("flow=tailor");
  });
});
