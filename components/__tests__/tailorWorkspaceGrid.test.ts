import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * /tailor-2 does not mount the legacy TailorMatchSidebar, so the classic
 * three-track grid mis-seats every panel: the queue lands in the `auto` track,
 * the preview drops into the 2fr track, and the 3fr track stays EMPTY but
 * reserved. Measured in Chromium at a 1900px viewport: preview 512px with
 * ~768px of the window blank; with the two-track grid, preview 973px.
 *
 * These assertions pin the shape of the fix (a queue-specific column template
 * that is actually applied when queueUi is on) so a future edit to the grid
 * cannot silently reintroduce the dead column.
 */
const SRC = readFileSync(
  join(process.cwd(), "components", "ResumeBuilder.tsx"),
  "utf8",
);

describe("tailor workspace grid", () => {
  it("declares a queue-specific column template", () => {
    expect(SRC).toContain(".rb-tailor-workspace--queue");
  });

  it("gives the queue layout exactly two column tracks", () => {
    const block = SRC.split(".rb-tailor-workspace--queue")[1] ?? "";
    const decl = block.slice(0, block.indexOf("}"));
    const match = decl.match(/grid-template-columns:\s*([^;]+);/);
    expect(match, "queue grid must set grid-template-columns").toBeTruthy();

    const value = match![1].trim();
    // Count top-level tracks, treating minmax(a, b) as one track.
    const tracks = value.replace(/minmax\([^)]*\)/g, "T").split(/\s+/).filter(Boolean);
    expect(tracks).toHaveLength(2);
  });

  it("does not carry the legacy `auto` sidebar track into the queue layout", () => {
    const block = SRC.split(".rb-tailor-workspace--queue")[1] ?? "";
    const decl = block.slice(0, block.indexOf("}"));
    const value = (decl.match(/grid-template-columns:\s*([^;]+);/) ?? [])[1] ?? "";
    expect(value.trim().startsWith("auto")).toBe(false);
  });

  it("applies the queue class only when queueUi is on", () => {
    expect(SRC).toMatch(
      /className=\{`rb-tailor-workspace\$\{queueUi \? " rb-tailor-workspace--queue" : ""\}`\}/,
    );
  });

  it("keeps the classic three-track grid for the non-queue view", () => {
    expect(SRC).toMatch(
      /\.rb-tailor-workspace \{[^}]*grid-template-columns:\s*auto minmax\(260px, 2fr\) minmax\(280px, 3fr\)/,
    );
  });

  it("collapses both layouts to a single column on mobile", () => {
    // The narrow-viewport override must name the queue class too, or /tailor-2
    // keeps two side-by-side columns on a phone.
    const mq = SRC.slice(SRC.indexOf("@media (max-width: 960px)"));
    const firstRule = mq.slice(0, mq.indexOf("}"));
    expect(firstRule).toContain(".rb-tailor-workspace--queue");
  });
});

describe("preview toolbar", () => {
  const PANEL = readFileSync(
    join(process.cwd(), "components", "AnnotatedResumePanel.tsx"),
    "utf8",
  );

  it("lets the style-control group wrap instead of clipping", () => {
    const idx = PANEL.indexOf('aria-label="Preview style controls"');
    expect(idx).toBeGreaterThan(-1);
    const block = PANEL.slice(idx, idx + 500);
    expect(block).toContain("flexWrap");
    expect(block).toContain("minWidth: 0");
  });
});
