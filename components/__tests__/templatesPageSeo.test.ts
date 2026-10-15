import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";
import { templateGalleryEntries } from "@/lib/templateGallery";

/**
 * /templates is public and sitemap-listed, but it renders inside AppShell,
 * so it is the one indexable route that sits outside the (marketing) group
 * and therefore outside every convention that group established: canonical
 * alternates, robots, OpenGraph, and structured data.
 *
 * The source-text assertions follow the pattern blogSeo.test.ts already uses
 * ("read the route file, assert it contains the wiring"), because importing
 * app/templates/page.tsx here would drag AppShell and the whole app shell
 * dependency graph into a unit test just to read a constant.
 */

const PAGE_SRC = readFileSync(
  resolve(process.cwd(), "app", "(marketing)", "templates", "page.tsx"),
  "utf8",
);

describe("the /templates page SEO surface", () => {
  it("declares the canonical and robots directives it used to inherit", () => {
    expect(PAGE_SRC).toContain("alternates: { canonical: CANONICAL }");
    expect(PAGE_SRC).toContain("robots: { index: true, follow: true }");
  });

  it("carries social metadata so a shared link is not a bare URL", () => {
    expect(PAGE_SRC).toContain("openGraph: {");
    expect(PAGE_SRC).toContain('card: "summary_large_image"');
  });

  it("derives its breadcrumb and ItemList schema from the presets that exist", () => {
    // A card in the DOM that is not in the markup is a schema that lies about
    // the page, and this is the surface where that would happen: the gallery
    // is generated, so the schema has to be generated with the same source.
    expect(PAGE_SRC).toContain("templateGalleryEntries()");
    expect(PAGE_SRC).toContain('"@type": "BreadcrumbList"');
    expect(PAGE_SRC).toContain('"@type": "ItemList"');

    const entries = templateGalleryEntries();
    expect(entries).toHaveLength(RESUME_STYLE_PRESETS.length);
    for (const entry of entries) {
      // Every deep link is a real builder URL, not a placeholder.
      expect(entry.builderHref).toMatch(/^\/template-builder\/\?preset=[a-z-]+$/);
    }
  });

  it("still renders the gallery with the deep link the schema advertises", () => {
    const entries = templateGalleryEntries();
    const cardIds = entries.map((e) => e.id);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect(cardIds).toContain("creative-teal");
  });
});
