/**
 * No font may be fetched from Google at build time.
 *
 * `next/font/google` downloads the font while `next build` runs. When that
 * request failed on Vercel the whole production deployment errored, with
 * Turbopack reporting `Module not found: Can't resolve
 * '@vercel/turbopack-next/internal/font/google/font'` on the Inter import in
 * app/layout.tsx. It was intermittent and it hit three merges (the job-pages
 * change, the Node-engines pin and an earlier one), each time while a
 * preview build of the same code had passed, which is what a flaky network
 * fetch looks like. Because `vercel.json` makes the deployment pass or fail on
 * the whole build, a font CDN hiccup became "the site did not deploy".
 *
 * Fonts are now files in app/fonts, loaded with `next/font/local`, so the
 * build has nothing to fetch. This test keeps it that way: it fails on any
 * `next/font/google` import, and on a `localFont` whose file is missing,
 * because a missing file is the other way this goes wrong and it would
 * otherwise only show up in the same place, at build time.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const ROOTS = ["app", "components", "lib", "hooks", "store"];
const SKIP = new Set(["node_modules", ".next", "__tests__", "out"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|mjs|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

/** Drop comments: layout.tsx explains why it left Google in a comment that names it. */
function stripComments(src: string): string {
  const withoutBlocks = src
    .replace(/\r\n/g, "\n")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return withoutBlocks
    .split("\n")
    .map((line) => (/^\s*(\/\/|\*)/.test(line) ? "" : line.replace(/\s\/\/\s.*$/, "")))
    .join("\n");
}

const files = ROOTS.flatMap((r) => walk(join(root, r)));

describe("fonts are never fetched at build time", () => {
  it("scans a real set of source files", () => {
    // A walk that finds nothing would make every assertion below pass.
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.endsWith(join("app", "layout.tsx")))).toBe(true);
  });

  it("nothing imports next/font/google", () => {
    const offenders = files.filter((f) =>
      /next\/font\/google/.test(stripComments(readFileSync(f, "utf8"))),
    );
    expect(
      offenders.map((f) => f.replace(root + "/", "")),
      "next/font/google fetches from Google during `next build` and has failed deployments. Put the file in app/fonts and use next/font/local.",
    ).toEqual([]);
  });

  it("every localFont src points at a real, non-empty file", () => {
    const missing: string[] = [];
    let seen = 0;
    for (const f of files) {
      const src = stripComments(readFileSync(f, "utf8"));
      if (!/from\s+["']next\/font\/local["']/.test(src)) continue;
      for (const m of src.matchAll(/\bsrc:\s*["']([^"']+)["']/g)) {
        seen += 1;
        const target = resolve(dirname(f), m[1]);
        if (!existsSync(target) || statSync(target).size < 1000) {
          missing.push(`${f.replace(root + "/", "")} -> ${m[1]}`);
        }
      }
    }
    // The layout and the pricing page each load one file; fewer means this
    // check stopped seeing them rather than that they were removed.
    expect(seen).toBeGreaterThanOrEqual(2);
    expect(missing).toEqual([]);
  });

  it("the body face is still wired to --font-sans, which the whole app reads", () => {
    const layout = stripComments(readFileSync(join(root, "app", "layout.tsx"), "utf8"));
    expect(layout).toMatch(/variable:\s*["']--font-sans["']/);
    expect(layout).toMatch(/cn\(\s*["']font-sans["']\s*,\s*geist\.variable\s*\)/);
  });

  it("ships a licence beside each font file", () => {
    const dir = join(root, "app", "fonts");
    const fonts = readdirSync(dir).filter((n) => n.endsWith(".woff2"));
    expect(fonts.length).toBeGreaterThanOrEqual(2);
    const licences = readdirSync(dir).filter((n) => /OFL/i.test(n));
    expect(licences.length).toBeGreaterThanOrEqual(fonts.length);
  });
});
