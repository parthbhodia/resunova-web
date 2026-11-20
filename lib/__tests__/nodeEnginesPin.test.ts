/**
 * `engines.node` must have an upper bound.
 *
 * Vercel ignores its own "Node.js Version" project setting whenever
 * `package.json` declares `engines.node`, and with an open-ended range such as
 * ">=20.9.0" it takes the NEWEST major it supports. When 26.x shipped, every
 * deployment began building on it, and `vercel.json` runs the whole test suite
 * as part of the build, so 17 test files failed and the deployment went to
 * ERROR: Node 25+ defines its own `localStorage` global, which is `undefined`
 * unless `--localstorage-file` is passed, and it shadows the one jsdom
 * provides ("Cannot read properties of undefined (reading 'clear')").
 *
 * The same files pass on Node 24, the version CI runs. So the range stops
 * below 25 until the suite has been run on the next major. To raise it: run
 * `npm test` under that Node, then change the bound here and in package.json
 * and package-lock.json together.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (file: string) => JSON.parse(readFileSync(join(root, file), "utf8"));

/** The first major the range admits that is not a fixed upper bound, or null. */
function upperBoundMajor(range: string): number | null {
  const m = /<\s*=?\s*(\d+)/.exec(range);
  return m ? Number(m[1]) : null;
}

describe("engines.node has an upper bound", () => {
  const range: string = read("package.json").engines.node;

  it("still allows the Node majors the workflows use", () => {
    expect(range).toMatch(/>=\s*20\.9\.0/);
  });

  it("stops below Node 25, where jsdom's localStorage is shadowed", () => {
    const bound = upperBoundMajor(range);
    expect(bound, `engines.node "${range}" has no upper bound`).not.toBeNull();
    expect(bound as number).toBeLessThanOrEqual(25);
  });

  it("is the same range in package-lock.json, so npm ci and Vercel agree", () => {
    const lock = read("package-lock.json").packages[""].engines.node;
    expect(lock).toBe(range);
  });

  it("recognises a bounded range and an open one (the check can see)", () => {
    expect(upperBoundMajor(">=20.9.0 <25")).toBe(25);
    expect(upperBoundMajor(">=20.9.0")).toBeNull();
  });
});
