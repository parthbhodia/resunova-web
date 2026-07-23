import { describe, expect, it, beforeEach } from "vitest";
import { lsLoad, lsSave, lsPush } from "@/components/analyze/analyzeHistoryStore";
import type { AnalyzeRecord } from "@/lib/supabase";

// Characterization tests for the localStorage analyze-history fallback lifted
// out of AnalyzeResume in Slice 2 (docs/ANALYZE_REFACTOR_PLAN.md).

const rec = (id: string): AnalyzeRecord => ({
  id,
  label: `Résumé ${id}`,
  score: 70,
  createdAt: `2026-01-${id.padStart(2, "0")}T00:00:00Z`,
  result: null,
});

beforeEach(() => localStorage.clear());

describe("analyzeHistoryStore", () => {
  it("lsLoad returns [] when nothing is stored", () => {
    expect(lsLoad("user-1")).toEqual([]);
  });

  it("save → load round-trips", () => {
    lsSave("user-1", [rec("1"), rec("2")]);
    const out = lsLoad("user-1");
    expect(out.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("lsPush prepends the newest record", () => {
    lsSave("user-1", [rec("1")]);
    lsPush("user-1", rec("2"));
    expect(lsLoad("user-1").map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("caps stored history at 10 (LS_MAX), keeping the most recent", () => {
    for (let i = 1; i <= 12; i++) lsPush("user-1", rec(String(i)));
    const ids = lsLoad("user-1").map((r) => r.id);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe("12");        // newest kept
    expect(ids).not.toContain("1");   // oldest two dropped
    expect(ids).not.toContain("2");
  });

  it("scopes history per user id", () => {
    lsSave("user-1", [rec("a")]);
    lsSave("user-2", [rec("b")]);
    expect(lsLoad("user-1").map((r) => r.id)).toEqual(["a"]);
    expect(lsLoad("user-2").map((r) => r.id)).toEqual(["b"]);
  });

  it("lsLoad returns [] on corrupt JSON instead of throwing", () => {
    localStorage.setItem("rn_az_history_user-1", "{not valid json");
    expect(lsLoad("user-1")).toEqual([]);
  });
});
