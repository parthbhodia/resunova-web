/**
 * "Apply automatically" preference for the Fix-everything pass.
 *
 * Off by default: writing rewrites straight into someone's résumé without
 * showing them first is not a reasonable default for a product whose whole
 * analysis layer exists to catch dishonest claims. But it is a reasonable
 * CHOICE — a user who trusts the output and has fixed twenty postings this week
 * should not have to click through a review each time.
 *
 * So the switch exists, defaults off, and persists once set. Same
 * localStorage-first shape as lib/tailoringMode.ts, which also has to work for
 * anonymous visitors with no account to store anything against.
 */

const KEY = "rn_fix_all_auto_v1";

/** Whether the last-chosen setting was auto-apply. Defaults to false. */
export function getFixAllAutoApply(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Private mode / storage disabled: fall back to the safe default rather
    // than letting a storage error turn auto-apply on.
    return false;
  }
}

export function setFixAllAutoApply(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* preference just does not persist; the in-session choice still applies */
  }
}

/** Button copy for each mode, so the label always states what the click does. */
export function fixAllButtonLabel(gapCount: number, autoApply: boolean, busy: boolean): {
  title: string;
  subtitle: string;
} {
  if (busy) {
    return {
      title: autoApply ? "Fixing…" : "Finding fixes…",
      subtitle: "One pass over every gap",
    };
  }
  return autoApply
    ? { title: `⚡ Fix & apply everything (${gapCount})`, subtitle: "Applies straight to your résumé" }
    : { title: `⚡ Fix everything (${gapCount})`, subtitle: "Review before anything changes" };
}
