import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyReferralRequest } from "@/lib/companyReferrers";
import {
  notificationFeed,
  outcomeToastCopy,
  REFERRAL_ITEM_PREFIX,
  pendingProductNotice,
  PRODUCT_NOTICES,
  referralAlertCopy,
  markRewardIdsSeen,
  onRewardsSeen,
  referralToastForUnread,
  rewardFeed,
  rewardNotificationId,
  rememberToastedRewardIds,
  TOASTED_REWARD_KEY,
  unreadReferralRequests,
  unseenReferralOutcomes,
} from "@/lib/productNotices";

function request(partial: Partial<CompanyReferralRequest> & Pick<CompanyReferralRequest, "id" | "createdAt">): CompanyReferralRequest {
  return {
    referrerId: "r1",
    candidateName: "Alex Kim",
    candidateEmail: "alex@example.com",
    candidateUserId: null,
    candidateLinkedin: null,
    resumePdfPath: null,
    candidatePhone: null,
    candidateYearsExperience: null,
    candidateHeadline: null,
    candidateOutcome: null,
    candidateOutcomeAt: null,
    role: "Backend Engineer",
    notes: null,
    source: "request",
    status: "requested",
    ...partial,
  };
}

function outcome(partial: { id: string; status: string } & Partial<{
  role: string; referrerName: string; referrerCompany: string; updatedAt: string; createdAt: string;
}>) {
  return {
    role: "Backend Engineer",
    referrerName: "Priya Raman",
    referrerCompany: "Acme",
    createdAt: "2026-10-12T15:00:00Z",
    updatedAt: "2026-10-12T15:00:00Z",
    ...partial,
  };
}

