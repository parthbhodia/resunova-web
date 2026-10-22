import { describe, expect, it } from "vitest";
import {
  DEPTH_THRESHOLD,
  DWELL_MS,
  MEMORY_KEY,
  SNOOZE_MS,
  articleDepth,
  isEligible,
  isSuppressed,
  markShownThisSession,
  promptVariantFor,
  readMemory,
  rememberNever,
  rememberSnooze,
  shownThisSession,
} from "@/lib/blogPrompt";

/** Enough of Storage for these functions, plus a switch to make it misbehave. */
function fakeStorage(initial: Record<string, string> = {}, opts: { throws?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      if (opts.throws) throw new Error("blocked");
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (opts.throws) throw new Error("blocked");
      data.set(key, value);
    },
  };
}

describe("which offer a reader gets", () => {
  it("offers the next analysis by email on a data post", () => {
    expect(promptVariantFor("linkedin-applicant-count-clicks-not-applications", false)).toBe("email");
    expect(promptVariantFor("salary-transparency-by-seniority", true)).toBe("email");
  });

  it("offers a posting check on a résumé post to someone who is signed out", () => {
    expect(promptVariantFor("tailor-resume-to-job-description", false)).toBe("posting_check");
    expect(promptVariantFor("how-ats-really-works", false)).toBe("posting_check");
  });

  it("never shows the résumé offer to a signed-in reader, whose footnote would be false", () => {
    // The offer's footnote promises a sign-in step. For someone who already has
    // an account that is a claim about them that is wrong.
    expect(promptVariantFor("tailor-resume-to-job-description", true)).toBe("email");
  });

  it("offers nothing on the methodology page", () => {
    expect(promptVariantFor("methodology", false)).toBeNull();
    expect(promptVariantFor("methodology", true)).toBeNull();
  });

  it("offers nothing until it is known whether the reader is signed in", () => {
    // Offering the résumé card first and swapping it would show a signed-in
    // reader the wrong claim for a moment.
    expect(promptVariantFor("tailor-resume-to-job-description", null)).toBeNull();
    expect(promptVariantFor("ghost-jobs-duplicate-postings", null)).toBeNull();
  });
});

describe("articleDepth", () => {
  it("is the fraction of the article above the bottom of the viewport", () => {
    // Article starts at the top of the viewport and is 2000px tall; an 800px
    // viewport has reached 40% of it.
    expect(articleDepth({ top: 0, height: 2000 }, 800)).toBeCloseTo(0.4);
    // Scrolled 600px down: the bottom edge is now 1400px into it.
    expect(articleDepth({ top: -600, height: 2000 }, 800)).toBeCloseTo(0.7);
  });

  it("is 0 before the article reaches the viewport and 1 once it is past", () => {
    expect(articleDepth({ top: 900, height: 2000 }, 800)).toBe(0);
    expect(articleDepth({ top: -5000, height: 2000 }, 800)).toBe(1);
  });

  it("is 0 for an empty article or viewport rather than NaN or Infinity", () => {
    expect(articleDepth({ top: 0, height: 0 }, 800)).toBe(0);
    expect(articleDepth({ top: 0, height: 2000 }, 0)).toBe(0);
    expect(articleDepth({ top: Number.NaN, height: 2000 }, 800)).toBe(0);
  });
});

