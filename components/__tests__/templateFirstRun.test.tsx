import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TemplateFirstRunPicker from "@/components/TemplateBuilder/TemplateFirstRunPicker";
import { shouldShowFirstRunPicker, type FirstRunPickerInput } from "@/lib/templateFirstRun";
import { applyStylePresetTo, layoutForStylePreset } from "@/lib/stylePreset";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";
import { templateGalleryEntries } from "@/lib/templateGallery";

/**
 * The Template Builder's cold-open picker (founder: "template builder should
 * show templates first when users sign in").
 *
 * The tests that matter most are the ones about when it does NOT show: a
 * picker that interrupts live work is worse than the demo-résumé drop-in it
 * replaces.
 */

/** Nothing to resume — the one state that earns an interruption. */
const COLD: FirstRunPickerInput = {
  presetFromUrl: "",
  builderIdFromUrl: "",
  hasPendingPrefill: false,
  hasStoredResume: false,
  hasChosenTemplate: false,
};

describe("shouldShowFirstRunPicker", () => {
  it("shows on a genuinely cold open", () => {
    expect(shouldShowFirstRunPicker(COLD)).toBe(true);
  });

  // Each of these is a different way of having already chosen. Any one of
  // them must be enough on its own to stay out of the way.
  it.each([
    ["a preset deep link from the gallery", { presetFromUrl: "modern" }],
    ["a saved résumé opening from Resume Hub", { builderIdFromUrl: "abc123" }],
    ["an Analyze hand-off carrying real content", { hasPendingPrefill: true }],
    ["work already in progress in this browser", { hasStoredResume: true }],
    ["a template picked or skipped earlier", { hasChosenTemplate: true }],
  ] as [string, Partial<FirstRunPickerInput>][])(
    "stays out of the way given %s",
    (_label, override) => {
      expect(shouldShowFirstRunPicker({ ...COLD, ...override })).toBe(false);
    },
  );
});

describe("applyStylePresetTo — one rule for all three callers", () => {
  const creative = RESUME_STYLE_PRESETS.find((p) => p.enforcedLayout)!;
  const technical = RESUME_STYLE_PRESETS.find((p) => !p.enforcedLayout)!;

  it("applies the whole preset, not just its id", () => {
    const calls: [string, string][] = [];
    applyStylePresetTo({ setCustomization: (f, v) => calls.push([f, v]) }, technical, "single");
    const fields = Object.fromEntries(calls);
    expect(fields.stylePreset).toBe(technical.id);
    expect(fields.font).toBe(technical.font);
    expect(fields.accentColor).toBe(technical.accentColor);
  });

  it("honours a creative preset's enforced layout", () => {
    // Otherwise the gallery advertises a sidebar that picking it never
    // produces — the exact drift the shared rule exists to prevent.
    expect(layoutForStylePreset(creative, "single")).toBe(creative.enforcedLayout);
  });

  it("undoes an enforced layout when switching back to a technical preset", () => {
    expect(layoutForStylePreset(technical, "rightSidebar")).toBe("single");
    expect(layoutForStylePreset(technical, "topBannerRightSidebar")).toBe("single");
  });

  it("leaves a layout the user chose alone", () => {
    // twoColumn is a manual choice, not a preset's enforcement, so a
    // technical preset must not reset it.
    expect(layoutForStylePreset(technical, "twoColumn")).toBeNull();
  });
});

describe("TemplateFirstRunPicker", () => {
  it("offers every template that actually ships, from the shared producer", () => {
    render(<TemplateFirstRunPicker onPick={() => {}} onSkip={() => {}} />);
    const entries = templateGalleryEntries();
    expect(entries.length).toBe(RESUME_STYLE_PRESETS.length);
    for (const entry of entries) {
      expect(document.querySelector(`[data-first-run-card="${entry.id}"]`)).toBeTruthy();
    }
  });

  it("leads with the role fit and keeps the style name", () => {
    render(<TemplateFirstRunPicker onPick={() => {}} onSkip={() => {}} />);
    for (const entry of templateGalleryEntries()) {
      expect(screen.getAllByText(entry.bestFor).length).toBeGreaterThan(0);
      expect(screen.getAllByText(entry.label).length).toBeGreaterThan(0);
    }
  });

  it("says a role fit is not a lock-in", () => {
    // Test-pinned on /templates and the landing gallery for the same reason:
    // five unqualified role labels read as five different products.
    render(<TemplateFirstRunPicker onPick={() => {}} onSkip={() => {}} />);
    expect(document.body.textContent).toMatch(/any template works for any role/i);
  });

  it("hands back the preset that was clicked", () => {
    const onPick = vi.fn();
    render(<TemplateFirstRunPicker onPick={onPick} onSkip={() => {}} />);
    const target = templateGalleryEntries()[1];
    fireEvent.click(document.querySelector(`[data-first-run-card="${target.id}"]`)!);
    expect(onPick).toHaveBeenCalledWith(target.id);
  });

  it("always offers a way past it", () => {
    // Without this the picker is a wall in front of a no-sign-up tool.
    const onSkip = vi.fn();
    render(<TemplateFirstRunPicker onPick={() => {}} onSkip={onSkip} />);
    fireEvent.click(document.querySelector("[data-first-run-skip]")!);
    expect(onSkip).toHaveBeenCalled();
  });
});
