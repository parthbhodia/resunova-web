import { describe, expect, it } from "vitest";
import { gapFixEmptyError, withOneRetryOnFailure } from "@/lib/gapFixEmptyReason";

/**
 * Which empty gap-fix responses are OUR failures, and which are honest ends.
 *
 * Getting this routing wrong is not cosmetic: two of the four reasons are the
 * product's own outage/over-filtering, and rendering those through the empty
 * state told paying users their experience could not support a requirement.
 * That is the complaint that reached the founder's inbox.
 */
describe("gapFixEmptyError", () => {
  it("raises an outage as an outage", () => {
    expect(gapFixEmptyError("no_llm_output")).toMatch(/try again/i);
  });

  it("raises a fully-filtered batch as our miss, never as a verdict", () => {
    // The model wrote rewrites; our validators dropped every one. Production
    // logs show this on a candidate's STRONGEST match. The copy owns it and
    // offers the retry that genuinely works.
    const msg = gapFixEmptyError("all_filtered");
    expect(msg).toMatch(/our accuracy checks/i);
    expect(msg).not.toMatch(/your résumé|your experience|doesn't have/i);
  });

  it("lets the honest outcomes reach the empty state", () => {
    // One empty model pass and a deterministic refusal are not errors; the
    // expansion's empty copy handles them without judging the candidate.
    expect(gapFixEmptyError("none_proposed")).toBeNull();
    expect(gapFixEmptyError("not_evidenced")).toBeNull();
    expect(gapFixEmptyError(undefined)).toBeNull();
    expect(gapFixEmptyError("")).toBeNull();
  });
});

/**
 * The client's own retry: founder-directed 2026-08-14, "we should retry on
 * our own till we pass it and not leave on to the users". One fresh pass on
 * a retryable empty, never on a verdict, never more than one.
 */
describe("withOneRetryOnFailure", () => {
  const attempts = <T,>(results: T[]) => {
    let i = 0;
    const fn = async () => results[Math.min(i++, results.length - 1)];
    return { fn, calls: () => i };
  };

  it("retries a retryable empty once and returns the recovery", async () => {
    const { fn, calls } = attempts([
      { usable: [], failure: "our miss" },
      { usable: ["fix"], failure: null },
    ]);
    const out = await withOneRetryOnFailure(fn);
    expect(calls()).toBe(2);
    expect(out.usable).toEqual(["fix"]);
    expect(out.failure).toBeNull();
  });

  it("does not touch a first-pass success", async () => {
    const { fn, calls } = attempts([{ usable: ["fix"], failure: null }]);
    await withOneRetryOnFailure(fn);
    expect(calls()).toBe(1);
  });

  it("never re-argues a verdict empty", async () => {
    // failure null + nothing usable = none_proposed / not_evidenced. The
    // model saying nothing IS an answer; a retry here burns money to argue.
    const { fn, calls } = attempts([{ usable: [], failure: null }]);
    const out = await withOneRetryOnFailure(fn);
    expect(calls()).toBe(1);
    expect(out.failure).toBeNull();
  });

  it("stops after the one retry, surfacing the failure", async () => {
    const { fn, calls } = attempts([
      { usable: [], failure: "our miss" },
      { usable: [], failure: "our miss again" },
      { usable: ["never reached"], failure: null },
    ]);
    const out = await withOneRetryOnFailure(fn);
    expect(calls()).toBe(2);
    expect(out.failure).toBe("our miss again");
  });
});
