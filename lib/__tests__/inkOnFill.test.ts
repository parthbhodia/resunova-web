/**
 * Text on a solid hue fill uses `--on-fill`, never an `-ink` token.
 *
 * The `-ink` tokens are tuned for text on a pale TINT (`--accent-bg`,
 * `--green-bg`): in light mode they are dark versions of the hue. Put one on a
 * solid fill of the same hue and the label nearly disappears. That shipped on
 * the job page's "Generate prep kit" button: `--accent` fill, `--accent-ink`
 * text, dark blue on blue, reported as "not visible".
 *
 * `tailorQueueMotion.test.ts` already stops a filled control hardcoding `#fff`,
 * but only in the tailor files and only for white. This is the other half of
 * the same rule, across every component and page.
 *
 * WHY IT PARSES INSTEAD OF MATCHING ONE REGEX. The shipped button chose both
 * its fill and its text with a ternary (`ready ? tint : solid`). A single
 * pattern either stops at the first quote and never sees the solid fill, or
 * matches the whole line and flags the correct tint-and-ink branch. So each
 * `style={{ ... }}` is split into properties, each ternary into its branches,
 * and the fill and text branches are compared pairwise.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full));
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Split on `sep` where it is outside quotes, template literals and brackets. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (depth === 0 && c === sep) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** `a ? b : c` becomes [b, c]; anything else is one branch. */
function branches(value: string): string[] {
  const q = splitTop(value, "?");
  if (q.length < 2) return [value.trim()];
  const rest = splitTop(q.slice(1).join("?"), ":");
  return rest.length >= 2 ? [rest[0].trim(), rest.slice(1).join(":").trim()] : [value.trim()];
}

/** The bodies of every `style={{ ... }}` in a file. */
function styleObjects(src: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = src.indexOf("style={{", from);
    if (at < 0) return out;
    let depth = 0;
    let end = at + "style={".length;
    for (; end < src.length; end++) {
      if (src[end] === "{") depth++;
      else if (src[end] === "}" && --depth === 0) break;
    }
    out.push(src.slice(at + "style={{".length, end));
    from = end;
  }
}

const SOLID_FILL = /^"var\(--(?:accent|green|red|amber|yellow|orange)\)"$/;
const INK_TEXT = /var\(--[a-z]+-ink/;

function offenders(src: string): number {
  let n = 0;
  for (const body of styleObjects(src)) {
    const props = new Map<string, string>();
    for (const part of splitTop(body, ",")) {
      const [key, ...value] = splitTop(part, ":");
      if (value.length) props.set(key.trim(), value.join(":").trim());
    }
    const fill = props.get("background") ?? props.get("backgroundColor");
    const text = props.get("color");
    if (!fill || !text) continue;
    const f = branches(fill);
    const t = branches(text);
    const pairs = f.length === t.length ? f.map((x, i) => [x, t[i]]) : f.flatMap((x) => t.map((y) => [x, y]));
    if (pairs.some(([x, y]) => SOLID_FILL.test(x) && INK_TEXT.test(y))) n++;
  }
  return n;
}

describe("text on a solid fill", () => {
  it("sees the shape that shipped, and only that branch", () => {
    // The prep-kit button as it was, so a rule that cannot see it fails here.
    const shipped = `style={{
            background: ready ? "color-mix(in srgb, var(--green-ink) 12%, transparent)" : "var(--accent)",
            color: ready ? "var(--green-ink)" : "var(--accent-ink, #fff)",
          }}`;
    expect(offenders(shipped)).toBe(1);
    // The same button fixed: the tint branch keeps its ink text, which is right.
    expect(offenders(shipped.replace('"var(--accent-ink, #fff)"', '"var(--on-fill)"'))).toBe(0);
    // A plain solid fill with ink text, and the correct tint pairing.
    expect(offenders(`style={{ background: "var(--accent)", color: "var(--accent-ink)" }}`)).toBe(1);
    expect(offenders(`style={{ background: "var(--accent-bg)", color: "var(--accent-ink)" }}`)).toBe(0);
  });

  it("no component or page colours text on a solid fill with an -ink token", () => {
    const found = [...tsxFiles("components"), ...tsxFiles("app")].filter((f) => offenders(readFileSync(f, "utf8")) > 0);
    expect(found).toEqual([]);
  });

  it("the prep-kit button labels its fill with --on-fill", () => {
    const src = readFileSync("components/JobDetail.tsx", "utf8");
    const prep = src.slice(src.indexOf("function PrepCard"));
    expect(prep).toMatch(/color: ready \? "var\(--green-ink\)" : "var\(--on-fill\)"/);
  });
});
