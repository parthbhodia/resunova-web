import { describe, expect, it } from "vitest";
import {
  computeExtractionProgress,
  formatEtaHours,
  formatWorkerLine,
  maxConcurrentExtractors,
} from "@/lib/extractionProgress";

describe("computeExtractionProgress", () => {
  it("reports percent of extractable window", () => {
    const p = computeExtractionProgress({ extracted: 52848, pending: 188209 });
    expect(p.total).toBe(241057);
    expect(p.pct).toBe(21.9);
    expect(p.etaHours).toBeNull();
  });

  it("uses recent daily rate for ETA", () => {
    const p = computeExtractionProgress({
      extracted: 1000,
      pending: 2000,
      windowExtracted: 3000,
      windowDays: 30,
      dailyExtracted: [
        { date: "2026-10-12", extracted: 100 },
        { date: "2026-10-13", extracted: 500 },
        { date: "2026-10-14", extracted: 500 },
      ],
    });
    expect(p.recentRatePerDay).toBeCloseTo(1100 / 3, 5);
    expect(p.etaHours).toBeCloseTo((2000 / (1100 / 3)) * 24, 0);
  });

  it("marks complete when pending is zero", () => {
    const p = computeExtractionProgress({ extracted: 50, pending: 0 });
    expect(p.pct).toBe(100);
    expect(p.etaHours).toBe(0);
  });
});

describe("formatEtaHours", () => {
  it("formats ranges", () => {
    expect(formatEtaHours(null)).toBe("unknown");
    expect(formatEtaHours(0)).toBe("done");
    expect(formatEtaHours(0.5)).toBe("30 min");
    expect(formatEtaHours(12)).toBe("12 h");
    expect(formatEtaHours(72)).toBe("3 days");
  });
});

describe("maxConcurrentExtractors", () => {
  it("counts overlapping skip_fetch sweeps", () => {
    const peak = maxConcurrentExtractors([
      { started_at: "2026-10-15T17:00:00.000Z", duration_ms: 600_000, skip_fetch: true },
      { started_at: "2026-10-15T17:05:00.000Z", duration_ms: 300_000, skip_fetch: true },
      { started_at: "2026-10-15T16:00:00.000Z", duration_ms: 60_000, skip_fetch: false },
    ]);
    expect(peak).toBe(2);
  });
});

describe("formatWorkerLine", () => {
  it("joins host, OS, GPU, and model", () => {
    expect(
      formatWorkerLine({
        hostname: "DESKTOP-ABC",
        platform: "Windows",
        gpu: "NVIDIA GeForce RTX 4090, 24564 MiB",
        model: "qwen2.5:14b-instruct",
        batch: 80,
      }),
    ).toBe(
      "DESKTOP-ABC · Windows · NVIDIA GeForce RTX 4090, 24564 MiB · qwen2.5:14b-instruct · batch 80",
    );
  });
});
