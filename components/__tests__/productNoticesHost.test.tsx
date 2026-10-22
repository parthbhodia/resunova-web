import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockLoad, mockDismiss, mockFetchProfile, mockFetchRequests, mockPush } = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockDismiss: vi.fn(),
  mockFetchProfile: vi.fn(),
  mockFetchRequests: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => {
      const api = {
        on: () => api,
        subscribe: () => api,
      };
      return api;
    },
    removeChannel: vi.fn(),
  }),
}));

vi.mock("@/lib/companyReferrers", () => ({
  fetchMyReferrerProfile: mockFetchProfile,
  fetchMyReferralRequests: mockFetchRequests,
  fetchMySentReferralRequests: () => Promise.resolve([]),
}));

vi.mock("@/lib/productNotices", async (orig) => {
  const actual = await orig<typeof import("@/lib/productNotices")>();
  return {
    ...actual,
    loadNoticeState: mockLoad,
    persistDismissedNotice: mockDismiss,
    persistLastSeenReferral: vi.fn(),
    readLastSeenReferralAt: () => null,
    readToastedReferralIds: () => [],
    rememberToastedReferralIds: vi.fn(),
  };
});

import { ProductNoticesHost } from "@/components/ProductNoticesHost";

const referrer = {
  id: "r1",
  userId: "u1",
  displayName: "Parth Bhodia",
  company: "Acme",
  companySlug: "acme",
  title: "Software Engineer",
  linkedin: null,
  slug: "parth-at-acme",
  bio: null,
  companyLocation: "San Francisco, CA",
  companyWebsite: "https://example.com",
  openToRefer: true,
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  mockLoad.mockReset();
  mockDismiss.mockReset();
  mockFetchProfile.mockReset();
  mockFetchRequests.mockReset();
  mockPush.mockReset();
  mockLoad.mockResolvedValue({ dismissedIds: [], lastSeenReferralAt: null });
  mockFetchProfile.mockResolvedValue(referrer);
  mockFetchRequests.mockResolvedValue([
    {
      id: "q1",
      referrerId: "r1",
      candidateName: "Alex Kim",
      candidateEmail: "alex@example.com",
      candidateUserId: null,
      candidateLinkedin: null,
      resumePdfPath: null,
      candidatePhone: null,
      candidateYearsExperience: null,
      candidateHeadline: null,
      role: "Backend Engineer",
      notes: null,
      source: "request",
      status: "requested",
      createdAt: "2026-10-12T15:00:00Z",
    },
  ]);
});

describe("ProductNoticesHost", () => {
  it("shows the feature card and a referral toast", async () => {
    render(<ProductNoticesHost />);
    expect(await screen.findByText("Refer candidates at your company")).toBeInTheDocument();
    expect(await screen.findByText("Alex Kim asked you for a referral at Acme.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open inbox" }));
    expect(mockPush).toHaveBeenCalledWith("/profile?tab=referrals");
  });

  it("dismisses the feature card once", async () => {
    render(<ProductNoticesHost />);
    await screen.findByText("Refer candidates at your company");
    const dismissButtons = screen.getAllByRole("button", { name: "Dismiss" });
    await userEvent.click(dismissButtons[dismissButtons.length - 1]);
    expect(mockDismiss).toHaveBeenCalledWith("company-referrals-2026-10");
    expect(screen.queryByText("Refer candidates at your company")).not.toBeInTheDocument();
  });

  it("skips the feature card after it has been dismissed", async () => {
    mockLoad.mockResolvedValue({
      dismissedIds: ["company-referrals-2026-10"],
      lastSeenReferralAt: null,
    });
    mockFetchRequests.mockResolvedValue([]);
    render(<ProductNoticesHost />);
    await vi.waitFor(() => expect(mockFetchRequests).toHaveBeenCalled());
    expect(screen.queryByText("Refer candidates at your company")).not.toBeInTheDocument();
  });
});
