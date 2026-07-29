import { describe, expect, it } from "vitest";
import { prepareKeywordTerms } from "@/lib/keywordInlinePills";

describe("prepareKeywordTerms", () => {
  it("dedupes case-insensitively and sorts longest first", () => {
    expect(prepareKeywordTerms(["AWS", "aws", "TensorRT-LLM", "LLM"])).toEqual([
      "TensorRT-LLM",
      "AWS",
      "LLM",
    ]);
  });

  it("drops empty and single-char noise", () => {
    expect(prepareKeywordTerms(["", " ", "a", "Go"])).toEqual(["Go"]);
  });
});
