import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * One palette per theme.
 *
 * globals.css used to define the whole palette TWICE for each theme — two
 * `:root, [data-theme="dark"]` blocks and two `[data-theme="light"]` blocks,
 * 61 duplicated declarations between them. Identical selectors, so the later
 * block silently won and the earlier one was dead code that still looked live.
 *
 * It had already drifted, which is the cost: `--shadow`, `--shadow-sm` and
 * `--shadow-card` held different values in the dead copy in BOTH themes. Anyone
 * editing the first block would have seen no effect and no error.
 *
 * The rule is deliberately narrow — same SELECTOR, same property — so it says
 * nothing about legitimate layering. shadcn's `:root` defaults being overridden
 * by the app palette in `:root, [data-theme="dark"]` is two different selectors
 * and stays allowed; that is a cascade, not a duplicate.
 */

const CSS = readFileSync("app/globals.css", "utf8");

interface Block {
  selector: string;
  props: string[];
}

/** Top-level blocks only: nested at-rule contents are skipped by brace depth. */
function topLevelBlocks(src: string): Block[] {
  const out: Block[] = [];
  let depth = 0;
  let selStart = 0;
  let bodyStart = 0;
  let selector = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      if (depth === 0) {
        selector = src
          .slice(selStart, i)
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/\s+/g, " ")
          .trim();
        bodyStart = i + 1;
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        const body = src.slice(bodyStart, i);
        const props = [...body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
        if (props.length) out.push({ selector, props });
        selStart = i + 1;
      }
    }
  }
  return out;
}

describe("the theme palette is defined once per theme", () => {
  it("declares no custom property twice under the same selector", () => {
    const bySelector = new Map<string, string[]>();
    for (const b of topLevelBlocks(CSS)) {
      bySelector.set(b.selector, [...(bySelector.get(b.selector) ?? []), ...b.props]);
    }
    const dupes: string[] = [];
    for (const [selector, props] of bySelector) {
      const seen = new Set<string>();
      for (const p of props) {
        if (seen.has(p)) dupes.push(`${selector} { ${p} }`);
        seen.add(p);
      }
    }
    expect(dupes, `declared twice under one selector:\n  ${dupes.join("\n  ")}`).toEqual([]);
  });

  it("gives every hue family the colour that sits on a fill", () => {
    // --on-fill is what a filled control uses for its label. It has to exist in
    // BOTH themes with DIFFERENT values, because the hue tokens invert: a single
    // hardcoded foreground is readable in exactly one theme, which is the bug it
    // was added to end.
    const decls = [...CSS.matchAll(/--on-fill\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(decls.length, "--on-fill must be declared per theme").toBe(2);
    expect(new Set(decls).size, `--on-fill is the same in both themes: ${decls.join(", ")}`).toBe(2);
  });
});