describe("isEligible needs BOTH depth and visible time", () => {
  const base = { variant: "email" as const, depth: 0.9, dwellMs: DWELL_MS * 2, suppressed: false, shownThisSession: false };

  it("passes when both are met", () => {
    expect(isEligible(base)).toBe(true);
  });

  it("is exactly at the thresholds, not just past them", () => {
    expect(isEligible({ ...base, depth: DEPTH_THRESHOLD, dwellMs: DWELL_MS })).toBe(true);
    expect(isEligible({ ...base, depth: DEPTH_THRESHOLD - 0.01 })).toBe(false);
    expect(isEligible({ ...base, dwellMs: DWELL_MS - 1 })).toBe(false);
  });

  it("the thresholds are the product decision, written out", () => {
    // The assertions above are relative to the constants, so retuning a constant
    // moves them in lockstep and nothing goes red. This pins the VALUES: half
    // the article and 45 seconds, so changing either is a deliberate edit here.
    expect(DEPTH_THRESHOLD).toBe(0.5);
    expect(DWELL_MS).toBe(45_000);
    expect(isEligible({ ...base, depth: 0.45, dwellMs: 45_000 })).toBe(false);
    expect(isEligible({ ...base, depth: 0.5, dwellMs: 44_999 })).toBe(false);
    expect(isEligible({ ...base, depth: 0.5, dwellMs: 45_000 })).toBe(true);
  });

  it("does not fire on depth alone (skimming) or time alone (a forgotten tab)", () => {
    expect(isEligible({ ...base, dwellMs: 0 })).toBe(false);
    expect(isEligible({ ...base, depth: 0 })).toBe(false);
  });

  it("stays quiet when suppressed, already shown this session, or with nothing to offer", () => {
    expect(isEligible({ ...base, suppressed: true })).toBe(false);
    expect(isEligible({ ...base, shownThisSession: true })).toBe(false);
    expect(isEligible({ ...base, variant: null })).toBe(false);
  });
});

describe("what the prompt remembers", () => {
  const NOW = Date.parse("2026-10-22T12:00:00Z");

  it("starts empty", () => {
    expect(readMemory(fakeStorage())).toEqual({});
    expect(isSuppressed({}, NOW)).toBe(false);
  });

  it("a close is a 30-day snooze, not a goodbye", () => {
    const DAY = 24 * 60 * 60 * 1000;
    // Written as a literal so a retune cannot move this assertion with it.
    expect(SNOOZE_MS).toBe(30 * DAY);
    const store = fakeStorage();
    rememberSnooze(store, NOW);
    expect(isSuppressed(readMemory(store), NOW + 29 * DAY)).toBe(true);
    expect(isSuppressed(readMemory(store), NOW + 31 * DAY)).toBe(false);
    const memory = readMemory(store);
    expect(memory.snoozedUntil).toBe(NOW + SNOOZE_MS);
    expect(isSuppressed(memory, NOW + SNOOZE_MS - 1)).toBe(true);
    expect(isSuppressed(memory, NOW + SNOOZE_MS)).toBe(false);
  });

  it("'don't show again', a signup and a click are permanent", () => {
    const store = fakeStorage();
    rememberNever(store);
    expect(isSuppressed(readMemory(store), NOW + SNOOZE_MS * 100)).toBe(true);
  });

  it("a snooze does not erase a permanent no", () => {
    const store = fakeStorage();
    rememberNever(store);
    rememberSnooze(store, NOW);
    expect(readMemory(store).never).toBe(true);
  });

  it("survives blocked storage by forgetting, never by throwing", () => {
    const blocked = fakeStorage({}, { throws: true });
    expect(() => rememberNever(blocked)).not.toThrow();
    expect(() => rememberSnooze(blocked, NOW)).not.toThrow();
    expect(readMemory(blocked)).toEqual({});
    expect(readMemory(null)).toEqual({});
  });

  it("ignores a corrupt or hostile stored value", () => {
    expect(readMemory(fakeStorage({ [MEMORY_KEY]: "not json" }))).toEqual({});
    expect(readMemory(fakeStorage({ [MEMORY_KEY]: JSON.stringify("a string") }))).toEqual({});
    // A non-number snooze must not read as "suppressed forever".
    expect(isSuppressed(readMemory(fakeStorage({ [MEMORY_KEY]: JSON.stringify({ snoozedUntil: "soon", never: "yes" }) })), NOW)).toBe(false);
  });

  it("remembers per session separately from per visitor", () => {
    const session = fakeStorage();
    expect(shownThisSession(session)).toBe(false);
    markShownThisSession(session);
    expect(shownThisSession(session)).toBe(true);
    expect(shownThisSession(fakeStorage({}, { throws: true }))).toBe(false);
  });
});
