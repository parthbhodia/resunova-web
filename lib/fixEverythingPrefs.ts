/**
 * "Apply to preview" is the primary Fix-everything path: generate all rewrites
 * and land them on the résumé with green highlights so the user reviews the
 * paper, not a card stack. A secondary "review suggestions first" mode still
 * exists via the checkbox (persisted).
 */

const KEY = "rn_fix_all_auto_v1";

/** Whether Fix-everything applies straight to the preview. Defaults to ON —
 *  the highlighted résumé IS the review surface. */
export function getFixAllAutoApply(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(KEY);
    // Missing key → on (new default). Explicit "0" → review-first.
    if (v === null) return true;
    return v !== "0";
  } catch {
    return true;
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
      title: autoApply ? "Tailoring résumé…" : "Finding fixes…",
      subtitle: "One pass over every open gap",
    };
  }
  return autoApply
    ? {
        title: `Fix everything (${gapCount})`,
        subtitle: "Apply all to preview — review the highlighted résumé",
      }
    : {
        title: `Fix everything (${gapCount})`,
        subtitle: "Generate suggestions first, then apply",
      };
}
