/**
 * "Tailor from a saved version" must arrive with the résumé loaded.
 *
 * Tailor's first step is satisfied only by profile text. Library stashed the
 * job but not the résumé, so the user landed on an empty upload step that
 * reads as being sent back to Analyze.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  stashTailorPrefillFromLibrary,
  TAILOR_PREFILL_COMPANY,
  TAILOR_PREFILL_JD,
  TAILOR_PREFILL_PROFILE,
  TAILOR_PREFILL_ROLE,
  TAILOR_PREFILL_STRUCTURED,
} from "@/lib/tailorPrefill";

const structured = {
  full_name: "Ada Lovelace",
  headline: "Backend Engineer",
  experience: [{ role: "Engineer", company: "Acme", bullets: ["Shipped the queue"] }],
};

beforeEach(() => sessionStorage.clear());

describe("stashTailorPrefillFromLibrary", () => {
  it("stashes the résumé text and structured doc alongside the job", () => {
    stashTailorPrefillFromLibrary({
      company: "Acme",
      role: "Backend Engineer",
      job_description: "Build queues.",
      resume_doc: { profile: "Ada Lovelace\nBackend Engineer", structured },
    });
    expect(sessionStorage.getItem(TAILOR_PREFILL_COMPANY)).toBe("Acme");
    expect(sessionStorage.getItem(TAILOR_PREFILL_ROLE)).toBe("Backend Engineer");
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBe("Build queues.");
    expect(sessionStorage.getItem(TAILOR_PREFILL_PROFILE)).toBe("Ada Lovelace\nBackend Engineer");
    expect(JSON.parse(sessionStorage.getItem(TAILOR_PREFILL_STRUCTURED)!)).toEqual(structured);
  });

  it("derives the résumé text from the structured doc when no text was saved", () => {
    stashTailorPrefillFromLibrary({ resume_doc: { structured } });
    const profile = sessionStorage.getItem(TAILOR_PREFILL_PROFILE) ?? "";
    expect(profile).toContain("Ada Lovelace");
    expect(profile).toContain("• Shipped the queue");
    expect(sessionStorage.getItem(TAILOR_PREFILL_STRUCTURED)).not.toBeNull();
  });

  it("accepts the older structuredResume key", () => {
    stashTailorPrefillFromLibrary({ resume_doc: { profile: "Ada", structuredResume: structured } });
    expect(JSON.parse(sessionStorage.getItem(TAILOR_PREFILL_STRUCTURED)!)).toEqual(structured);
  });

  it("clears a previously stashed résumé when this version has none", () => {
    sessionStorage.setItem(TAILOR_PREFILL_PROFILE, "Someone else's résumé");
    sessionStorage.setItem(TAILOR_PREFILL_STRUCTURED, JSON.stringify({ full_name: "Someone" }));
    stashTailorPrefillFromLibrary({ company: "Acme", resume_doc: null });
    expect(sessionStorage.getItem(TAILOR_PREFILL_PROFILE)).toBeNull();
    expect(sessionStorage.getItem(TAILOR_PREFILL_STRUCTURED)).toBeNull();
    expect(sessionStorage.getItem(TAILOR_PREFILL_COMPANY)).toBe("Acme");
  });

  it("stashes only the résumé when given only the résumé", () => {
    stashTailorPrefillFromLibrary({ resume_doc: { profile: "Ada" } });
    expect(sessionStorage.getItem(TAILOR_PREFILL_PROFILE)).toBe("Ada");
    expect(sessionStorage.getItem(TAILOR_PREFILL_STRUCTURED)).toBeNull();
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBeNull();
    expect(sessionStorage.getItem(TAILOR_PREFILL_COMPANY)).toBeNull();
  });
});
