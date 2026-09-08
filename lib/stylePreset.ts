/**
 * Applying a style preset to the builder — the one place that rule lives.
 *
 * A preset is not just its id: creative presets carry an `enforcedLayout`
 * (Elise is a right sidebar, Harper a top banner), and setting only
 * `stylePreset` leaves the layout on whatever the last preset needed — which
 * is how a gallery card can advertise a sidebar that picking it never
 * produces. Switching BACK to a technical preset has to undo that too, or the
 * enforced layout outlives the preset that required it.
 *
 * ⚠️ This existed twice before this module — once in the `?preset=` deep-link
 * effect and once in the Style panel's own handler — which is the two-copies-
 * of-one-contract shape this codebase keeps paying for. The first-run picker
 * would have been a third. One rule, three callers.
 */

import type { ResumeStylePresetOption } from "@/lib/resumeLayout";
import type { TBCustomization, TBLayout } from "@/components/TemplateBuilder/types";

/** The layout a preset implies, given the layout currently in effect. */
export function layoutForStylePreset(
  preset: ResumeStylePresetOption,
  currentLayout: TBLayout | undefined,
): TBLayout | null {
  if (preset.enforcedLayout) return preset.enforcedLayout;
  // A technical preset has no opinion on layout EXCEPT that it must not
  // inherit a creative preset's enforced one.
  if (currentLayout === "rightSidebar" || currentLayout === "topBannerRightSidebar") return "single";
  return null;
}

/** The minimal store surface this needs — keeps the helper unit-testable. */
export interface StylePresetTarget {
  setCustomization: (field: keyof TBCustomization, value: string) => void;
}

/** Apply a preset in full: id, font, accent, and the layout it implies. */
export function applyStylePresetTo(
  target: StylePresetTarget,
  preset: ResumeStylePresetOption,
  currentLayout: TBLayout | undefined,
): void {
  target.setCustomization("stylePreset", preset.id);
  target.setCustomization("font", preset.font);
  target.setCustomization("accentColor", preset.accentColor);
  const layout = layoutForStylePreset(preset, currentLayout);
  if (layout) target.setCustomization("layout", layout);
}
