import { describe, expect, it } from "vitest";
import { gapPillStyle } from "@/components/AnalyzeLiveResumeBody";

describe("gapPillStyle", () => {
  it("keeps the nowrap capsule for a short insert", () => {
    const s = gapPillStyle("Docker Compose");
    expect(s.whiteSpace).toBe("nowrap");
    expect(s.display).toBe("inline-flex");
  });

  it("wraps a long aggressive-mode clause instead of overflowing the paper", () => {
    // A real insert from the field report: ~150 chars of bolded clause shot
    // past the right edge of the résumé page because the capsule could not
    // line-break. Long inserts must flow with the text.
    const long =
      "large-scale system design patterns including distributed task queues, "
      + "network-aware retry policies, and multi-region data storage";
    const s = gapPillStyle(long);
    expect(s.whiteSpace).toBe("normal");
    expect(s.display).toBe("inline");
    // Rounded ends survive wrapping via box-decoration-break: clone.
    expect(s.boxDecorationBreak).toBe("clone");
  });

  it("switches exactly past the capsule budget", () => {
    expect(gapPillStyle("x".repeat(32)).whiteSpace).toBe("nowrap");
    expect(gapPillStyle("x".repeat(33)).whiteSpace).toBe("normal");
  });
});
