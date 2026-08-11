import { SITE_URL } from "@/lib/brand";
import { BLOG_POSTS, blogPostHref } from "@/lib/atsBlogPosts";

// Same shape as app/llms.txt/route.ts: a route handler emitting a non-HTML file
// from the static export.
export const dynamic = "force-static";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-07-16" -> "Wed, 16 Jul 2026 00:00:00 GMT" (RFC 822, as RSS requires).
 *
 * Built from the date parts through `Date.UTC` rather than `new Date(iso)` +
 * `toUTCString()`. Both would agree here, but only this one is obviously immune
 * to the trap `formatPublishedAt` documents in lib/atsBlogPosts.ts: an ISO date
 * string parses as UTC midnight, so anything that then reads *local* fields
 * renders the previous day west of Greenwich — and this is a static export, so
 * a wrong date bakes into the published feed at build time.
 */
function toRfc822(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const stamp = Date.UTC(y, m - 1, d);
  const day = DAYS[new Date(stamp).getUTCDay()];
  const dd = String(d).padStart(2, "0");
  return `${day}, ${dd} ${MONTHS[m - 1]} ${y} 00:00:00 GMT`;
}

/**
 * Escapes the five XML predefined entities.
 *
 * Not optional here: real post titles in BLOG_POSTS carry both `&` ("S&P 100")
 * and `'` ("LinkedIn's"), and an unescaped ampersand is a hard parse error in
 * XML — one bad title takes down the whole feed, not just its own item.
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET(): Response {
  // Newest first, and independent of the hand-maintained order in BLOG_POSTS —
  // a reader shows the feed in the order it is given.
  const posts = [...BLOG_POSTS].toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const feedUrl = `${SITE_URL}/blog/rss.xml`;

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}${blogPostHref(post.slug)}`;
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${toRfc822(post.publishedAt)}</pubDate>
      <description>${xmlEscape(post.description)}</description>
      <category>${xmlEscape(post.tag)}</category>
    </item>`;
    })
    .join("\n");

  const lastBuild = posts[0] ? toRfc822(posts[0].publishedAt) : toRfc822("2026-01-01");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Resunova Blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <description>Original job-market research from a live corpus of about 270,000 US job postings, plus practical resume, ATS, and job-search guides.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
