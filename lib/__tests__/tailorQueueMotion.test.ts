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

/**
 * Split a transition list on its TOP-LEVEL commas only.
 *
 * A naive `.split(",")` reads `cubic-bezier(0.16,1,0.3,1)` as four entries and
 * reports "1" as a transitioned property. Every rule here used `ease` until the
 * meter needed an easing curve, so the parser bug shipped green and would have
 * failed the first correct rule someone wrote.
 */
function splitTopLevel(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      out.push(value.slice(start, i));
      start = i + 1;
    }
  }
  out.push(value.slice(start));
  return out.filter((s) => s.trim().length > 0);
}

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
      for (const part of splitTopLevel(t[1])) {
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

describe("the transition parser itself", () => {
  // The parser shipped green with a bug because every rule used `ease`. These
  // pin the behaviour that only surfaced once a rule needed cubic-bezier.
  it("does not split inside a timing function", () => {
    expect(splitTopLevel("transform 0.45s cubic-bezier(0.16,1,0.3,1), color 0.2s ease"))
      .toEqual(["transform 0.45s cubic-bezier(0.16,1,0.3,1)", " color 0.2s ease"]);
  });

  it("still splits a plain list", () => {
    expect(splitTopLevel("opacity 1s ease, transform 1s ease")).toHaveLength(2);
  });

  it("handles a single entry with no comma", () => {
    expect(splitTopLevel("color 0.3s ease")).toEqual(["color 0.3s ease"]);
  });
});

describe("the global input rule", () => {
  // A text-input block (width:100%, padding, border, focus ring) was applying
  // to checkboxes and radios too. In the tailor queue that made the checkbox
  // 99px wide and pushed "Select all gaps" into three stacked lines beside it
  // with 400px of free space in the row. Several call sites had already added
  // an inline width/height to work around it, which is the tell that the rule
  // was wrong rather than the call sites.
  const RULE = /input:not\(\[class\*="Mui"\]\)([^,{]*)/g;

  it("excludes checkboxes and radios from text-input styling", () => {
    const selectors = [...GLOBALS.matchAll(RULE)].map((m) => m[1]);
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) {
      expect(s, `an input rule still matches checkboxes: input:not([class*="Mui"])${s}`)
        .toMatch(/:not\(\[type="checkbox"\]\)/);
      expect(s, `an input rule still matches radios: input:not([class*="Mui"])${s}`)
        .toMatch(/:not\(\[type="radio"\]\)/);
    }
  });
});

describe("CSS variables the tailor surfaces reference", () => {
  /**
   * An undefined var() silently uses its fallback, which is invisible until the
   * theme changes. `--red-soft` never existed, so the "Keep every claim true"
   * banner fell through to a hardcoded #fff1f0 while its TEXT colour came from
   * `--red-ink`, which does adapt. In dark mode that rendered #fca5a5 on
   * #fff1f0 — light pink on light pink, about 1.7:1, unreadable.
   *
   * The theme already had alpha-based `--red-bg` / `--amber-bg` / `--green-bg`
   * defined per theme; the call sites simply used names that were not there.
   */
  const TAILOR_FILES = ["components/tailor/TailorWorkQueue.tsx",
                        "components/tailor/TailorFixExpansion.tsx",
                        "components/tailor/TailorScoreboard.tsx",
                        "components/tailor/TailorChangeLog.tsx",
                        "components/tailor/TailorTitleNote.tsx"];
  const TAILOR = TAILOR_FILES.map((f) => readFileSync(f, "utf8")).join("\n");

  /** Vars the app defines inline on an element rather than in globals.css. */
  const INLINE_DEFINED = new Set(["--surface-2"]);

  it("are all defined in globals.css", () => {
    const used = new Set([...TAILOR.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(5);
    const missing = [...used].filter(
      (v) => !INLINE_DEFINED.has(v) && !new RegExp(`^\\s*${v}\\s*:`, "m").test(GLOBALS),
    );
    expect(missing, `undefined CSS vars: ${missing.join(", ")}`).toEqual([]);
  });

  it("uses no opaque hex fallback for a TINT background", () => {
    // Scoped to the tint family (--*-bg / --*-soft) on purpose: a TRANSLUCENT
    // tint must composite over the theme behind it rather than pin a light-mode
    // hex under text that adapts. An opaque fallback on a SOLID fill is a
    // different question and is fine — the fill is meant to be a solid colour.
    //
    // ⚠️ This comment used to add "and white text sits on it either way".
    // MEASURED ON THE REAL CONTROLS, THAT WAS FALSE, and the test below is what
    // replaced the assumption. Do not reintroduce the claim.
    const bad = [...TAILOR.matchAll(/var\(--[a-z0-9-]+-(?:bg|soft),\s*(#[0-9a-fA-F]{3,8})\)/g)]
      .map((m) => m[1]);
    expect(bad, `opaque hex tint fallbacks: ${bad.join(", ")}`).toEqual([]);
  });

  /**
   * A filled control may not hardcode its own foreground.
   *
   * Every hue token here is tuned to be readable AS TEXT on the theme's own
   * background, so in dark mode they are all LIGHT. Measured on the real
   * controls, driven into their real states:
   *
   *                              light        dark
   *     "Improve N gaps"   --accent    5.19:1    2.53:1   (#fff)
   *     "Add to résumé"    --green-ink 5.48:1    1.52:1   (#fff)
   *     applied dot        --green-ink 5.48:1    1.52:1   (#fff)
   *
   * One hardcoded foreground CANNOT be right in both themes, which is why
   * `--on-fill` exists. Near-black on those same fills measures 7.5:1 (accent)
   * to 13.1:1 (amber), so the fills were never wrong — the palette was missing
   * the other half of the pair.
   *
   * Baseline is ZERO, not a known-bad list: the six sites this used to allow
   * are fixed. Deliberately NOT matched: a fill carrying no text (the progress
   * segments), since the pattern requires a `color`.
   */
  it("lets no filled control hardcode a white foreground", () => {
    const found: string[] = [];
    for (const f of TAILOR_FILES) {
      const src = readFileSync(f, "utf8");
      // Three tolerances, each added because a mutant slipped past without it:
      //  - a bounded window, not "immediately after": the applied dot puts a
      //    borderColor between the fill and the colour;
      //  - an optional expression before the value: the scoreboard's badge
      //    picks its fill with a ternary, so a pattern anchored to `: "var(`
      //    could not see the one file this was written for;
      //  - any hue token, not just `-ink`: --accent was the worst-trafficked
      //    offender and an -ink-only rule declared it clean.
      for (const m of src.matchAll(
        /background(?:Color)?\s*:\s*[^";\n]*"var\(--(?:accent|green|red|amber|yellow|orange)[a-z0-9-]*[^"]*"[^}]{0,240}?color\s*:\s*"#f{3,6}"/gi,
      )) {
        void m;
        found.push(f);
      }
    }
    expect(found, `filled controls hardcoding #fff: ${found.join(", ")}`).toEqual([]);
  });
});
