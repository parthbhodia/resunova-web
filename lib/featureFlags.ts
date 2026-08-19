/**
 * Build-time product flags.
 *
 * JOBS_ENABLED — the Jobs feed is hidden while the local extraction pipeline is
 * stopped (2026-08-14). The feed ranks postings against `requirement_concepts`
 * produced by the on-desktop GPU worker; with that worker off, the corpus stops
 * being refreshed and stale postings are worse than no postings — a candidate
 * who applies to a filled role gets silence, and blames us for it.
 *
 * Deliberately a FLAG and not a deletion: every Jobs surface stays built and
 * tested, so turning the pipeline back on is one boolean rather than a revert
 * of a large removal. Flip this to `true` and every entry point returns.
 *
 * Scope is the IN-APP section only. The public SEO routes under `/jobs/*`
 * (including `/jobs/[id]` and `/jobs/sponsors`) are deliberately untouched —
 * they are indexed, and 404-ing indexed URLs is an SEO decision with a much
 * longer tail than a hidden nav item. Raise that separately if the pipeline
 * stays off.
 */
export const JOBS_ENABLED = false;
