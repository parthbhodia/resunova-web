import { describe, expect, it } from "vitest";
import { dayLabel, failureRate, fillDays, fillHours, fmtHours, hourLabel, longCallShare, newYorkToday, niceTicks, pipelineTotals } from "@/lib/adminPipeline";
import type { PipelineDay, PipelineHour } from "@/lib/adminPipeline";

const day = (d: string, extracted: number, failures: number, short = 0, long = 0): PipelineDay => ({
  d, batches: extracted ? 300 : 0, empty_batches: 0, full_scans: 1, extracted, failures,
  upserted: 0, deactivated: 0, short_calls: short, long_calls: long,
});
const hour = (h: string, batches: number, extracted: number, failures = 0): PipelineHour =>
  ({ h, batches, empty_batches: extracted ? 0 : batches, extracted, failures });

describe("niceTicks", () => {
  it("rounds up to a readable top", () => {
    expect(niceTicks(29254)).toEqual([0, 10000, 20000, 30000]);
    expect(niceTicks(1575)).toEqual([0, 500, 1000, 1500, 2000]);
    expect(niceTicks(7.3)).toEqual([0, 2, 4, 6, 8]);
  });
  it("has an axis even with no data", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});

describe("rates", () => {
  it("failure rate is failures over attempts", () => {
    expect(failureRate({ extracted: 29254, failures: 346 })).toBe(1.2);
    expect(failureRate({ extracted: 0, failures: 0 })).toBeNull();
  });
  it("long-call share is long over all calls", () => {
    expect(longCallShare({ short_calls: 8766, long_calls: 873 })).toBe(9.1);
    expect(longCallShare({ short_calls: 70, long_calls: 30 })).toBe(30);
  });
});

describe("pipelineTotals", () => {
  const data = {
    daily: [day("2026-11-25", 29254, 346, 28219, 1481), day("2026-11-26", 27286, 531, 26036, 1674), day("2026-11-27", 9180, 355, 8766, 873)],
    hourly: [hour("2026-11-27T03:00", 400, 0), hour("2026-11-27T04:00", 0, 0), hour("2026-11-27T11:00", 18, 960)],
  };
  it("averages full days only and counts idle hours", () => {
    const t = pipelineTotals(data, "2026-11-27");
    expect(t.extracted).toBe(65720);
    expect(t.perDay).toBe(28270);
    expect(t.idleHours48h).toBe(1);
    expect(t.failureRate).toBe(1.8);
    expect(t.longShare7d).toBe(6);
  });
});

describe("labels", () => {
  it("formats waits", () => {
    expect(fmtHours(0.25)).toBe("15 min");
    expect(fmtHours(4)).toBe("4.0 h");
    expect(fmtHours(64.8)).toBe("2.7 d");
    expect(fmtHours(null)).toBe("—");
  });
  it("formats hours and days", () => {
    expect(hourLabel("2026-11-27T00:00")).toBe("12am");
    expect(hourLabel("2026-11-27T15:00")).toBe("3pm");
    expect(dayLabel("2026-11-27")).toBe("Nov 27");
  });
  it("uses New York's date", () => {
    expect(newYorkToday(new Date("2026-11-28T03:00:00Z"))).toBe("2026-11-27");
  });
});

describe("gap filling", () => {
  it("adds the days with no batches", () => {
    const filled = fillDays([day("2026-11-20", 5, 0), day("2026-11-23", 7, 0)], "2026-11-24");
    expect(filled.map(d => d.d)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"]);
    expect(filled[1].extracted).toBe(0);
  });
  it("adds the hours with no batches", () => {
    const filled = fillHours([hour("2026-11-26T22:00", 10, 800), hour("2026-11-27T01:00", 10, 900)]);
    expect(filled.map(h => h.h)).toEqual(["2026-11-26T22:00", "2026-11-26T23:00", "2026-11-27T00:00", "2026-11-27T01:00"]);
  });
});
