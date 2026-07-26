import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ELEVATION, STATE_LAYER, SHAPE, EASING, DURATION, MATERIAL_CSS_VARS, stateTransition,
} from "@/lib/material";

const GLOBALS = readFileSync("app/globals.css", "utf8");

/**
 * Print-metric surfaces. Material elevation is review chrome: it renders as a
 * grey box in an exported PDF, and its shadows would change how the résumé
 * paper measures. Same exemption list as the type scale.
 */
const PDF_SURFACES = [
  "lib/resumeLayout.ts",
  "components/AnnotatedResumePanel.tsx",
  "components/AnalyzeLiveResumeBody.tsx",
  "components/ResumeEditor.tsx",
  "components/TemplateBuilder/TemplateBuilderClient.tsx",
];

describe("Material tokens", () => {
  it("mirrors every token into globals.css", () => {
    // Same arrangement as the --fs-* ladder: one definition, two consumers,
    // and a test so they cannot drift.
    for (const [name, value] of Object.entries(MATERIAL_CSS_VARS)) {
      expect(GLOBALS, `${name} missing from globals.css`).toContain(`${name}:`);
      if (name.startsWith("--md-shape") || name.startsWith("--md-duration")) {
        // Values are column-aligned in the stylesheet, so match on the
        // declaration rather than an exact string.
        const declaration = new RegExp(`${name}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`);
        expect(GLOBALS, `${name} value drifted from lib/material.ts`).toMatch(declaration);
      }
    }
  });

  it("defines all six elevation levels, with 0 flat", () => {
    expect(Object.keys(ELEVATION)).toHaveLength(6);
    expect(ELEVATION[0]).toBe("none");
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(ELEVATION[level]).toMatch(/rgb\(0 0 0/);
    }
  });

  it("keeps state-layer opacities within Material's range", () => {
    expect(STATE_LAYER.hover).toBeLessThan(STATE_LAYER.dragged);
    for (const v of Object.values(STATE_LAYER)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("exposes the shape and motion scales", () => {
    expect(SHAPE.none).toBe(0);
    expect(SHAPE.full).toBeGreaterThan(1000);
    expect(EASING.standard).toMatch(/^cubic-bezier/);
    expect(DURATION.short).toBeLessThan(DURATION.extraLong);
  });

  it("builds a transition from the token scale, not hardcoded timings", () => {
    const t = stateTransition(["opacity"]);
    expect(t).toBe(`opacity ${DURATION.medium}ms ${EASING.standard}`);
    expect(stateTransition()).toContain("box-shadow");
  });
});

describe("state layer", () => {
  it("is defined once as a shared class rather than per component", () => {
    expect(GLOBALS).toContain(".md-state-layer");
    expect(GLOBALS).toContain(".md-state-layer::after");
  });

  it("covers hover, focus and pressed", () => {
    expect(GLOBALS).toContain(".md-state-layer:hover::after");
    expect(GLOBALS).toContain(".md-state-layer:focus-visible::after");
    expect(GLOBALS).toContain(".md-state-layer:active::after");
  });

  it("is stripped from the PDF capture", () => {
    // The overlay is review chrome. Without this it would composite into the
    // exported document.
    expect(GLOBALS).toContain(".az-clean-export .md-state-layer::after");
  });

  it("is clamped under reduced motion", () => {
    const guard = GLOBALS.slice(GLOBALS.indexOf(".md-state-layer"));
    expect(guard).toContain("prefers-reduced-motion");
  });
});

describe("PDF surfaces stay off Material", () => {
  it.each(PDF_SURFACES)("%s uses no Material elevation or state layer", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).not.toContain("--md-elevation");
    expect(src).not.toContain("md-state-layer");
  });
});
