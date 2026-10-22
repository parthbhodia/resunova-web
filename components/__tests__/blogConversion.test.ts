import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isPublicPath } from "@/components/AuthGate";
import { PUBLIC_APP_VIEWS } from "@/lib/anonScan";

/**
 * The blog is the best door the site has, so the two ways a click on it can
 * quietly fail are pinned here.
 *
 * 1. A FILLED CONTROL MAY NOT HARDCODE A WHITE FOREGROUND.
 *    Every hue token is tuned to be readable as TEXT on the theme background, so
 *    in dark mode they are all light. `#fff` on `--accent` measures 5.19:1 in
 *    light and 2.53:1 in dark; `--on-fill` is near-black there (7.49:1). The
 *    blog shipped six of these (the CTA card, the subscribe button, the
 *    numbered step badge and three inline buttons) because the existing guard
 *    in tailorQueueMotion.test.ts is scoped to an explicit list of five tailor
 *    files, and a guard scoped to a list protects exactly the list.
 *
 * 2. A CTA MAY NOT LAND SOMEWHERE THAT DOES NOT DO WHAT IT PROMISED.
 *    Three CTAs said "Score my resume free" and landed on the marketing
 *    homepage, one more said "Browse companies" and landed on a sign-in gate.
 *    A signed-out reader pays for each wrong landing with a hop they did not
 *    ask for. `/?view=analyze` is the direct front door (a sign-in card with
 *    the job-description box beside it), so that is where scoring CTAs go.
 *
 * Both are SOURCE scans, because neither can be observed from a render: one is
 * the absence of a hardcoded colour and the other is where a link points.
 * Comments are stripped before scanning, because this file's own neighbours
 * have already shipped a scan that matched a docstring quoting the thing it
 * forbids.
 */

const BLOG_ROOTS = ["components/blog", "app/(marketing)/blog"];

/** OG images are static share cards rendered once: no theme, no dark mode. */
const EXEMPT = /opengraph-image\.tsx$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") && !EXEMPT.test(p)) out.push(p);
  }
  return out;
}

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const FILES = BLOG_ROOTS.flatMap(walk);
const SOURCES = FILES.map((f) => ({ file: f, code: stripComments(readFileSync(f, "utf8")) }));

/** A hue-token fill and a white foreground within one style object, either order. */
const HUE = String.raw`var\(--(?:accent|green|red|amber|yellow|orange)[a-z0-9-]*[^"]*"`;
const WHITE = String.raw`"(?:#f{3,6}|white)"`;
const WHITE_ON_FILL = new RegExp(
  String.raw`background(?:Color)?\s*:\s*[^";\n]*"${HUE}[^}]{0,240}?color\s*:\s*${WHITE}` +
    "|" +
    String.raw`color\s*:\s*${WHITE}[^}]{0,240}?background(?:Color)?\s*:\s*[^";\n]*"${HUE}`,
  "gi",
);

describe("blog filled controls", () => {
  it("found the blog sources at all", () => {
    // A scanner that walked nothing would pass every assertion below.
    expect(FILES.length).toBeGreaterThan(15);
    expect(FILES.some((f) => f.endsWith("BlogSubscribe.tsx"))).toBe(true);
    expect(FILES.some((f) => f.endsWith("BlogArticleLayout.tsx"))).toBe(true);
  });

  it("the pattern can see the defect it guards (both orders) and passes the fix", () => {
    const bad1 = `style={{ background: "var(--accent)", color: "#fff", borderRadius: 9 }}`;
    const bad2 = `style={{ color: "white", fontSize: 14, background: "var(--green)" }}`;
    const good = `style={{ background: "var(--accent)", color: "var(--on-fill)", borderRadius: 9 }}`;
    // A tint with its own ink is not a filled control and must not be flagged.
    const tint = `style={{ background: "var(--accent-bg)", color: "var(--accent)" }}`;
    expect(bad1.match(WHITE_ON_FILL)).not.toBeNull();
    expect(bad2.match(WHITE_ON_FILL)).not.toBeNull();
    expect(good.match(WHITE_ON_FILL)).toBeNull();
    expect(tint.match(WHITE_ON_FILL)).toBeNull();
  });

  it("no filled control in the blog hardcodes a white foreground", () => {
    const found = SOURCES.filter(({ code }) => new RegExp(WHITE_ON_FILL.source, "gi").test(code)).map(
      (s) => s.file,
    );
    expect(found, `use var(--on-fill), not #fff: ${found.join(", ")}`).toEqual([]);
  });
});

