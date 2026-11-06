import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ResumeBuilder is ~7,000 lines and is not mounted by any unit test, so the one
 * line that connects the extension's fragment to the builder's prefill is
 * pinned in source: without it a posting handed from the extension arrives in
 * the address bar, is never read, and Tailor opens empty (the same silent
 * failure the History handoff once had).
 */
function strip(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("extension handoff wiring", () => {
  const src = strip(readFileSync(join(__dirname, "..", "..", "components", "ResumeBuilder.tsx"), "utf8"));

  it("takes the fragment inside the intent=job branch, before the prefill keys are read", () => {
    const branch = src.indexOf("if (intentJob) {");
    expect(branch).toBeGreaterThan(-1);
    const call = src.indexOf("consumeExtensionJobHandoff()", branch);
    const read = src.indexOf("sessionStorage.getItem(TAILOR_PREFILL_JD)", branch);
    expect(call).toBeGreaterThan(branch);
    expect(read).toBeGreaterThan(call);
  });

  it("does not take it on the Analyze or Template Studio handoffs", () => {
    expect(src.match(/consumeExtensionJobHandoff\(\)/g)).toHaveLength(1);
  });
});
