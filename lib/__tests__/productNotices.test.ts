import { describe, expect, it } from "vitest";
import type { CompanyReferralRequest } from "@/lib/companyReferrers";
import {
  notificationFeed,
  outcomeToastCopy,
  pendingProductNotice,
  PRODUCT_NOTICES,
  referralAlertCopy,
  referralToastForUnread,
  unreadReferralRequests,
  unseenReferralOutcomes,
} from "@/lib/productNotices";

function request(partial: Partial<CompanyReferralRequest> & Pick<CompanyReferralRequest, "id" | "createdAt">): CompanyReferralRequest {
  return {
    referrerId: "r1",
    candidateName: "Alex Kim",
    candidateEmail: "alex@example.com",
    candidateLinkedin: null,
    resumePdfPath: null,
    role: "Backend Engineer",
    notes: null,
    source: "request",
    status: "requested",
    ...partial,
  };
}

describe("product notices", () => {
  it("counts a feature plus each unread ask and outcome on the red badge", () => {
    const feed = notificationFeed({
      notice: PRODUCT_NOTICES[0],
      inboxUnread: 2,
      outcomeUnread: 1,
    });
    expect(feed.count).toBe(4);
    expect(feed.items.map((item) => item.title)).toEqual([
      "Refer candidates at your company",
      "2 new referral requests",
      "Referral update",
    ]);
    expect(notificationFeed({ notice: null, inboxUnread: 0, outcomeUnread: 0 })).toEqual({
      count: 0,
      items: [],
    });
    expect(notificationFeed({ notice: null, inboxUnread: Number.NaN, outcomeUnread: -3 }).count).toBe(0);
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

  it("tells the candidate when a request is marked referred or declined", () => {
    const rows = [
      { id: "a", status: "referred", role: "Backend Engineer", referrerName: "Jordan Lee", referrerCompany: "Acme", updatedAt: "2026-10-12T12:00:00Z", createdAt: "2026-10-01T00:00:00Z" },
      { id: "b", status: "requested", role: "SWE", referrerName: "Jordan Lee", referrerCompany: "Acme", updatedAt: "2026-10-12T12:00:00Z", createdAt: "2026-10-11T00:00:00Z" },
      { id: "c", status: "declined", role: "SWE", referrerName: "Sam", referrerCompany: "Beta", updatedAt: "2026-10-02T00:00:00Z", createdAt: "2026-10-01T00:00:00Z" },
    ];
    expect(unseenReferralOutcomes(rows, "2026-10-10T00:00:00Z").map((row) => row.id)).toEqual(["a"]);
    expect(outcomeToastCopy(unseenReferralOutcomes(rows, "2026-10-10T00:00:00Z"))).toEqual({
      title: "Referral update",
      description: "Jordan Lee marked you as referred for Backend Engineer at Acme.",
    });
    expect(outcomeToastCopy([rows[2]]).description).toBe(
      "Sam declined your referral request for SWE at Beta.",
    );
  });
});
