import { describe, expect, it } from "vitest";
import { tailorResultHeadline } from "@/lib/tailorResultHeadline";

/**
 * The page's first sentence, which is also a claim.
 *
 * This is the "peak" half of the results redesign: the outcome is stated as an
 * outcome, before anything asks for work. The failure mode of stating it early
 * is stating something untrue, so the wording moves with what has actually
 * happened.
 */
const q = { generating: false, queueUi: true, hasFolder: false };

describe("the tailor results headline", () => {
  it("does not call a résumé tailored before anything was tailored", () => {
    // The overclaim this exists to prevent. Someone lands on the queue having
    // applied nothing; "your tailored résumé" would be describing work the
    // product has not done yet.
    expect(tailorResultHeadline({ ...q, appliedCount: 0 })).toBe(
      "Your résumé is ready to download",
    );
  });

  it("still states an outcome before the first fix, rather than a page title", () => {
    // The other failure is going quiet. A neutral label is what buried the peak
    // in the first place, so the zero-fix line has to name something real that
    // the user has: a document they can download right now.
    const before = tailorResultHeadline({ ...q, appliedCount: 0 });
    expect(before).toMatch(/^your résumé is ready/i);
    expect(before).not.toMatch(/analysis|results|review/i);
  });

  it("claims the tailoring once a fix has landed", () => {
    expect(tailorResultHeadline({ ...q, appliedCount: 1 })).toBe(
      "Your tailored résumé is ready",
    );
  });

  it("says what is happening while a PDF compiles, on either surface", () => {
    expect(tailorResultHeadline({ ...q, generating: true, appliedCount: 3 })).toBe(
      "Building your PDF…",
    );
    expect(
      tailorResultHeadline({ generating: true, queueUi: false, hasFolder: true, appliedCount: 0 }),
    ).toBe("Building your PDF…");
  });

  it("leaves the classic results view exactly as it was", () => {
    // The redesign is scoped to /tailor-2. The classic view gates on a compiled
    // artifact, which is its own honest signal, and must not start reading the
    // applied count instead.
    const classic = { generating: false, queueUi: false };
    expect(tailorResultHeadline({ ...classic, hasFolder: true, appliedCount: 0 })).toBe(
      "Your tailored résumé is ready",
    );
    expect(tailorResultHeadline({ ...classic, hasFolder: false, appliedCount: 9 })).toBe(
      "Analysis ready — review gaps & download PDF",
    );
  });
});
