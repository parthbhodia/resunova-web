/**
 * Browser draft for the résumé builder.
 *
 * One localStorage record, shared by the page and the open-job store, so a
 * tab switch does not invent a second key. The record expires after a week.
 * Writes return false when the browser refuses them (private mode, quota)
 * instead of throwing into the click handler.
 */

export const BUILDER_DRAFT_KEY = "rn_builder_draft";
export const BUILDER_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function loadBuilderDraft(): Record<string, unknown> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(BUILDER_DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed._ts === "number" && Date.now() - parsed._ts > BUILDER_DRAFT_TTL_MS) {
      localStorage.removeItem(BUILDER_DRAFT_KEY);
      return {};
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function patchBuilderDraft(patch: Record<string, unknown>): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const prev = loadBuilderDraft();
    localStorage.setItem(
      BUILDER_DRAFT_KEY,
      JSON.stringify({ ...prev, ...patch, _ts: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearBuilderDraft(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(BUILDER_DRAFT_KEY);
  } catch {
    /* private mode */
  }
}
