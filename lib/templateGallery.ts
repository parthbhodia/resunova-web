/**
 * The template gallery: one derivation from the presets that actually exist.
 *
 * Users kept reporting that the resume templates are hard to find, and the
 * mechanism was structural: the only in-app route to a template was Style
 * panel cards inside the Template Builder, itself a sub-item of a collapsed
 * nav drawer. This module feeds the surfaces that fix that (the /templates
 * gallery page and the Home strip) from RESUME_STYLE_PRESETS directly, so a
 * gallery card cannot exist without a real preset and a preset cannot ship
 * without a card. The landing gallery learned that rule the hard way: it
 * once advertised a CV layout that did not exist and hid the only serif.
 */

import { RESUME_STYLE_PRESETS, type ResumeStylePresetOption } from "@/lib/resumeLayout";
import { DEMO_RESUME, type TBResumeData } from "@/components/TemplateBuilder/types";

export interface TemplateGalleryEntry {
  id: string;
  label: string;
  description: string;
  /**
   * The role fit every surface leads with, straight off the preset. Founder
   * ask: the gallery should offer "software roles, etc" rather than five
   * abstract style names, and the thumbnails were already role-flavoured
   * while the labels were not. It stays a FIT, never a promise of
   * role-specific sections, because the presets differ only in type and
   * layout.
   */
  bestFor: string;
  /** Opens the builder with THIS preset applied, via the proven ?preset= path. */
  builderHref: string;
  /** The demo résumé restyled by the preset, for a real rendered thumbnail. */
  data: TBResumeData;
}

/**
 * The demo résumé wearing one preset — the same fields the builder's own
 * ?preset= effect applies (full preset, not just the id: creative presets
 * carry an enforced layout, and a thumbnail that ignored it would advertise
 * a single-column Elise that picking her never produces).
 */
export function presetPreviewData(preset: ResumeStylePresetOption): TBResumeData {
  return {
    ...DEMO_RESUME,
    customization: {
      ...DEMO_RESUME.customization,
      stylePreset: preset.id,
      font: preset.font,
      accentColor: preset.accentColor,
      layout: preset.enforcedLayout ?? "single",
    },
  };
}

export function templateGalleryEntries(): TemplateGalleryEntry[] {
  return RESUME_STYLE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    bestFor: preset.bestFor,
    builderHref: `/template-builder/?preset=${preset.id}`,
    data: presetPreviewData(preset),
  }));
}
