import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import {
  DEFAULT_TAILORING_MODE,
  TAILORING_MODE_META,
  resolveTailoringMode,
  tailoringModeForRequest,
} from "@/lib/tailoringMode";

describe("the tailoring-mode default", () => {
  it("is aggressive (written as a literal, so retuning it is a deliberate edit here)", () => {
    expect(DEFAULT_TAILORING_MODE).toBe("aggressive");
  });

  it("resolves a missing or unrecognised mode to the default and keeps a chosen one", () => {
    for (const raw of [null, undefined, "", "yolo", 7, {}, []]) {
      expect(resolveTailoringMode(raw)).toBe("aggressive");
    }
    expect(resolveTailoringMode("honest")).toBe("honest");
    expect(resolveTailoringMode("aggressive")).toBe("aggressive");
  });
});

describe("tailoringModeForRequest reads the cache, then the default", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("sends aggressive when nothing was ever chosen", () => {
    expect(tailoringModeForRequest()).toBe("aggressive");
  });

  it("keeps an explicit honest choice", () => {
    localStorage.setItem("rn_tailoring_mode_v1", "honest");
    expect(tailoringModeForRequest()).toBe("honest");
  });

  it("ignores a corrupt cached value instead of sending it", () => {
    localStorage.setItem("rn_tailoring_mode_v1", "reckless");
    expect(tailoringModeForRequest()).toBe("aggressive");
  });
});

describe("what each mode promises on screen", () => {
  it("does not claim aggressive never fabricates numbers, which the API may badge instead", () => {
    // The old blurb said "Never fabricates jobs, credentials, or numbers". The
    // server ships an unsourced number with a Review badge, so that sentence was
    // a claim the product does not keep. The floor it can keep is in the
    // account card and the modal: employers, titles, dates, degrees, certs.
    expect(TAILORING_MODE_META.aggressive.blurb).not.toMatch(/never fabricates/i);
    expect(TAILORING_MODE_META.aggressive.blurb).toMatch(/marks each addition/i);
  });
});

/**
 * One source of truth. The default used to be written out as `?? "honest"` at
 * about a dozen call sites, so changing it meant finding all of them and any
 * one missed would have sent a different mode than the screen showed. This
 * fails the build if a hand-written honest default comes back.
 *
 * Comments are stripped first: three of this repo's own pins have passed for
 * the wrong reason by matching the docstring that quotes the thing they ban.
 */
describe("no hand-written honest default", () => {
  const ROOTS = ["lib", "components", "app", "hooks"];
  const SKIP = new Set(["node_modules", ".next", "out", "__tests__", "__snapshots__"]);
  // The type union itself is the one place the word is a definition, not a default.
  const ALLOWED = new Set([path.join("lib", "tailoringModeDefault.ts")]);

  function walk(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
    }
    return out;
  }

  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  // `?? "honest"`, `|| "honest"`, `= "honest"` (not ===), and a bare `("honest")` argument.
  const HONEST_DEFAULT = /(\?\?|\|\|)\s*["']honest["']|(?<![=!<>])=\s*["']honest["']|\(\s*["']honest["']\s*\)/;

  it("finds none in production code", () => {
    const offenders = ROOTS.flatMap((r) => walk(path.resolve(process.cwd(), r)))
      .filter((f) => !ALLOWED.has(path.relative(process.cwd(), f)))
      .filter((f) => HONEST_DEFAULT.test(strip(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
  });

  it("would catch one (the pin is not vacuous)", () => {
    // The type alias DOES match, which is exactly why that one file is
    // allow-listed by path rather than by loosening the pattern.
    expect(HONEST_DEFAULT.test('export type TailoringMode = "honest" | "aggressive";')).toBe(true);
    for (const bad of [
      'const m = tailoringMode ?? "honest";',
      'const m = x || "honest";',
      'function f(mode = "honest") {}',
      'setTailoringMode("honest");',
    ]) {
      expect(HONEST_DEFAULT.test(bad)).toBe(true);
    }
    for (const fine of [
      'if (raw === "honest" || raw === "aggressive") return raw;',
      'const isHonest = raw === "honest";',
      "// the honest default was removed",
    ]) {
      expect(HONEST_DEFAULT.test(strip(fine))).toBe(false);
    }
  });
});
