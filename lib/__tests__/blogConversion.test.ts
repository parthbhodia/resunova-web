/**
 * The blog's conversion layer.
 *
 * The audit that motivated these tests found four of nine posts — every one of
 * the stat-led research posts, i.e. exactly the ones that get shared and linked
 * — ending with no call to action at all, while `CTACard` sat unused in
 * `BlogArticleLayout`. Adding CTAs to those four is a one-time repair. The
 * first test is the structural half: without it the tenth post ships without one
 * too, because a post with no CTA looks exactly like a post with one until
 * someone reads to the bottom.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/blog/rss.xml/route";
import { BLOG_AUTHOR, BLOG_POSTS, blogAuthorName, createBlogPostJsonLd } from "@/lib/atsBlogPosts";
import { isLikelyEmail } from "@/lib/blogSubscribe";

const ROOT = join(__dirname, "..", "..");

function postSource(slug: string): string {
  return readFileSync(join(ROOT, "app", "blog", slug, "page.tsx"), "utf8");
}

/**
 * Separates a post's table-of-contents ids from the rest of its source.
 *
 * The split is the whole point. A Section and a TOC entry both spell an id as
 * a string literal, so scanning the file as one blob lets the TOC satisfy
 * itself and the check passes against any rename. Posts write the TOC two ways
 * — inline `items={[...]}` and `items={TOC}` against a module const — and the
 * const form has to be resolved, or its ids read as zero and the assertion
 * below silently has nothing to test.
 */
function splitToc(src: string): { tocIds: string[]; body: string } {
  const el = /<TableOfContents\b[\s\S]*?\/>/.exec(src);
  if (!el) return { tocIds: [], body: src };

  let tocSource = el[0];
  let body = src.replace(el[0], "");

  const ref = /items=\{([A-Za-z_$][\w$]*)\}/.exec(el[0]);
  if (ref) {
    const decl = new RegExp(`const ${ref[1]}\\s*=\\s*\\[[\\s\\S]*?\\n\\];`).exec(src);
    if (decl) {
      tocSource = decl[0];
      body = body.replace(decl[0], "");
    }
  }

  return { tocIds: [...tocSource.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]), body };
}

describe("every post has a conversion path", () => {
  it.each(BLOG_POSTS.map((p) => p.slug))("%s ends with a CTA", (slug) => {
    // Boundary-anchored, not `toContain("<CTACard")`: a bare substring also
    // matches `<CTACardX`, so the first version of this test passed against a
    // mutant that had renamed the element away. A check that cannot see the
    // difference is indistinguishable from the system working.
    expect(postSource(slug)).toMatch(/<CTACard[\s/>]/);
  });

  it("routes each CTA somewhere that exists", () => {
    // A CTA pointing at a 404 converts worse than no CTA: the reader clicked.
    // Path and `?view=` are checked separately because both can be wrong on
    // their own — "/?view=analyse" is a real path with a view that renders
    // nothing, and it fails silently rather than 404ing.
    const paths = new Set([
      "/",
      "/jobs/",
      "/ats-resume-checker/",
      "/cover-letter/",
      "/template-builder/",
      "/resume-examples/",
      "/skills-for-resume/",
      "/blog/",
    ]);
    const views = new Set(["home", "analyze", "builder", "jobs", "library", "cover-letter", "profile", "account"]);

    let checked = 0;
    for (const post of BLOG_POSTS) {
      for (const [, href] of postSource(post.slug).matchAll(/href="([^"]+)"\s*\n\s*cta=/g)) {
        const [path, query] = href.split("?");
        expect(paths, `${post.slug} -> ${href}`).toContain(path);
        if (query) {
          const view = new URLSearchParams(query).get("view");
          if (view) expect(views, `${post.slug} -> ${href}`).toContain(view);
        }
        checked += 1;
      }
    }
    // Without this the loop passes vacuously if the regex ever stops matching
    // — which is exactly what a refactor of CTACard's props would do.
    expect(checked).toBeGreaterThanOrEqual(BLOG_POSTS.length);
  });

  it("gives every table-of-contents entry a section to land on", () => {
    // A TOC entry whose id has no matching Section scrolls nowhere and throws
    // nothing: renaming a section is the natural way to break this, and the
    // page still looks completely fine afterwards.
    let withToc = 0;
    for (const post of BLOG_POSTS) {
      const src = postSource(post.slug);
      if (!/<TableOfContents/.test(src)) continue;
      withToc += 1;
      const { tocIds, body } = splitToc(src);

      const sectionIds = new Set([
        // `<Section title="..." id="...">` — id is not always the first prop.
        ...[...body.matchAll(/<Section\b[^>]*>/g)].flatMap((tag) => {
          const id = /\bid="([^"]+)"/.exec(tag[0]);
          return id ? [id[1]] : [];
        }),
        // Sections rendered from a data array get `id={p.id}`, so the literal
        // lives on the array entry instead.
        ...[...body.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]),
      ]);

      expect(tocIds.length, `${post.slug} TOC parsed empty`).toBeGreaterThan(0);
      for (const id of tocIds) {
        expect(sectionIds, `${post.slug} -> #${id}`).toContain(id);
      }
    }
    expect(withToc).toBeGreaterThanOrEqual(BLOG_POSTS.filter((p) => p.stat).length);
  });

  it("points every data post at the methodology page", () => {
    // A number without a reachable method behind it is the thing a journalist
    // declines to cite, so this is a link the research posts cannot lose.
    for (const post of BLOG_POSTS.filter((p) => p.stat)) {
      expect(postSource(post.slug), post.slug).toContain("/blog/methodology/");
    }
  });
});

