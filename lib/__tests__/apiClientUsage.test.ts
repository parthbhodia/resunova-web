/**
 * Every backend call goes through `apiFetch`.
 *
 * This is the structural half of the auth fix. Attaching tokens to the twenty
 * endpoints that were missing them is a one-time repair; without this test the
 * twenty-first ships unauthenticated too, because a fresh `fetch(apiUrl(...))`
 * looks exactly like the surrounding code and nothing objects.
 *
 * If this fails, do not add the header by hand at the new call site — use
 * `apiFetch` from `lib/apiClient`, which sends the session token when there is
 * one and omits it for anonymous visitors.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..");
const SEARCH_DIRS = ["app", "components", "hooks", "lib", "store"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "__tests__"]);

/** The wrapper itself is the one place allowed to call fetch with an API URL. */
const ALLOWED = new Set(["lib/apiClient.ts"]);

function sourceFiles(dir: string): string[] {
  const abs = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(abs, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(join(dir, name)));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * A raw fetch at an API URL. Three spellings were in use and all three skip the
 * token: `fetch(apiUrl(...))`, a template literal built from
 * NEXT_PUBLIC_API_URL, and `fetch(someBase + apiUrl(...))`.
 *
 * The third is why this matches `apiUrl(` anywhere inside the argument rather
 * than only at its start — a first pass anchored to the opening paren walked
 * straight past `fetch(apiBase + apiUrl(...))` in ScanUsageWidget.
 *
 * Matched against whole-file text rather than line by line, because several of
 * these wrap the URL onto its own line.
 */
const RAW_FETCH = /\bfetch\(\s*(?:[^)\n]*\bapiUrl\(|`\$\{\s*process\.env\.NEXT_PUBLIC_API_URL)/g;

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split("\n").length;
}

describe("API calls go through apiFetch", () => {
  const files = SEARCH_DIRS.flatMap(sourceFiles);

  it("finds source to check", () => {
    // Guards against a path change silently turning this into a no-op test.
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no direct fetch against an API URL", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (ALLOWED.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(RAW_FETCH)) {
        offenders.push(`${rel}:${lineOf(src, m.index)}`);
      }
    }
    expect(offenders, `Use apiFetch from lib/apiClient instead:\n${offenders.join("\n")}`).toEqual([]);
  });
});
