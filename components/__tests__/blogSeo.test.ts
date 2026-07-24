import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOG_LAST_MODIFIED,
  BLOG_POSTS,
  blogPostCanonical,
  blogPostHref,
  createBlogPostJsonLd,
  createBlogPostMetadata,
  formatPublishedAt,
} from "@/lib/atsBlogPosts";

describe("blog SEO contract", () => {
  it("keeps slugs unique and dates valid", () => {
    expect(new Set(BLOG_POSTS.map((post) => post.slug)).size).toBe(BLOG_POSTS.length);

    for (const post of BLOG_POSTS) {
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.modifiedAt >= post.publishedAt).toBe(true);
      expect(post.seoDescription.length).toBeLessThanOrEqual(160);
    }

    expect(BLOG_LAST_MODIFIED).toBe("2026-07-18");
  });

  it("creates canonical article metadata without a duplicate brand suffix", () => {
    for (const post of BLOG_POSTS) {
      const metadata = createBlogPostMetadata(post.slug);
      const canonical = blogPostCanonical(post.slug);
      const openGraph = metadata.openGraph as {
        type: string;
        url: string;
        publishedTime: string;
        modifiedTime: string;
      };

      expect(metadata.title).toBe(post.title);
      expect(String(metadata.title)).not.toContain("Resunova Blog");
      expect(metadata.alternates?.canonical).toBe(canonical);
      expect(openGraph.type).toBe("article");
      expect(openGraph.url).toBe(canonical);
      expect(openGraph.publishedTime).toBe(`${post.publishedAt}T00:00:00.000Z`);
      expect(openGraph.modifiedTime).toBe(`${post.modifiedAt}T00:00:00.000Z`);
      expect(blogPostHref(post.slug)).toBe(`/blog/${post.slug}/`);
    }
  });

  it("creates BlogPosting and breadcrumb schema for every article", () => {
    for (const post of BLOG_POSTS) {
      const [article, breadcrumb] = createBlogPostJsonLd(post.slug) as Record<string, unknown>[];

      expect(article["@type"]).toBe("BlogPosting");
      expect(article.headline).toBe(post.title);
      expect(article.datePublished).toBe(post.publishedAt);
      expect(article.dateModified).toBe(post.modifiedAt);
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    }
  });

  it("has a route and social image for every registered article", () => {
    for (const post of BLOG_POSTS) {
      const route = resolve(process.cwd(), "app", "blog", post.slug, "page.tsx");
      const image = resolve(process.cwd(), "app", "blog", post.slug, "opengraph-image.tsx");

      expect(existsSync(route), `${post.slug} route is missing`).toBe(true);
      expect(existsSync(image), `${post.slug} social image is missing`).toBe(true);
      expect(readFileSync(route, "utf8")).toContain(`createBlogPostMetadata("${post.slug}")`);
    }
  });

  it("rejects invalid display dates", () => {
    expect(formatPublishedAt("2026-00-10")).toBeNull();
    expect(formatPublishedAt("2026-13-10")).toBeNull();
    expect(formatPublishedAt("not-a-date")).toBeNull();
  });
});