describe("rss feed", () => {
  async function feed(): Promise<string> {
    return await GET().text();
  }

  it("serves every post, newest first", async () => {
    const body = await feed();
    for (const post of BLOG_POSTS) {
      expect(body).toContain(`/blog/${post.slug}/`);
    }
    expect(body.match(/<item>/g)).toHaveLength(BLOG_POSTS.length);

    const dates = [...body.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map((m) => Date.parse(m[1]));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("escapes XML so one title cannot break the whole feed", async () => {
    const body = await feed();
    // Real titles in BLOG_POSTS carry both of these; an unescaped `&` is a hard
    // XML parse error that takes down every item, not just its own.
    expect(body).toContain("S&amp;P 100");
    expect(body).toContain("&apos;");
    // No bare ampersand survives anywhere in the document.
    expect(body).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it("dates each item in RFC 822 with the right weekday", async () => {
    const body = await feed();
    for (const [, date] of body.matchAll(/<pubDate>(.*?)<\/pubDate>/g)) {
      expect(date).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
      // Parse it back and confirm the weekday name matches the date it labels —
      // a hand-built date string can be well-formed and still say Tuesday about
      // a Wednesday, which readers dedupe on.
      expect(new Date(date).toUTCString()).toBe(date);
    }
  });

  it("declares itself as its own feed url", async () => {
    expect(await feed()).toContain('rel="self"');
  });
});

describe("subscribe input validation", () => {
  it("is checked client-side only as a courtesy; the server re-validates", () => {
    // Pinning the relationship, not the regex: if this guard ever gets STRICTER
    // than normalize_email in resunova-api, it silently rejects addresses the
    // backend would have accepted, and nobody finds out.
    expect(isLikelyEmail("a@b.co")).toBe(true);
  });

  it("accepts ordinary addresses", () => {
    for (const ok of ["a@b.co", "First.Last+tag@sub.example.com", "  MixedCase@Example.COM  "]) {
      expect(isLikelyEmail(ok), ok).toBe(true);
    }
  });

  it("rejects what a real form receives instead of an address", () => {
    for (const bad of ["", "   ", "asdf", "no-at-sign.com", "two@@at.com", "spaces in@example.com", "trailing@dot"]) {
      expect(isLikelyEmail(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("rejects an address longer than the SQL guard allows", () => {
    // Mirrors the 320-char cap in subscribe_to_blog. If this drifts, the client
    // sends something the database will reject and the user sees a failure with
    // no explanation.
    expect(isLikelyEmail(`${"a".repeat(320)}@example.com`)).toBe(false);
  });
});

describe("author attribution", () => {
  it("credits the organization until a real person is named", () => {
    // Guards the honesty rule, not the mechanism: the byline must never claim a
    // human author that does not exist. Setting BLOG_AUTHOR to a real name is
    // expected to turn this test red — update it then, deliberately.
    expect(BLOG_AUTHOR).toBeNull();
    expect(blogAuthorName()).toBe("Resunova Team");

    const [article] = createBlogPostJsonLd(BLOG_POSTS[0].slug) as [{ author: { "@type": string } }];
    expect(article.author["@type"]).toBe("Organization");
  });
});
