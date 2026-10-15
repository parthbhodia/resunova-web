import { describe, expect, it } from "vitest";
import { rescoreAnalysisId, rescoreBodyHasScore, rescoreBodyToOutcome } from "@/lib/rescoreOutcome";

const fileName = "Acme · Engineer";

describe("a rescore response the Analyze page can adopt", () => {
  it("keeps a scored body as a successful report", () => {
    const outcome = rescoreBodyToOutcome(200, { overallScore: 72, analysisId: "a1" }, fileName);
    expect(outcome.ok).toBe(true);
    expect(outcome.json.overallScore).toBe(72);
    expect(outcome.fileName).toBe(fileName);
  });

  it("accepts a score of zero and a snake_case score", () => {
    expect(rescoreBodyToOutcome(200, { overallScore: 0 }, fileName).ok).toBe(true);
    expect(rescoreBodyToOutcome(200, { overall_score: 64 }, fileName).ok).toBe(true);
  });

  it("rejects NaN, numeric strings, and a missing score", () => {
    expect(rescoreBodyToOutcome(200, { overallScore: Number.NaN }, fileName).ok).toBe(false);
    expect(rescoreBodyToOutcome(200, { overallScore: "72" }, fileName).ok).toBe(false);
    expect(rescoreBodyToOutcome(200, {}, fileName).json.error).toMatch(/couldn't be saved/i);
  });

  it("does not crash on null, an array, or a string body", () => {
    for (const body of [null, ["nope"], "nope"]) {
      const outcome = rescoreBodyToOutcome(200, body, fileName);
      expect(outcome.ok).toBe(false);
      expect(outcome.json.error).toMatch(/couldn't be saved/i);
    }
  });

  it("preserves a refusal payload and fills in a message when the body has none", () => {
    const refused = rescoreBodyToOutcome(402, { error: "Daily limit", remedy: "upgrade", limit: 3 }, fileName);
    expect(refused).toMatchObject({
      ok: false,
      status: 402,
      json: { error: "Daily limit", remedy: "upgrade", limit: 3 },
    });
    expect(rescoreBodyToOutcome(500, null, fileName).json.error).toMatch(/couldn't run the scan/i);
  });

  it("loads the score from the saved row when the response is only an id", () => {
    const outcome = rescoreBodyToOutcome(
      200,
      { analysisId: " row-1 " },
      fileName,
      { result: { overall_score: 81, bulletAnalysis: [] }, score: 81 },
    );
    expect(outcome.ok).toBe(true);
    expect(outcome.json).toMatchObject({ overall_score: 81, analysisId: "row-1" });
  });

  it("uses the row score only when the saved JSON is already an analysis", () => {
    const filled = rescoreBodyToOutcome(
      200,
      { analysisId: "row-2" },
      fileName,
      { result: { extractedText: "Led the migration." }, score: 70 },
    );
    expect(filled.ok).toBe(true);
    expect(filled.json.overallScore).toBe(70);

    const empty = rescoreBodyToOutcome(200, { analysisId: "row-3" }, fileName, { result: {}, score: 70 });
    expect(empty.ok).toBe(false);
  });

  it("only treats a real id and a finite score as worth a saved-row lookup", () => {
    expect(rescoreAnalysisId({ analysisId: "  abc  " })).toBe("abc");
    expect(rescoreAnalysisId({ analysisId: 12 })).toBe("");
    expect(rescoreAnalysisId(null)).toBe("");
    expect(rescoreBodyHasScore({ overallScore: 0 })).toBe(true);
    expect(rescoreBodyHasScore({ overallScore: Number.NaN })).toBe(false);
    expect(rescoreBodyHasScore(["72"])).toBe(false);
  });

  it("ignores a saved result that is null or an array", () => {
    expect(rescoreBodyToOutcome(200, { analysisId: "x" }, fileName, { result: null, score: 10 }).ok).toBe(false);
    expect(rescoreBodyToOutcome(200, { analysisId: "x" }, fileName, { result: ["nope"], score: 10 }).ok).toBe(false);
    expect(rescoreBodyToOutcome(200, { analysisId: "x" }, fileName, null).ok).toBe(false);
  });
});