describe("product notices", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds rewards to the bell alongside asks and outcomes", () => {
    const feed = notificationFeed({
      notice: null,
      inboxRows: [request({ id: "a", createdAt: "2026-10-12T15:00:00Z" })],
      rewardUnread: 2,
      rewardDays: 13,
    });
    expect(feed.count).toBe(3);
    // The reward row rides the shared referral prefix, which is what keeps the
    // bell from writing it into dismissed_notices.
    expect(feed.items.map((i) => i.id)).toEqual([`${REFERRAL_ITEM_PREFIX}inbox:a`, `${REFERRAL_ITEM_PREFIX}rewards`]);
    expect(feed.items[1].body).toMatch(/13 Pro days/i);
  });

  it("says rewards were earned even when the day total is zero", () => {
    // A revoked or malformed row must not produce an empty sentence.
    const feed = notificationFeed({ notice: null, rewardUnread: 1, rewardDays: 0 });
    expect(feed.items[0].body).toMatch(/earned/i);
  });

  it("keeps pending rewards visible in the count", () => {
    // Hiding pending would make a reward look like it was never earned.
    expect(rewardFeed([{ kind: "referred", status: "pending", days: 3 }])).toEqual({
      count: 1, days: 3, unseen: true,
    });
  });

  it("ignores revoked rewards in both count and days", () => {
    expect(rewardFeed([{ kind: "referred", status: "revoked", days: 3 }])).toEqual({
      count: 0, days: 0, unseen: false,
    });
  });

  it("drops a reward from the badge once the card has shown it", () => {
    // The rewards card is where a referrer reads what they earned. Before
    // this, the badge counted every live ledger row forever, so it survived
    // every visit to the one surface that displays them.
    const entries = [
      { id: "a1", kind: "referred", status: "granted", days: 3 },
      { id: "a2", kind: "interview", status: "pending", days: 10 },
    ];
    expect(rewardFeed(entries).count).toBe(2);
    expect(rewardFeed(entries, [rewardNotificationId(entries[0])]).count).toBe(1);
    expect(rewardFeed(entries, entries.map(rewardNotificationId)).count).toBe(0);
    // Days still describe the whole ledger, not just the unseen rows.
    expect(rewardFeed(entries, entries.map(rewardNotificationId)).days).toBe(13);
  });

  it("tells the shell when the rewards card has been read", () => {
    const listener = vi.fn();
    const stop = onRewardsSeen(listener);
    markRewardIdsSeen([
      rewardNotificationId({ id: "a1", kind: "referred", status: "granted" }),
    ]);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it("keys a reward on kind AND status, so settling it is a second notification", () => {
    const row = { id: "a1", kind: "interview", status: "pending" };
    const settled = { id: "a1", kind: "interview", status: "granted" };
    expect(rewardNotificationId(row)).not.toBe(rewardNotificationId(settled));
    // Same state twice is the same notification.
    expect(rewardNotificationId(row)).toBe(rewardNotificationId({ ...row }));
  });

  it("keeps the reward seen-list bounded so localStorage does not grow forever", () => {
    const many = Array.from({ length: 250 }, (_, i) => `r${i}`);
    rememberToastedRewardIds(many);
    const stored = JSON.parse(localStorage.getItem(TOASTED_REWARD_KEY)!);
    expect(stored.length).toBeLessThanOrEqual(200);
  });

  it("names the step each referral reached, one bell row per referral", () => {
    const feed = notificationFeed({
      notice: PRODUCT_NOTICES[0],
      inboxRows: [request({ id: "a", createdAt: "2026-10-12T15:00:00Z", candidateName: "Dara Okafor", role: "Backend Engineer" })],
      inboxCompany: "Eccalon",
      inboxLastSeenAt: null,
      outcomeRows: [
        outcome({ id: "o1", status: "referred", referrerCompany: "Globex" }),
        outcome({ id: "o2", status: "declined", referrerCompany: "Initech" }),
      ],
    });
    expect(feed.count).toBe(4);
    // ⚠️ The point of this test: referred and declined must NOT read alike.
    expect(feed.items.map((item) => item.title)).toEqual([
      "Refer candidates at your company",
      "New referral request",
      "You were referred",
      "Referral declined",
    ]);
    expect(feed.items[1].body).toBe("Dara Okafor asked you for a referral for Backend Engineer at Eccalon.");
    expect(feed.items[2].body).toContain("marked you as referred");
    expect(feed.items[3].body).toContain("declined your referral request");
    // No bell row may claim an outcome the row did not reach.
    expect(feed.items.some((item) => item.body.includes("reviewing, referred, or declined"))).toBe(false);
  });

  it("gives every referral row an id under the transient prefix", () => {
    // ⚠️ NotificationBell keys "persist a dismissal" off this prefix. Without it
    // each referral is written into dismissed_notices permanently.
    const feed = notificationFeed({
      notice: null,
      inboxRows: [request({ id: "a", createdAt: "2026-10-12T15:00:00Z" })],
      outcomeRows: [outcome({ id: "o1", status: "reviewing" })],
    });
    expect(feed.items.every((item) => item.id.startsWith(REFERRAL_ITEM_PREFIX))).toBe(true);
    expect(new Set(feed.items.map((item) => item.id)).size).toBe(2);
  });

  it("is empty with nothing to say, and never counts rows it was not given", () => {
    expect(notificationFeed({ notice: null })).toEqual({ count: 0, items: [] });
  });

  it("shows the referrals launch until that id is dismissed", () => {
    expect(pendingProductNotice([])?.id).toBe("company-referrals-2026-10");
    expect(pendingProductNotice(["company-referrals-2026-10"])).toBeNull();
  });

  it("counts only requested asks newer than the last inbox open", () => {
    const rows = [
      request({ id: "new", createdAt: "2026-10-12T15:00:00Z" }),
      request({ id: "old", createdAt: "2026-10-01T15:00:00Z" }),
      request({ id: "reviewing", status: "reviewing", createdAt: "2026-10-12T16:00:00Z" }),
      request({ id: "logged", source: "submitted", status: "referred", createdAt: "2026-10-12T16:00:00Z" }),
    ];
    expect(unreadReferralRequests(rows, "2026-10-10T00:00:00Z").map((row) => row.id)).toEqual(["new"]);
    expect(unreadReferralRequests(rows, null).map((row) => row.id)).toEqual(["new", "old"]);
    expect(unreadReferralRequests(null, null)).toEqual([]);
    const nudged = request({
      id: "nudged",
      status: "reviewing",
      createdAt: "2026-10-01T15:00:00Z",
      lastNudgedAt: "2026-10-12T18:00:00Z",
    });
    expect(unreadReferralRequests([nudged], "2026-10-10T00:00:00Z").map((row) => row.id)).toEqual(["nudged"]);
  });

  it("writes a single-ask and a grouped toast", () => {
    const one = request({ id: "1", createdAt: "2026-10-12T15:00:00Z", candidateName: "Alex Kim" });
    const two = request({ id: "2", createdAt: "2026-10-12T14:00:00Z", candidateName: "Sam Lee" });
    expect(referralAlertCopy([one], "Acme")).toEqual({
      title: "New referral request",
      description: "Alex Kim asked you for a referral at Acme.",
    });
    expect(referralAlertCopy([one, two], "Acme").description).toBe(
      "Alex Kim and 1 other asked you for a referral at Acme.",
    );
    expect(referralAlertCopy([one, two, request({ id: "3", createdAt: "2026-10-11T00:00:00Z" })], "").description).toBe(
      "Alex Kim and 2 others asked you for a referral.",
    );
  });

  it("toasts each unread ask once, and marks the inbox seen instead when it is open", () => {
    const rows = [request({ id: "q1", createdAt: "2026-10-12T15:00:00Z" })];
    expect(referralToastForUnread(rows, [], "Acme", false)).toMatchObject({
      newlyToasted: ["q1"],
      markSeen: false,
      toast: { title: "New referral request" },
    });
    expect(referralToastForUnread(rows, ["q1"], "Acme", false).toast).toBeNull();
    expect(referralToastForUnread(rows, [], "Acme", true)).toEqual({
      toast: null,
      newlyToasted: [],
      markSeen: true,
    });
    const nudged = request({
      id: "q2",
      createdAt: "2026-10-01T15:00:00Z",
      status: "reviewing",
      lastNudgedAt: "2026-10-12T18:00:00Z",
      candidateName: "Alex Kim",
      role: "Backend Engineer",
    });
    expect(referralToastForUnread([nudged], [], "Acme", false, "2026-10-10T00:00:00Z").toast).toEqual({
      title: "Referral nudge",
      description: "Alex Kim nudged you about Backend Engineer.",
    });
  });

  it("tells the candidate when a request is reviewing, referred, or declined", () => {
    const rows = [
      { id: "a", status: "referred", role: "Backend Engineer", referrerName: "Jordan Lee", referrerCompany: "Acme", updatedAt: "2026-10-12T12:00:00Z", createdAt: "2026-10-01T00:00:00Z" },
      { id: "b", status: "requested", role: "SWE", referrerName: "Jordan Lee", referrerCompany: "Acme", updatedAt: "2026-10-12T12:00:00Z", createdAt: "2026-10-11T00:00:00Z" },
      { id: "c", status: "declined", role: "SWE", referrerName: "Sam", referrerCompany: "Beta", updatedAt: "2026-10-02T00:00:00Z", createdAt: "2026-10-01T00:00:00Z" },
      { id: "d", status: "reviewing", role: "SWE", referrerName: "Jordan Lee", referrerCompany: "Acme", updatedAt: "2026-10-12T13:00:00Z", createdAt: "2026-10-11T00:00:00Z" },
    ];
    expect(unseenReferralOutcomes(rows, "2026-10-10T00:00:00Z").map((row) => row.id)).toEqual(["a", "d"]);
    expect(outcomeToastCopy(unseenReferralOutcomes(rows, "2026-10-10T00:00:00Z").filter((row) => row.id === "a"))).toEqual({
      title: "You were referred",
      description: "Jordan Lee marked you as referred for Backend Engineer at Acme.",
    });
    expect(outcomeToastCopy([rows[2]]).description).toBe(
      "Sam declined your referral request for SWE at Beta.",
    );
    expect(outcomeToastCopy([rows[3]])).toEqual({
      title: "Now being reviewed",
      description: "Jordan Lee is reviewing your referral request for SWE at Acme.",
    });
    // ⚠️ The multi-row case used to read "N of your referral requests were
    // updated" — one sentence for three referrals and for three declines.
    expect(outcomeToastCopy([rows[0], rows[2], rows[3]]).description).toBe(
      "Referred at Acme. Declined at Beta. Reviewing at Acme.",
    );
  });
});
