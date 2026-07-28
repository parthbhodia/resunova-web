import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FONT_SIZE_STEPS, FS, snapFontSize } from "@/lib/typography";

describe("type scale", () => {
  it("is strictly ascending with no duplicate steps", () => {
    for (let i = 1; i < FONT_SIZE_STEPS.length; i++) {
      expect(FONT_SIZE_STEPS[i]).toBeGreaterThan(FONT_SIZE_STEPS[i - 1]);
    }
  });

  it("has no fractional steps", () => {
    for (const step of FONT_SIZE_STEPS) expect(Number.isInteger(step)).toBe(true);
  });

  it("snaps to the nearest step, breaking ties upward", () => {
    expect(snapFontSize(12.5)).toBe(13);
    expect(snapFontSize(13.5)).toBe(14);
    expect(snapFontSize(10.8)).toBe(11);
    expect(snapFontSize(9.5)).toBe(10);
    // Already on the ladder — unchanged.
    expect(snapFontSize(FS.body)).toBe(FS.body);
    expect(snapFontSize(FS.display)).toBe(FS.display);
  });

  it("clamps below the smallest step rather than inventing one", () => {
    expect(snapFontSize(4)).toBe(FS.micro);
  });

  it("mirrors the --fs-* custom properties in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const declared = new Map<string, number>();
    for (const m of css.matchAll(/--fs-([a-z0-9-]+):\s*(\d+)px/g)) {
      declared.set(m[1], Number(m[2]));
    }
    // Every ladder step must exist in CSS with the same value, so a stylesheet
    // and an inline style asking for the same role agree.
    const expected: Record<string, number> = {
      micro: FS.micro,
      caption: FS.caption,
      small: FS.small,
      body: FS.body,
      "body-lg": FS.bodyLg,
      subhead: FS.subhead,
      title: FS.title,
      h3: FS.h3,
      h2: FS.h2,
      h1: FS.h1,
      display: FS.display,
      "display-lg": FS.displayLg,
    };
    expect(Object.fromEntries(declared)).toEqual(expected);
  });
});

/**
 * Print-metric surfaces are exempt from the ladder: their sizes drive Chromium
 * PDF pagination and are owned by the résumé-paper code, not app chrome.
 */
const PRINT_METRIC_FILES = [
  "components/AnalyzeLiveResumeBody.tsx",
  "components/AnnotatedResumePanel.tsx",
  "components/ResumeEditor.tsx",
  "components/ResumeTemplateStudio.tsx",
  "components/TemplateBuilder/TemplateBuilderClient.tsx",
  "components/TemplateBuilder/TemplateBuilderReviewPanel.tsx",
];

describe("no fractional font sizes in app UI", () => {
  it("keeps the type-scale cleanup from regressing", async () => {
    const { readdirSync } = await import("node:fs");
    const root = process.cwd();
    const FRACTIONAL = /fontSize:\s*\d+\.\d|text-\[\d+\.\d+px\]/;

    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "__tests__") continue;
          walk(rel, out);
        } else if (/\.tsx?$/.test(entry.name)) {
          out.push(rel);
        }
      }
      return out;
    };

    const offenders = ["components", "app", "lib"]
      .flatMap((d) => walk(d))
      .filter((f) => FRACTIONAL.test(readFileSync(join(root, f), "utf8")))
      .sort();

    expect(offenders).toEqual(PRINT_METRIC_FILES);
  });
});
