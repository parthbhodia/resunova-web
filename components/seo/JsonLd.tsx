import type { ReactElement } from "react";

/**
 * Injects one or more JSON-LD structured-data blocks into the static HTML.
 *
 * This is a server component, so the <script> tags are rendered at build time
 * and shipped in the `output: "export"` static export. Crawlers — including
 * non-JS AI bots (GPTBot, PerplexityBot, ClaudeBot) — see the schema without
 * executing any JavaScript, which is the whole point: if it isn't in the static
 * HTML, it doesn't exist for SEO.
 *
 * Pass a single schema object or an array of them (e.g. Article + FAQPage +
 * BreadcrumbList on one page).
 */
export default function JsonLd({ data }: { data: object | object[] }): ReactElement {
  const entries = Array.isArray(data) ? data : [data];
  return (
    <>
      {entries.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
