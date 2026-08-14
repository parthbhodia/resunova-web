import { describe, expect, it } from "vitest";
import { gapFixAppendDelta, mergeGapFixSuggestions } from "@/lib/gapFixAppendDelta";

const ORIGINAL =
  "Built and maintained scalable Vue.js and TypeScript frontends for federal "
  + "compliance platforms, implementing HTMX for real-time UI updates.";

describe("gapFixAppendDelta", () => {
  it("reports the added clause and where it starts", () => {
    const suggested = ORIGINAL.replace(
      /updates\.$/,
      "updates, and conducting accessibility audits to ensure WCAG-compliant interfaces.",
    );
    const d = gapFixAppendDelta(ORIGINAL, suggested);
    expect(d.kind).toBe("append");
    if (d.kind !== "append") return;
    expect(d.added).toContain("accessibility audits");
    expect(suggested.slice(d.addedStart, d.addedEnd)).toBe(d.added);
  });

  it("survives the trailing period moving to the end of the new clause", () => {
    // "…updates." → "…updates, now with tracing." The period moves, so a plain
    // prefix scan would call the whole tail new.
    const d = gapFixAppendDelta("Shipped the parser and the linter.", "Shipped the parser and the linter, now with tracing.");
    expect(d.kind).toBe("append");
    if (d.kind !== "append") return;
    expect(d.added.toLowerCase()).toContain("tracing");
    expect(d.added.toLowerCase()).not.toContain("shipped");
  });

  it("tolerates smart quotes and casing drift in the shared part", () => {
    const a = "Owned the team's release process end to end for the platform";
    const b = "Owned the team’s release process end to end for the platform and its rollback path";
    const d = gapFixAppendDelta(a, b);
    expect(d.kind).toBe("append");
  });

  it("calls a materially reworded bullet a rewrite, not an append", () => {
    const d = gapFixAppendDelta(
      "Built and maintained scalable Vue.js frontends for compliance platforms",
      "Designed an internal developer platform using LangGraph agent workflows and LiteLLM",
    );
    expect(d.kind).toBe("rewrite");
  });

  it("reports identical text as a no-op", () => {
    expect(gapFixAppendDelta(ORIGINAL, ORIGINAL).kind).toBe("noop");
  });

  it("handles a mid-sentence insertion", () => {
    const d = gapFixAppendDelta(
      "Designed and implemented a multi-step agent workflow for the security tool",
      "Designed and implemented a multi-step agent workflow in C++ and Python for the security tool",
    );
    expect(d.kind).toBe("append");
    if (d.kind !== "append") return;
    expect(d.added).toBe("in C++ and Python");
  });

  it("declines to guess on inputs too short to judge", () => {
    expect(gapFixAppendDelta("Led the team", "Led the team well").kind).toBe("unknown");
    expect(gapFixAppendDelta("", "anything at all here").kind).toBe("unknown");
  });

  it("treats an empty suggestion as a no-op rather than throwing", () => {
    expect(gapFixAppendDelta(ORIGINAL, "").kind).toBe("noop");
  });

  it("never throws on a half-typed draft", () => {
    for (let i = 0; i < ORIGINAL.length; i += 7) {
      expect(() => gapFixAppendDelta(ORIGINAL, ORIGINAL.slice(0, i))).not.toThrow();
    }
  });
});

describe("mergeGapFixSuggestions", () => {
  const base = "Shipped the ingestion pipeline and the alerting rules for the platform.";

  it("keeps BOTH additions when two suggestions target one bullet", () => {
    const a = "Shipped the ingestion pipeline and the alerting rules for the platform, cutting alert latency.";
    const b = "Shipped the ingestion pipeline and the alerting rules for the platform, adding on-call runbooks.";
    const merged = mergeGapFixSuggestions(base, [a, b]);
    expect(merged).toBeTruthy();
    expect(merged!.toLowerCase()).toContain("alert latency");
    expect(merged!.toLowerCase()).toContain("on-call runbooks");
  });

  it("passes a single suggestion through unchanged", () => {
    const only = base.replace(/\.$/, ", with tracing.");
    expect(mergeGapFixSuggestions(base, [only])).toBe(only);
  });

  it("does not duplicate an addition already present", () => {
    const a = "Shipped the ingestion pipeline and the alerting rules for the platform, cutting alert latency.";
    const merged = mergeGapFixSuggestions(base, [a, a]);
    expect(merged).toBeTruthy();
    expect(merged!.toLowerCase().split("alert latency").length - 1).toBe(1);
  });

  it("refuses to merge when one member is a real rewrite", () => {
    const rewrite = "Owned an entirely different system built on Kafka and Flink end to end.";
    const append = base.replace(/\.$/, ", cutting alert latency.");
    expect(mergeGapFixSuggestions(base, [append, rewrite])).toBeNull();
  });

  it("returns null when nothing would change", () => {
    expect(mergeGapFixSuggestions(base, [base, base])).toBeNull();
    expect(mergeGapFixSuggestions(base, [])).toBeNull();
  });

  describe("mid-sentence insertions land mid-sentence", () => {
    // Field screenshot 2026-08-14: the applied bullet ended "…for clients.
    // And Golang, and C++ ✓" — both suggestions had woven their tech INTO
    // "a serverless Python … backend", and the merge flattened them onto the
    // tail as a fragment. The words go where the writer put them.
    const BULLET =
      "Developed a personalized knowledge assistant chatbot leveraging LLMs via "
      + "Amazon Bedrock and Pinecone vector database, with a serverless Python "
      + "backend (AWS Lambda + API Gateway) and AWS Amplify frontend, reducing "
      + "time-to-information retrieval by 50% for clients.";
    const GOLANG = BULLET.replace("serverless Python backend", "serverless Python and Golang backend");
    const CPP = BULLET.replace("serverless Python backend", "serverless Python and C++ backend");

    it("stacks two insertions at their shared point, never as a tail fragment", () => {
      const merged = mergeGapFixSuggestions(BULLET, [GOLANG, CPP]);
      expect(merged).toBeTruthy();
      expect(merged!).toContain("Python and Golang and C++ backend");
      expect(merged!).not.toMatch(/clients\.\s*And /);
      expect(merged!).toMatch(/for clients\.$/);
    });

    it("a mid insertion and an end addition each keep their own place", () => {
      const tail = BULLET.replace(/\.$/, ", serving three federal programs.");
      const merged = mergeGapFixSuggestions(BULLET, [CPP, tail]);
      expect(merged).toBeTruthy();
      expect(merged!).toContain("Python and C++ backend");
      expect(merged!).toMatch(/serving three federal programs\.?$/i);
    });
  });
});
