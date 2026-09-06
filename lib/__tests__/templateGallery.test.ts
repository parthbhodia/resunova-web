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
