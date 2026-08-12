import { describe, expect, it } from "vitest";
import { gapFixEmptyError } from "@/lib/gapFixEmptyReason";

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
