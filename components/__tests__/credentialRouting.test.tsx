import { describe, expect, it } from "vitest";
import { ACTION_LABEL, itemAction } from "@/components/tailor/TailorWorkQueue";
import { CREDENTIAL_REFUSAL_DETAIL } from "@/lib/tailorRequirementQueue";
import type { QueueItem } from "@/lib/tailorWorkQueue";

/**
 * Field report 2026-08-07, with screenshots. Handed "Master's degree" — a thing
 * no bullet rewrite can evidence — the fixer did not decline. It rewrote an
 * unrelated LangGraph bullet and justified it as "aligns this bullet with the
 * gap using SOCOM", while its own score preview read 47.19% -> 47.19%.
 *
 * So a credential never reaches the bullet fixer. Which branch it takes is the
 * honesty question, and both directions are pinned:
 *   partial       => the résumé HAS it, the scanner cannot see the wording.
 *                    Surfacing it in Education is TRUE.
 *   not_evidenced => they do not have it. Offering to add it would be offering
 *                    to fabricate a credential.
 */
const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  id: "q1",
  name: "Master's degree",
  kind: "qualification",
  status: "queued",
  detail: "",
  ...over,
});

describe("a credential never routes to the bullet fixer", () => {
  it("offers Add to education when the résumé already shows it", () => {
    expect(itemAction(item(), "partial")).toBe("add_education");
  });

  it("offers NOTHING to add when the credential is not evidenced", () => {
    // Never "add_education" here: that is an offer to fabricate a degree.
    expect(itemAction(item(), "not_evidenced")).toBe("no_fabrication");
  });

  it("never returns fix for a degree, whatever the verdict", () => {
    for (const v of ["partial", "not_evidenced", "covered", undefined] as const) {
      expect(itemAction(item(), v)).not.toBe("fix");
    }
  });

  it("covers certifications and licences, not just degrees", () => {
    expect(itemAction(item({ name: "AWS certification" }), "not_evidenced")).toBe("no_fabrication");
    expect(itemAction(item({ name: "Active security clearance" }), "not_evidenced")).toBe("no_fabrication");
  });

  it("leaves ordinary skill rows on the fixer", () => {
    // The regression that would gut the product: routing everything away from
    // the fixer because credentials needed to be.
    expect(itemAction(item({ name: "technical leadership" }), "not_evidenced")).toBe("fix");
    expect(itemAction(item({ name: "full stack development" }), "partial")).toBe("fix");
  });

  it("keeps the terminal states ahead of the credential rule", () => {
    expect(itemAction(item({ status: "ignored" }), "partial")).toBe("reconsider");
    expect(itemAction(item({ status: "applied" }), "partial")).toBe("view_change");
  });
});

/**
 * The refusal is the trust moment, so it says what is happening.
 *
 * A credential the résumé does not evidence used to render a grey "No action"
 * beside the generic "the scanner did not find this" — indistinguishable from a
 * tooling shortfall. What is actually happening is that the product declines to
 * claim a qualification the candidate does not hold, which is the one thing it
 * must never do. Said out loud, the constraint reads as the reason to trust the
 * rest of the page.
 */
describe("an unevidenced credential states the refusal", () => {
  it("does not reuse the generic 'No action' label", () => {
    expect(ACTION_LABEL.no_fabrication).not.toBe(ACTION_LABEL.no_action);
    // REVOICED, founder-directed 2026-08-13: "We won't add this" was honest
    // and read as a scolding. The label now frames the same refusal as the
    // protection it is. The refusal must still be FELT as deliberate — the
    // label names the user as the one being protected.
    expect(ACTION_LABEL.no_fabrication.toLowerCase()).toMatch(/protect/);
    expect(ACTION_LABEL.no_fabrication.toLowerCase()).not.toMatch(/won't|refuse|never/);
  });

  it("explains the refusal rather than blaming the scanner", () => {
    // The reason is the user's OWN stake (background checks), not our rules.
    expect(CREDENTIAL_REFUSAL_DETAIL.toLowerCase()).toMatch(/background check/);
    expect(CREDENTIAL_REFUSAL_DETAIL.toLowerCase()).toMatch(/safe/);
    expect(CREDENTIAL_REFUSAL_DETAIL).not.toMatch(/scanner did not find/i);
    // And the scold-words stay gone.
    expect(CREDENTIAL_REFUSAL_DETAIL).not.toMatch(/won't claim|yours to earn/i);
  });
});
