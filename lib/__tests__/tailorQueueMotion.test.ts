import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const GLOBALS = readFileSync("app/globals.css", "utf8");
const QUEUE = readFileSync("components/tailor/TailorWorkQueue.tsx", "utf8");

/** Properties a transition may name. Everything here is composited or a paint;
 *  none of it forces layout. */
const SAFE_ANIMATABLE = new Set([
  "opacity",
  "transform",
  "color",
  "background-color",
  "border-color",
  "border-left-color",
  "border-top-color",
]);

/** Naming any of these in a transition or keyframe reflows the whole list on
 *  every frame, which is what makes an animated queue feel slower than a
 *  static one. */
const LAYOUT_PROPS =
  /(^|[\s;{])(height|width|margin|padding|top|left|right|bottom|font-size|border-width|inset)\s*:/;

/** `.tq-foo { ... }` rules and their bodies. */
const tqRules = [...GLOBALS.matchAll(/\.(tq-[a-z-]+)\s*\{([^}]*)\}/g)].map((m) => ({
  name: m[1],
  body: m[2],
}));

function keyframeBody(name: string): string {
  const m = GLOBALS.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
  // Single-line keyframes (the repo writes several that way) close on the same
  // line, so fall back to a non-greedy same-line match.
  if (m) return m[1];
  const inline = GLOBALS.match(new RegExp(`@keyframes\\s+${name}\\s*\\{(.*)\\}`));
  return inline ? inline[1] : "";
}

describe("tailor queue motion", () => {
  it("defines rules for every tq- class the component uses", () => {
    // A typo'd class name is invisible: the element renders fine and simply
    // never animates, which is indistinguishable from "we did not ship it".
    const used = new Set(
      [...QUEUE.matchAll(/className="([^"]*)"/g)]
        .flatMap((m) => m[1].split(/\s+/))
        .filter((cls) => cls.startsWith("tq-")),
    );
    expect(used.size).toBeGreaterThan(0);
    const defined = new Set(tqRules.map((r) => r.name));
    for (const cls of used) {
      expect(defined, `.${cls} is used in TailorWorkQueue but has no rule`).toContain(cls);
    }
  });

  it("never animates a layout property", () => {
    for (const rule of tqRules) {
      expect(rule.body, `.${rule.name} transitions a layout property`).not.toMatch(LAYOUT_PROPS);
      for (const kf of rule.body.matchAll(/animation:\s*([a-zA-Z][\w-]*)/g)) {
        const body = keyframeBody(kf[1]);
        expect(body, `@keyframes ${kf[1]} is not defined`).not.toBe("");
        expect(body, `@keyframes ${kf[1]} animates a layout property`).not.toMatch(LAYOUT_PROPS);
      }
    }
  });

  it("names the properties it transitions instead of using `all`", () => {
    // `transition: all` repaints properties nobody chose, and it is how a
    // cheap animation turns into a jank report later.
    for (const rule of tqRules) {
      const t = rule.body.match(/transition:\s*([^;]+);/);
      if (!t) continue;
      for (const part of t[1].split(",")) {
        const prop = part.trim().split(/\s+/)[0];
        expect(SAFE_ANIMATABLE, `.${rule.name} transitions "${prop}"`).toContain(prop);
      }
    }
  });

  it("keeps the reduced-motion guard unscoped so new animations inherit it", () => {
    // The guard is what makes adding an animation safe by default. It also has
    // to clamp iteration count, or an `infinite` animation restarts every
    // 0.01ms and pins a core instead of stopping.
    const guard = GLOBALS.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{([^}]*)\}/,
    );
    expect(guard, "the global reduced-motion guard is missing").not.toBeNull();
    expect(guard?.[1]).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(guard?.[1]).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });
});
