/**
 * Recover a posting id from a retired public job URL.
 *
 * WHY THIS EXISTS. Every public `/jobs/<id>/` page is generated at build time
 * from the newest ~1000 postings (`app/(marketing)/jobs/[id]`, `dynamicParams =
 * false`), and every deploy rebuilds that set. Postings arrive faster than that
 * window holds them, so each deploy replaces nearly all of it: a URL Google
 * indexed last week stops existing, and the visitor gets the generic 404 even
 * though the role itself is usually still open. The site is published to
 * GitHub Pages, which cannot redirect on the server, so the only place to catch
 * this is the 404 page itself, in the browser.
 *
 * This module only decides "is this a retired job link, and for which id".
 * Everything else (asking the API, drawing the result) lives in
 * `components/seo/StaleJobRescue.tsx`.
 */

const JOB_PATH = /^\/jobs\/([^/]+)\/?$/;

/** Real routes that live under /jobs/ and are never posting ids. */
const RESERVED = new Set(["sponsors"]);

/** Posting ids are UUIDs; accept anything id-shaped, nothing that could carry a path or markup. */
const ID_SHAPE = /^[A-Za-z0-9_-]{1,128}$/;

/** The posting id in `/jobs/<id>` or `/jobs/<id>/`, or null for any other path. */
export function jobIdFromPath(pathname: string): string | null {
  const match = JOB_PATH.exec(pathname);
  if (!match) return null;
  let id: string;
  try {
    id = decodeURIComponent(match[1]);
  } catch {
    return null; // malformed percent-encoding: not something we generated
  }
  if (RESERVED.has(id.toLowerCase())) return null;
  return ID_SHAPE.test(id) ? id : null;
}

/** Where the live posting can be read: the in-app Jobs view, open to guests. */
export function inAppJobHref(id: string): string {
  return `/?view=jobs&job=${encodeURIComponent(id)}`;
}

/** Where a visitor goes when there is no specific posting to show: the in-app job search, open to guests. */
export const JOBS_PORTAL_HREF = "/?view=jobs";
