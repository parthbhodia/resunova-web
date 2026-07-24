/**
 * H-1B sponsor page helpers — pure, unit-tested.
 *
 * Honesty rules (from the eng-reviewed design doc, 2026-07-24):
 * - Badges state EMPLOYER-level facts: "employer has filed N LCAs", never
 *   "this job will sponsor you" (a hospital filing for physicians badges its
 *   marketing roles too — the copy must not overclaim).
 * - The paywall funnel events must fire at most once per posting per page
 *   view (double-click dedup), and never block the UX they measure.
 */

/** "Filed 47 H-1B LCAs · median $128k" — employer-level, honestly phrased. */
export function sponsorBadgeLabel(
  certifiedCount: number | null,
  medianWage: number | null,
): string {
  const parts: string[] = [];
  if (certifiedCount != null && certifiedCount > 0) {
    parts.push(`Filed ${certifiedCount.toLocaleString("en-US")} H-1B LCA${certifiedCount === 1 ? "" : "s"}`);
  } else {
    parts.push("H-1B sponsor history");
  }
  const wage = formatWage(medianWage);
  if (wage) parts.push(`median ${wage}`);
  return parts.join(" · ");
}

/** $128k / $87,500 → compact USD label. Null/invalid → "". */
export function formatWage(wage: number | null): string {
  if (wage == null || !Number.isFinite(wage) || wage <= 0) return "";
  if (wage >= 1000) return `$${Math.round(wage / 1000)}k`;
  return `$${Math.round(wage)}`;
}

/** "3 days ago" freshness label; "" when unknown. */
export function postedAgoLabel(postedAt: string | null): string {
  if (!postedAt) return "";
  const t = new Date(postedAt).getTime();
  if (Number.isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** Once-per-key guard for funnel events (e.g. paywall_view per posting).
 *  A double-click or re-render must not double-fire. */
export class OnceGuard {
  private seen = new Set<string>();

  /** True the FIRST time a key is passed; false forever after. */
  fire(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}