/** Why a CTA destination is wrong, or null if it is fine. */
function destinationProblem(href: string, body = ""): string | null {
  if (!href.startsWith("/")) return null; // external links are not ours to judge
  if (href === "/" || href === "") return "lands on the marketing homepage";

  const [path, query = ""] = href.split("?");
  const view = new URLSearchParams(query).get("view");
  if ((path === "/" || path === "") && view) {
    return PUBLIC_APP_VIEWS.has(view.toLowerCase())
      ? null
      : `?view=${view} is not a public app view, so a signed-out reader hits a wall`;
  }
  if (!isPublicPath(path)) {
    // A gated destination is allowed, but the copy has to say so up front.
    return /\b(account|sign[ -]?in|log[ -]?in)\b/i.test(body)
      ? null
      : `${path} is gated and the copy does not say an account comes first`;
  }
  return null;
}

describe("blog CTA destinations", () => {
  it("the checker flags each way a landing goes wrong, and passes the good ones", () => {
    expect(destinationProblem("/")).toMatch(/homepage/);
    expect(destinationProblem("/?view=jobs")).toMatch(/not a public app view/);
    // /interview-prep is a gated route. (/refer was the example here until main
    // opened the directory in #342, which moved it to the public set.)
    expect(destinationProblem("/interview-prep/", "Practice questions from your résumé")).toMatch(/gated/);
    expect(destinationProblem("/interview-prep/", "With a free account your prep is saved")).toBeNull();
    expect(destinationProblem("/refer/")).toBeNull();
    expect(destinationProblem("/?view=analyze")).toBeNull();
    expect(destinationProblem("/jobs/")).toBeNull();
    expect(destinationProblem("/ats-resume-checker/")).toBeNull();
    expect(destinationProblem("https://example.com/x")).toBeNull();
  });

  const CTA_CARD = /<CTACard\b([\s\S]*?)\/>/g;
  const attr = (props: string, name: string) =>
    props.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";

  const cards = SOURCES.flatMap(({ file, code }) =>
    [...code.matchAll(CTA_CARD)].map((m) => ({
      file,
      href: attr(m[1], "href"),
      body: attr(m[1], "body"),
      cta: attr(m[1], "cta"),
    })),
  );

  it("found the CTA cards at all", () => {
    expect(cards.length).toBeGreaterThanOrEqual(10);
    expect(cards.every((c) => c.href && c.body && c.cta)).toBe(true);
  });

  it("every CTA card lands where it promises", () => {
    const problems = cards
      .map((c) => ({ ...c, why: destinationProblem(c.href, c.body) }))
      .filter((c) => c.why)
      .map((c) => `${c.file}: "${c.cta}" -> ${c.href} ${c.why}`);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("every inline accent button lands where it promises", () => {
    const INLINE = /<Link\s+href="([^"]+)"\s+style=\{\{[^}]*background:\s*"var\(--accent\)"/g;
    const inline = SOURCES.flatMap(({ file, code }) =>
      [...code.matchAll(INLINE)].map((m) => ({ file, href: m[1] })),
    );
    // Three exist today (ghost-jobs, linkedin, sp100). Fewer means the pattern broke.
    expect(inline.length).toBeGreaterThanOrEqual(3);
    const problems = inline
      .map((i) => ({ ...i, why: destinationProblem(i.href) }))
      .filter((i) => i.why)
      .map((i) => `${i.file}: ${i.href} ${i.why}`);
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
