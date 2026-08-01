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

  it("keeps a three-track grid, led by the sidebar's auto track, for the classic view", () => {
    // Asserted as a shape rather than as literal track widths: the classic view
    // still mounts TailorMatchSidebar, so it needs the leading `auto` track and
    // three tracks total. The widths themselves are free to be tuned.
    const m = SRC.match(/\.rb-tailor-workspace \{[^}]*grid-template-columns:\s*([^;]+);/);
    expect(m, "classic grid must set grid-template-columns").toBeTruthy();

    const value = m![1].trim();
    expect(value.startsWith("auto")).toBe(true);
    const tracks = value.replace(/minmax\([^)]*\)/g, "T").split(/\s+/).filter(Boolean);
    expect(tracks).toHaveLength(3);
  });

  it("collapses the queue layout to a single column on mobile", () => {
    // The queue layout carries BOTH classes, so the narrow-viewport override on
    // `.rb-tailor-workspace` collapses it too — but only because equal-specificity
    // rules are resolved by source order. If the `--queue` rule were ever moved
    // below the media query it would win at every width and /tailor-2 would keep
    // two side-by-side columns on a phone. That ordering is the invariant here.
    const queueRule = SRC.indexOf(".rb-tailor-workspace--queue {");
    expect(queueRule, "queue rule must exist").toBeGreaterThan(-1);

    const mq = SRC.search(/@media \(max-width: \d+px\) \{\s*\n\s*\.rb-tailor-workspace\b/);
    expect(mq, "a narrow-viewport override for the workspace must exist").toBeGreaterThan(-1);
    expect(mq).toBeGreaterThan(queueRule);

    const collapsed = SRC.slice(mq, SRC.indexOf("}", mq));
    expect(collapsed).toContain("grid-template-columns: 1fr");
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
