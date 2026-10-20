import { describe, expect, it } from "vitest";
import {
  INVITE_ANNUAL_DAY_CAP,
  INVITE_REWARDS,
  OUTCOME_REWARD_KINDS,
  REFERRAL_OUTCOME_LABELS,
  REFERRAL_REWARD_DAYS,
  earnedDaysThisYear,
  grantedRewardDays,
  inviteDaysRemaining,
  invitePath,
  isReferralOutcome,
  isRewardKind,
  isRewardStatus,
  makeInviteCode,
  parseRewardEntry,
  pendingRewardDays,
  referralOutcomeError,
  rewardDaysLabel,
  rewardLabel,
  rewardStatusLabel,
  rewardSummary,
  sanitizeInviteCode,
  type RewardEntry,
} from "@/lib/referralRewards";

function entry(partial: Partial<RewardEntry> & Pick<RewardEntry, "kind">): RewardEntry {
  return {
    id: "r1",
    source: "desk_referral",
    days: 3,
    status: "granted",
    subject: null,
    createdAt: "2026-10-01T00:00:00Z",
    grantedAt: "2026-10-01T00:10:00Z",
    ...partial,
  };
}

describe("referral reward numbers", () => {
  it("pays the desk 3 days for a referral and 10 for an interview", () => {
    expect(REFERRAL_REWARD_DAYS.referred).toBe(3);
    expect(REFERRAL_REWARD_DAYS.interview).toBe(10);
  });

  it("pays nothing for the ask itself, which is the whole point", () => {
    // The ask is not in the ledger at all: an award here would buy drive-by asks.
    expect(Object.keys(REFERRAL_REWARD_DAYS)).not.toContain("asked");
    expect(REFERRAL_REWARD_DAYS.invite_signup).toBe(0);
  });

  it("treats an offer as the interview tier so the better outcome never pays less", () => {
    expect(OUTCOME_REWARD_KINDS.offer).toBe("interview");
    expect(OUTCOME_REWARD_KINDS.interview).toBe("interview");
    expect(OUTCOME_REWARD_KINDS.closed).toBeNull();
  });

  it("shows a placement without paying a second award for it", () => {
    // The hire is self-reported and unverifiable, so it maps to the same
    // 10-day kind the offer already earned. A direct null -> placed report
    // still gets those days, because the offer must have happened.
    expect(OUTCOME_REWARD_KINDS.placed).toBe("interview");
    expect(REFERRAL_OUTCOME_LABELS.placed).toBe("I got the job");
    expect(isReferralOutcome("placed")).toBe(true);
  });

  it("runs the invite curve so signup pays the friend and activation pays the referrer", () => {
    expect(INVITE_REWARDS.signed_up).toEqual({ referrerDays: 0, friendDays: 7, friendDiscountPct: 0 });
    expect(INVITE_REWARDS.activated.referrerDays).toBe(7);
    expect(INVITE_REWARDS.subscribed).toEqual({ referrerDays: 14, friendDays: 0, friendDiscountPct: 20 });
  });

  it("sums days by status and keeps pending separate from granted", () => {
    const rows = [
      entry({ kind: "referred", days: 3, status: "granted" }),
      entry({ id: "r2", kind: "interview", days: 10, status: "pending" }),
      entry({ id: "r3", kind: "referred", days: 3, status: "revoked" }),
    ];
    expect(pendingRewardDays(rows)).toBe(10);
    expect(grantedRewardDays(rows)).toBe(3);
  });

  it("caps invite earnings at the annual cap and never reports negative headroom", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    const rows = [
      entry({ kind: "invite_activated", source: "invite", days: 50, createdAt: "2026-02-01T00:00:00Z" }),
      entry({ id: "r2", kind: "invite_activated", source: "invite", days: 30, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    expect(earnedDaysThisYear(rows, now)).toBe(80);
    expect(inviteDaysRemaining(rows, now)).toBe(10);

    const over = [entry({ kind: "invite_activated", source: "invite", days: 200, createdAt: "2026-01-05T00:00:00Z" })];
    expect(inviteDaysRemaining(over, now)).toBe(0);
    expect(inviteDaysRemaining([], now)).toBe(INVITE_ANNUAL_DAY_CAP);
  });

  it("does not count desk rewards against the invite cap or last year's invites", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    const rows = [
      entry({ kind: "referred", source: "desk_referral", days: 3, createdAt: "2026-10-01T00:00:00Z" }),
      entry({ id: "r2", kind: "invite_activated", source: "invite", days: 7, createdAt: "2025-11-01T00:00:00Z" }),
    ];
    expect(earnedDaysThisYear(rows, now)).toBe(0);
  });
});

describe("referral reward copy", () => {
  it("labels every kind and status", () => {
    expect(rewardLabel("referred")).toMatch(/referred/i);
    expect(rewardLabel("interview")).toMatch(/interview/i);
    expect(rewardStatusLabel("pending")).toBe("On the way");
    expect(rewardStatusLabel("granted")).toBe("Added");
  });

  it("singularises one day so a row never says '1 Pro days'", () => {
    expect(rewardDaysLabel(1)).toBe("1 Pro day");
    expect(rewardDaysLabel(3)).toBe("3 Pro days");
    expect(rewardDaysLabel(0)).toBe("0 Pro days");
    expect(rewardDaysLabel(Number.NaN)).toBe("0 Pro days");
    expect(rewardDaysLabel(-5)).toBe("0 Pro days");
  });

  it("names the candidate and clips a long one rather than blowing out the card", () => {
    expect(rewardSummary({ kind: "referred", subject: "Alex Kim" })).toMatch(/Alex Kim/);
    const long = "x".repeat(200);
    expect(rewardSummary({ kind: "referred", subject: long }).length).toBeLessThanOrEqual(100);
    expect(rewardSummary({ kind: "invite_signup", subject: null })).toMatch(/signed up/i);
  });

  it("offers the candidate four real outcomes", () => {
    expect(REFERRAL_OUTCOME_LABELS.interview).toBe("I got an interview");
    expect(isReferralOutcome("interview")).toBe(true);
    expect(isReferralOutcome("placed")).toBe(true);
    expect(isReferralOutcome("hired")).toBe(false);
  });
});

describe("parseRewardEntry", () => {
  it("accepts a well-formed row", () => {
    expect(parseRewardEntry({
      id: "a1",
      kind: "interview",
      source: "desk_referral",
      days: 10,
      status: "granted",
      subject: "Alex Kim",
      createdAt: "2026-10-02T00:00:00Z",
      grantedAt: "2026-10-02T00:05:00Z",
    })).toEqual({
      id: "a1",
      kind: "interview",
      source: "desk_referral",
      days: 10,
      status: "granted",
      subject: "Alex Kim",
      createdAt: "2026-10-02T00:00:00Z",
      grantedAt: "2026-10-02T00:05:00Z",
    });
  });

  it("coerces a string day count the way a JSON API might send it", () => {
    const row = parseRewardEntry({ kind: "referred", days: "3", createdAt: "2026-10-02T00:00:00Z" });
    expect(row?.days).toBe(3);
  });

  it("defaults an unknown status to pending rather than dropping the row", () => {
    const row = parseRewardEntry({ kind: "referred", days: 3, status: "wat", createdAt: "2026-10-02T00:00:00Z" });
    expect(row?.status).toBe("pending");
  });

  it("drops rows it cannot render instead of showing 'undefined Pro days'", () => {
    expect(parseRewardEntry(null)).toBeNull();
    expect(parseRewardEntry({ kind: "mystery", days: 3, createdAt: "2026-10-02T00:00:00Z" })).toBeNull();
    expect(parseRewardEntry({ kind: "referred", days: 0, createdAt: "2026-10-02T00:00:00Z" })).toBeNull();
    expect(parseRewardEntry({ kind: "referred", days: 3 })).toBeNull();
    expect(parseRewardEntry({ kind: "referred", days: 3, createdAt: "not-a-date" })).toBeNull();
  });

  it("guards the vocabularies it exposes", () => {
    expect(isRewardKind("referred")).toBe(true);
    expect(isRewardKind("nope")).toBe(false);
    expect(isRewardStatus("revoked")).toBe(true);
    expect(isRewardStatus("pending")).toBe(true);
    expect(isRewardStatus("granted")).toBe(true);
  });
});

describe("referralOutcomeError", () => {
  it("maps the RPC's own messages to something a candidate can act on", () => {
    expect(referralOutcomeError({ message: "not your request" })).toMatch(/not yours/i);
    expect(referralOutcomeError({ message: "you can only report an outcome once you are referred" })).toMatch(/marked referred/i);
    expect(referralOutcomeError({ message: "you already reported an outcome" })).toMatch(/already reported/i);
    expect(referralOutcomeError(null)).toMatch(/try again/i);
  });
});

describe("invite codes", () => {
  it("is deterministic, so a repeat call does not break shared links", () => {
    const a = makeInviteCode("user-123");
    expect(makeInviteCode("user-123")).toBe(a);
    expect(makeInviteCode("user-124")).not.toBe(a);
    expect(a).toHaveLength(8);
  });

  it("drops the characters people misread when a code is said out loud", () => {
    const code = makeInviteCode("user-123");
    expect(code).not.toMatch(/[il o01]/);
    expect(code).toMatch(/^[a-z0-9]{8}$/);
  });

  it("sanitizes a pasted or typed code down to the alphabet", () => {
    expect(sanitizeInviteCode(" ABC-DEF_9 ")).toBe("abcdef9");
    expect(sanitizeInviteCode("a".repeat(40))).toHaveLength(24);
  });

  it("builds an invite path that survives the static export", () => {
    expect(invitePath("abcd1234")).toBe("/invite/abcd1234");
    // Formatting a code for reading does not change which code it is.
    expect(invitePath("abcd-1234")).toBe("/invite/abcd1234");
    expect(invitePath("ABCD 1234")).toBe("/invite/abcd1234");
  });
});