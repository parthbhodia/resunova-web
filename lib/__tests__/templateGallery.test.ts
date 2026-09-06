import { describe, expect, it } from "vitest";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";
import { presetPreviewData, templateGalleryEntries } from "@/lib/templateGallery";

/**
 * The gallery is pinned to the presets that exist, in BOTH directions — the
 * landing gallery once advertised a CV layout that did not exist and hid the
 * only serif, and both failures looked exactly like a product with different
 * templates. Same rule here, at the producer every template surface draws
 * from (/templates and the Home strip).
 */

describe("templateGalleryEntries", () => {
  it("has exactly one entry per shipped preset, in preset order", () => {
    expect(templateGalleryEntries().map((e) => e.id)).toEqual(
      RESUME_STYLE_PRESETS.map((p) => p.id),
    );
  });

  it("cannot invent an entry that has no preset", () => {
    const ids = new Set<string>(RESUME_STYLE_PRESETS.map((p) => p.id));
    for (const e of templateGalleryEntries()) {
      expect(ids.has(e.id)).toBe(true);
    }
  });

  it("links every entry into the builder with its own preset applied", () => {
    for (const e of templateGalleryEntries()) {
      expect(e.builderHref).toBe(`/template-builder/?preset=${e.id}`);
    }
  });

  /**
   * Every template surface now LEADS with the role fit rather than the style
   * name, so a preset shipping without one leaves a card with a blank
   * heading — the same shape as the missing card, one field down.
   */
  it("carries a role fit for every preset, straight off the preset", () => {
    for (const p of RESUME_STYLE_PRESETS) {
      expect(p.bestFor.trim().length).toBeGreaterThan(0);
    }
    for (const e of templateGalleryEntries()) {
      const preset = RESUME_STYLE_PRESETS.find((p) => p.id === e.id)!;
      expect(e.bestFor).toBe(preset.bestFor);
    }
  });

  /**
   * A role fit is guidance, so two templates claiming the same audience make
   * the choice meaningless — and `executive` and `modern` are already
   * near-twins (same face, density apart). If they ever converge on one
   * label, the gallery is advertising four templates as five.
   */
  it("gives each preset a distinct role fit", () => {
    const fits = RESUME_STYLE_PRESETS.map((p) => p.bestFor.toLowerCase());
    expect(new Set(fits).size).toBe(fits.length);
  });

  /**
   * ⚠️ THE HONESTY LINE. The presets differ in typography and layout only:
   * none of them reorders sections or adds role-specific ones. A label that
   * reads as a job title ("Software Engineer Resume") promises a different
   * document; a label that reads as an audience ("Software & engineering")
   * promises a fit, which is the true claim.
   */
  it("names an audience, never a job title", () => {
    for (const p of RESUME_STYLE_PRESETS) {
      expect(p.bestFor).not.toMatch(/\bresumes?\b/i);
      expect(p.bestFor).not.toMatch(/\b(engineer|manager|analyst|designer|developer|scientist)\b/i);
    }
  });

  it("styles each thumbnail with the preset it advertises", () => {
    for (const p of RESUME_STYLE_PRESETS) {
      const data = presetPreviewData(p);
      expect(data.customization.stylePreset).toBe(p.id);
      expect(data.customization.font).toBe(p.font);
      expect(data.customization.accentColor).toBe(p.accentColor);
    }
  });

  it("honors an enforced layout, so a creative thumbnail shows the layout picking it produces", () => {
    const elise = RESUME_STYLE_PRESETS.find((p) => p.id === "creative-teal");
    expect(elise?.enforcedLayout).toBeTruthy();
    expect(presetPreviewData(elise!).customization.layout).toBe(elise!.enforcedLayout);
    const executive = RESUME_STYLE_PRESETS.find((p) => p.id === "executive")!;
    expect(presetPreviewData(executive).customization.layout).toBe("single");
  });
});
